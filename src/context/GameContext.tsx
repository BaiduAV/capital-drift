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
    setState(stateCopy);
    setDayResults(prev => [...prev.slice(-99), result]);
    return result;
  }, [state]);

  const fastForward = useCallback((days: number) => {
    const stateCopy = structuredClone(state);
    setPrevMacro({ ...stateCopy.macro });
    const result = simulatePeriod(stateCopy, days);
    setState(stateCopy);
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
    <GameContext.Provider value={{ state, dayResults, locale, equity, prevMacro, advanceDay, fastForward, getBuyQuote, getSellQuote, buy, sell, newGame, switchLocale, t }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
