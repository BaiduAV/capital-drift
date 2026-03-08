import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { GameState, DayResult, PeriodResult, TradeQuote, MacroState } from '@/engine/types';
import { createGameState } from '@/engine/init';
import { simulateDay } from '@/engine/simulateDay';
import { simulatePeriod } from '@/engine/simulatePeriod';
import { quoteBuy, quoteSell, executeBuy, executeSell } from '@/engine/trading';
import { computeEquity } from '@/engine/invariants';
import { saveGame, loadGame, deleteSave, saveLocale, loadLocale } from '@/engine/persistence';
import { setLocale, getLocale, t } from '@/engine/i18n';

interface GameContextType {
  state: GameState;
  dayResults: DayResult[];
  locale: 'pt-BR' | 'en';
  equity: number;
  prevMacro: MacroState | null;

  advanceDay: () => DayResult;
  fastForward: (days: number) => PeriodResult;
  getBuyQuote: (assetId: string, qty: number) => TradeQuote;
  getSellQuote: (assetId: string, qty: number) => TradeQuote;
  buy: (assetId: string, qty: number) => { success: boolean; quote: TradeQuote };
  sell: (assetId: string, qty: number) => { success: boolean; quote: TradeQuote };
  batchTrades: (fn: (ops: { buy: (id: string, qty: number) => boolean; sell: (id: string, qty: number) => boolean; getState: () => GameState }) => void) => void;
  newGame: (seed?: number) => void;
  switchLocale: () => void;
  t: typeof t;
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<'pt-BR' | 'en'>(() => {
    const l = loadLocale();
    setLocale(l);
    return l;
  });

  const [state, setState] = useState<GameState>(() => {
    const saved = loadGame();
    return saved ?? createGameState(Date.now());
  });

  const [dayResults, setDayResults] = useState<DayResult[]>([]);
  const [prevMacro, setPrevMacro] = useState<MacroState | null>(null);

  // Auto-save on state change
  useEffect(() => {
    saveGame(state);
  }, [state]);

  const equity = computeEquity(state);

  const advanceDay = useCallback(() => {
    const stateCopy = structuredClone(state);
    // Save macro before simulation for trend arrows
    setPrevMacro({ ...stateCopy.macro });
    const result = simulateDay(stateCopy);
    // simulateDay returns new state in result.state (does NOT mutate input)
    setState(result.state as GameState);
    setDayResults(prev => [...prev.slice(-99), result]);
    return result;
  }, [state]);

  const fastForward = useCallback((days: number) => {
    const stateCopy = structuredClone(state);
    setPrevMacro({ ...stateCopy.macro });
    // Run day-by-day so we can collect DayResults for the NewsFeed
    const collectedResults: DayResult[] = [];
    let current = stateCopy;
    for (let i = 0; i < days; i++) {
      const result = simulateDay(current);
      collectedResults.push(result);
      current = result.state as GameState;
    }
    setState(current);
    setDayResults(prev => [...prev, ...collectedResults].slice(-100));
    // Build PeriodResult from collected results
    const startEquity = computeEquity(stateCopy);
    const endEquity = computeEquity(current);
    const allEvents = collectedResults.flatMap(r => r.events);
    let minEq = startEquity, maxEq = startEquity;
    for (const r of collectedResults) {
      if (r.metrics.equityAfter < minEq) minEq = r.metrics.equityAfter;
      if (r.metrics.equityAfter > maxEq) maxEq = r.metrics.equityAfter;
    }
    const assetStartPrices: Record<string, number> = {};
    for (const [id, a] of Object.entries(stateCopy.assets)) assetStartPrices[id] = a.price;
    const movers = Object.entries(current.assets).map(([id, a]) => ({
      asset: id,
      return: (a.price - (assetStartPrices[id] ?? a.price)) / (assetStartPrices[id] || 1),
    })).sort((a, b) => Math.abs(b.return) - Math.abs(a.return)).slice(0, 6);
    const rankedEvents = [...allEvents].sort((a, b) => b.magnitude - a.magnitude).slice(0, 6);
    const missedOpportunities: string[] = [];
    const maxDrawdown = maxEq > 0 ? (maxEq - minEq) / maxEq : 0;
    if (maxDrawdown > 0.10) missedOpportunities.push('missed.drawdown');
    const result: PeriodResult = {
      startDay: stateCopy.dayIndex,
      endDay: current.dayIndex,
      totalReturn: (endEquity - startEquity) / startEquity,
      maxDrawdown,
      events: rankedEvents,
      topMovers: movers,
      missedOpportunities,
    };
    return result;
  }, [state]);

  const getBuyQuote = useCallback((assetId: string, qty: number) => {
    return quoteBuy(state, assetId, qty);
  }, [state]);

  const getSellQuote = useCallback((assetId: string, qty: number) => {
    return quoteSell(state, assetId, qty);
  }, [state]);

  const buy = useCallback((assetId: string, qty: number) => {
    const stateCopy = structuredClone(state);
    const quote = quoteBuy(stateCopy, assetId, qty);
    const success = executeBuy(stateCopy, quote);
    if (success) setState(stateCopy);
    return { success, quote };
  }, [state]);

  const sell = useCallback((assetId: string, qty: number) => {
    const stateCopy = structuredClone(state);
    const quote = quoteSell(stateCopy, assetId, qty);
    const success = executeSell(stateCopy, quote);
    if (success) setState(stateCopy);
    return { success, quote };
  }, [state]);

  const batchTrades = useCallback((fn: (ops: { buy: (id: string, qty: number) => boolean; sell: (id: string, qty: number) => boolean; getState: () => GameState }) => void) => {
    const stateCopy = structuredClone(state);
    fn({
      buy: (id, qty) => {
        const quote = quoteBuy(stateCopy, id, qty);
        return executeBuy(stateCopy, quote);
      },
      sell: (id, qty) => {
        const quote = quoteSell(stateCopy, id, qty);
        return executeSell(stateCopy, quote);
      },
      getState: () => stateCopy,
    });
    setState(stateCopy);
  }, [state]);

  const newGame = useCallback((seed?: number) => {
    deleteSave();
    const s = createGameState(seed ?? Date.now());
    setState(s);
    setDayResults([]);
    setPrevMacro(null);
  }, []);

  const switchLocale = useCallback(() => {
    const next = locale === 'pt-BR' ? 'en' : 'pt-BR';
    setLocale(next);
    setLocaleState(next);
    saveLocale(next);
  }, [locale]);

  return (
    <GameContext.Provider value={{ state, dayResults, locale, equity, prevMacro, advanceDay, fastForward, getBuyQuote, getSellQuote, buy, sell, batchTrades, newGame, switchLocale, t }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
