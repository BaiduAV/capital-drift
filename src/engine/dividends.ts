// ── Dividends & distributions ──

import type { GameState } from './types';

export function applyDividendsAndDistributions(state: GameState): number {
  let totalPaid = 0;

  // FII monthly
  if (state.dayIndex >= state.calendar.nextFiiPayDay) {
    for (const [assetId, def] of Object.entries(state.assetCatalog)) {
      if (def.class !== 'FII' || !def.dividendYieldAnnual || !def.dividendPeriodDays) continue;
      const pos = state.portfolio[assetId];
      if (!pos || pos.quantity <= 0) continue;

      const periodYield = def.dividendYieldAnnual * (def.dividendPeriodDays / 365);
      const dividend = pos.quantity * state.assets[assetId].price * periodYield;
      state.cash += dividend;
      totalPaid += dividend;
    }
    state.calendar.nextFiiPayDay += 30;
  }

  // Stocks quarterly
  if (state.dayIndex >= state.calendar.nextStockPayDay) {
    for (const [assetId, def] of Object.entries(state.assetCatalog)) {
      if (def.class !== 'STOCK' || !def.dividendYieldAnnual || !def.dividendPeriodDays) continue;
      const pos = state.portfolio[assetId];
      if (!pos || pos.quantity <= 0) continue;

      const periodYield = def.dividendYieldAnnual * (def.dividendPeriodDays / 365);
      const dividend = pos.quantity * state.assets[assetId].price * periodYield;
      state.cash += dividend;
      totalPaid += dividend;
    }
    state.calendar.nextStockPayDay += 90;
  }

  return totalPaid;
}
