import { useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { GameState, DayResult, PeriodResult, MacroState } from '@/engine/types';
import { createGameState } from '@/engine/init';
import { simulateDay } from '@/engine/simulateDay';
import { checkAchievements, ACHIEVEMENT_DEFS, type AchievementId } from '@/engine/achievements';

import { quoteBuy, quoteSell, executeBuy, executeSell } from '@/engine/trading';
import { computeEquity, computeMaxDrawdown } from '@/engine/invariants';
import { reserveIPO as reserveIPOOrder } from '@/engine/cash';
import { saveGame, loadGameResult, saveLocale, loadLocale } from '@/engine/persistence';
import { setLocale, t } from '@/engine/i18n';
import { toast } from 'sonner';
import { GameContext } from './game-context';

export function GameProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<'pt-BR' | 'en'>(() => {
    const l = loadLocale();
    setLocale(l);
    return l;
  });

  const [initial] = useState(loadGameResult);
  const [state, setState] = useState<GameState>(() => initial.state ?? createGameState(Date.now()));
  const stateRef = useRef(state);
  const [savingPaused, setSavingPaused] = useState(initial.status === 'blocked' || initial.status === 'recovered');
  const [saveFailed, setSaveFailed] = useState(false);
  // Publish each completed command synchronously; React may batch its renders.
  const commit = useCallback((next: GameState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const [dayResults, setDayResults] = useState<DayResult[]>([]);
  const [prevMacro, setPrevMacro] = useState<MacroState | null>(null);

  // Auto-save on state change
  useEffect(() => {
    if (!savingPaused) setSaveFailed(!saveGame(state).ok);
  }, [state, savingPaused]);

  useEffect(() => {
    if (initial.reservationsAdjusted) toast.warning(locale === 'pt-BR'
      ? 'Reservas antigas de IPO foram ajustadas ao caixa disponível.'
      : 'Legacy IPO reservations were adjusted to available cash.');
  }, [initial, locale]);

  const equity = computeEquity(state);

  const advanceDay = useCallback(() => {
    const stateCopy = structuredClone(stateRef.current);
    setPrevMacro({ ...stateCopy.macro });
    const result = simulateDay(stateCopy);
    const newState = result.state as GameState;
    const newAch = checkAchievements(newState, result, stateCopy);
    for (const id of newAch) {
      newState.achievements = { ...newState.achievements, [id]: { unlockedAtDay: newState.dayIndex } };
    }
    commit(newState);
    setDayResults(prev => [...prev.slice(-99), result]);
    for (const id of newAch) {
      const def = ACHIEVEMENT_DEFS.find(d => d.id === id);
      if (def) toast.success(`${def.icon} ${t(def.titleKey)}`, { description: t(def.descKey) });
    }
    return result;
  }, [commit]);

  const fastForward = useCallback((days: number) => {
    const stateCopy = structuredClone(stateRef.current);
    setPrevMacro({ ...stateCopy.macro });
    // Run day-by-day so we can collect DayResults for the NewsFeed
    const collectedResults: DayResult[] = [];
    let current = stateCopy;
    const allNewAch = new Set<AchievementId>();
    for (let i = 0; i < days; i++) {
      const prev = current;
      const result = simulateDay(current);
      current = result.state as GameState;
      const newAch = checkAchievements(current, result, prev);
      for (const id of newAch) {
        current.achievements = { ...current.achievements, [id]: { unlockedAtDay: current.dayIndex } };
        allNewAch.add(id);
      }
      collectedResults.push(result);
    }
    commit(current);
    for (const id of allNewAch) {
      const def = ACHIEVEMENT_DEFS.find(d => d.id === id);
      if (def) toast.success(`${def.icon} ${t(def.titleKey)}`, { description: t(def.descKey) });
    }
    setDayResults(prev => [...prev, ...collectedResults].slice(-100));
    // Build PeriodResult from collected results
    const startEquity = computeEquity(stateCopy);
    const endEquity = computeEquity(current);
    const allEvents = collectedResults.flatMap(r => r.events);
    const assetStartPrices: Record<string, number> = {};
    for (const [id, a] of Object.entries(stateCopy.assets)) assetStartPrices[id] = a.price;
    const movers = Object.entries(current.assets).map(([id, a]) => ({
      asset: id,
      return: (a.price - (assetStartPrices[id] ?? a.price)) / (assetStartPrices[id] || 1),
    })).sort((a, b) => Math.abs(b.return) - Math.abs(a.return)).slice(0, 6);
    const rankedEvents = [...allEvents].sort((a, b) => b.magnitude - a.magnitude).slice(0, 6);
    const missedOpportunities: string[] = [];
    const maxDrawdown = computeMaxDrawdown([startEquity, ...collectedResults.map(r => r.metrics.equityAfter)]);
    if (maxDrawdown > 0.10) missedOpportunities.push('missed.drawdown');
    const result: PeriodResult = {
      startDay: stateCopy.dayIndex,
      endDay: current.dayIndex,
      totalReturn: startEquity > 0 ? (endEquity - startEquity) / startEquity : 0,
      maxDrawdown,
      events: rankedEvents,
      topMovers: movers,
      missedOpportunities,
    };
    return result;
  }, [commit]);

  const getBuyQuote = useCallback((assetId: string, qty: number) => {
    return quoteBuy(state, assetId, qty);
  }, [state]);

  const getSellQuote = useCallback((assetId: string, qty: number) => {
    return quoteSell(state, assetId, qty);
  }, [state]);

  const unlockTradeAchievement = useCallback((s: GameState) => {
    if (!s.achievements?.['first_trade']) {
      s.achievements = { ...s.achievements, first_trade: { unlockedAtDay: s.dayIndex } };
      const def = ACHIEVEMENT_DEFS.find(d => d.id === 'first_trade');
      if (def) toast.success(`${def.icon} ${t(def.titleKey)}`, { description: t(def.descKey) });
    }
  }, []);

  const buy = useCallback((assetId: string, qty: number) => {
    const stateCopy = structuredClone(stateRef.current);
    const quote = quoteBuy(stateCopy, assetId, qty);
    const success = executeBuy(stateCopy, quote);
    if (success) { unlockTradeAchievement(stateCopy); commit(stateCopy); }
    return { success, quote };
  }, [commit, unlockTradeAchievement]);

  const sell = useCallback((assetId: string, qty: number) => {
    const stateCopy = structuredClone(stateRef.current);
    const quote = quoteSell(stateCopy, assetId, qty);
    const success = executeSell(stateCopy, quote);
    if (success) { unlockTradeAchievement(stateCopy); commit(stateCopy); }
    return { success, quote };
  }, [commit, unlockTradeAchievement]);

  const batchTrades = useCallback((fn: (ops: { buy: (id: string, qty: number) => boolean; sell: (id: string, qty: number) => boolean; getState: () => GameState }) => void) => {
    const stateCopy = structuredClone(stateRef.current);
    const result = { executed: 0, rejected: 0 };
    const trade = (side: 'buy' | 'sell', id: string, qty: number) => {
      const quote = side === 'buy' ? quoteBuy(stateCopy, id, qty) : quoteSell(stateCopy, id, qty);
      const success = side === 'buy' ? executeBuy(stateCopy, quote) : executeSell(stateCopy, quote);
      result[success ? 'executed' : 'rejected']++;
      return success;
    };
    fn({ buy: (id, qty) => trade('buy', id, qty), sell: (id, qty) => trade('sell', id, qty), getState: () => stateCopy });
    // Publish achievements and state only after the entire callback has completed.
    if (result.executed > 0) { unlockTradeAchievement(stateCopy); commit(stateCopy); }
    return result;
  }, [commit, unlockTradeAchievement]);

  const reserveIPO = useCallback((ticker: string, qty: number): boolean => {
    const stateCopy = structuredClone(stateRef.current);
    if (!reserveIPOOrder(stateCopy, ticker, qty)) return false;
    commit(stateCopy);
    return true;
  }, [commit]);

  const newGame = useCallback((seed?: number) => {
    const next = createGameState(seed ?? Date.now());
    if (!saveGame(next, true).ok) { setSaveFailed(true); return false; }
    commit(next);
    setSavingPaused(false);
    setSaveFailed(false);
    setDayResults([]);
    setPrevMacro(null);
    return true;
  }, [commit]);

  const retrySave = () => {
    const result = saveGame(stateRef.current, initial.status === 'recovered');
    setSaveFailed(!result.ok);
    if (result.ok) setSavingPaused(false);
  };

  const switchLocale = useCallback(() => {
    const next = locale === 'pt-BR' ? 'en' : 'pt-BR';
    setLocale(next);
    setLocaleState(next);
    saveLocale(next);
  }, [locale]);

  const updateMarginCallSettings = useCallback((settings: { drawdownThreshold: number; recoveryTarget: number }) => {
    if (![settings.drawdownThreshold, settings.recoveryTarget].every(v => Number.isFinite(v) && v >= 0 && v <= 1)) return;
    commit({ ...stateRef.current, marginCallSettings: settings });
  }, [commit]);

  return (
    <GameContext.Provider value={{ state, dayResults, locale, equity, prevMacro, advanceDay, fastForward, getBuyQuote, getSellQuote, buy, sell, batchTrades, reserveIPO, newGame, switchLocale, updateMarginCallSettings, t }}>
      {(savingPaused || saveFailed) && (
        <div role="alert" className="sticky top-0 z-50 border-b border-destructive bg-background p-3 text-sm">
          <p>{locale === 'pt-BR'
            ? (savingPaused ? 'O save original está preservado. O salvamento está pausado até você escolher como recuperar a partida.' : 'Não foi possível salvar. Seu progresso recente está apenas nesta aba; mantenha-a aberta e tente novamente.')
            : (savingPaused ? 'The original save is preserved. Saving is paused until you choose how to recover the game.' : 'Saving failed. Recent progress is only in this tab; keep it open and retry.')}</p>
          {(!savingPaused || initial.status === 'recovered') && <button className="underline mr-4" onClick={retrySave}>{locale === 'pt-BR' ? 'Salvar partida recuperada / tentar novamente' : 'Save recovered game / retry'}</button>}
          {savingPaused && <button className="underline" onClick={() => newGame()}>{locale === 'pt-BR' ? 'Arquivar save original e iniciar nova partida' : 'Archive original save and start a new game'}</button>}
        </div>
      )}
      {children}
    </GameContext.Provider>
  );
}
