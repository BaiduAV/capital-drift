import { createContext, useContext } from 'react';
import type { GameState, DayResult, PeriodResult, TradeQuote, MacroState } from '@/engine/types';
import type { t } from '@/engine/i18n';

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
  batchTrades: (fn: (ops: { buy: (id: string, qty: number) => boolean; sell: (id: string, qty: number) => boolean; getState: () => GameState }) => void) => { executed: number; rejected: number };
  reserveIPO: (ticker: string, qty: number) => boolean;
  newGame: (seed?: number) => boolean;
  switchLocale: () => void;
  updateMarginCallSettings: (settings: { drawdownThreshold: number; recoveryTarget: number }) => void;
  t: typeof t;
}

export const GameContext = createContext<GameContextType | null>(null);

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
