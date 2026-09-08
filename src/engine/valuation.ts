import type { GameState } from './types';

/** Bank fixed-rate offers have a denomination; each owned deposit has its own balance. */
export function positionMarketValue(state: GameState, id: string): number {
  const pos = state.portfolio[id];
  if (!pos) return 0;
  const price = state.assets[id]?.price ?? 0;
  const terms = state.assetCatalog[id]?.fixedIncome;
  if (terms?.kind === 'BANK' && terms.indexer === 'FIXED' && pos.fixedIncomeLots) {
    return pos.fixedIncomeLots.reduce((sum, lot) => sum + lot.quantity * (lot.bookUnitValue ?? price), 0);
  }
  return pos.quantity * price;
}

export function positionUnitValue(state: GameState, id: string): number {
  const quantity = state.portfolio[id]?.quantity ?? 0;
  return quantity > 0 ? positionMarketValue(state, id) / quantity : state.assets[id]?.price ?? 0;
}
