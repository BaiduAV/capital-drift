// ── Invariant checks ──

import type { GameState } from './types';

export function checkInvariants(state: GameState): string[] {
  const errors: string[] = [];

  if (isNaN(state.cash)) errors.push('cash is NaN');
  if (state.cash < 0) errors.push(`cash is negative: ${state.cash}`);

  for (const [assetId, asset] of Object.entries(state.assets)) {
    if (asset.price < 0) errors.push(`${assetId} price is negative: ${asset.price}`);
    if (isNaN(asset.price)) errors.push(`${assetId} price is NaN`);
  }

  // Check equity consistency
  const equity = computeEquity(state);
  if (isNaN(equity)) errors.push('equity is NaN');

  return errors;
}

export function computeEquity(state: GameState): number {
  let total = state.cash;
  for (const [assetId, pos] of Object.entries(state.portfolio)) {
    const asset = state.assets[assetId];
    if (asset) {
      total += pos.quantity * asset.price;
    }
  }
  return total;
}
