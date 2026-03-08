// ── Dividends & distributions (per-asset schedule) ──

import type { GameState } from './types';

/**
 * Brazilian dividend calendar patterns:
 * - FIIs: monthly (~every 30 days), staggered across assets
 * - Stocks: quarterly (~every 90 days), staggered by sector
 *   Banks: typically months 2,5,8,11 offsets
 *   Energia/Utilities: months 3,6,9,12
 *   Varejo/Tech: months 1,4,7,10
 */

export function initDividendSchedules(state: GameState): void {
  // Sector-based quarterly offset (in days from day 0)
  const sectorOffsets: Record<string, number> = {
    BANCOS: 15,     // ~mid month 1
    ENERGIA: 45,    // ~mid month 2
    UTILITIES: 45,
    VAREJO: 75,     // ~mid month 3
    TECH: 75,
    AGRO: 30,
    MINERACAO: 60,
    SAUDE: 20,
    INDUSTRIA: 50,
    TELECOM: 40,
    LOGISTICA: 35,
  };

  let fiiOffset = 10; // stagger FIIs within the month

  for (const [id, def] of Object.entries(state.assetCatalog)) {
    const asset = state.assets[id];
    if (!asset) continue;

    if (def.class === 'FII' && def.dividendPeriodDays) {
      // FIIs: monthly, staggered by ~7 days each
      asset.nextDividendDay = fiiOffset;
      fiiOffset += 7;
    } else if (def.class === 'STOCK' && def.dividendPeriodDays && def.dividendYieldAnnual && def.dividendYieldAnnual > 0) {
      // Stocks: quarterly, offset by sector
      const offset = sectorOffsets[def.sector] ?? 30;
      asset.nextDividendDay = offset;
    }
  }
}

export function applyDividendsAndDistributions(state: GameState): number {
  let totalPaid = 0;

  for (const [assetId, def] of Object.entries(state.assetCatalog)) {
    if (!def.dividendYieldAnnual || !def.dividendPeriodDays) continue;

    const asset = state.assets[assetId];
    if (!asset || asset.nextDividendDay == null) continue;

    // Check if it's time to pay
    if (state.dayIndex < asset.nextDividendDay) continue;

    const pos = state.portfolio[assetId];
    if (pos && pos.quantity > 0) {
      const periodYield = def.dividendYieldAnnual * (def.dividendPeriodDays / 365);
      const dividend = pos.quantity * asset.price * periodYield;
      state.cash += dividend;
      totalPaid += dividend;
    }

    // Schedule next payment
    asset.nextDividendDay += def.dividendPeriodDays;
  }

  return totalPaid;
}
