// ── Game initialization ──

import type { GameState, AssetState } from './types';
import { buildAssetCatalog } from './assets';
import { MACRO, INITIAL_CASH, INITIAL_REGIME, DIVIDENDS } from './params';
import { createRNG } from './rng';

export function createGameState(seed: number): GameState {
  const catalog = buildAssetCatalog(seed);
  const rng = createRNG(seed);
  // Advance rng past catalog init
  for (let i = 0; i < 100; i++) rng.next();

  const assets: Record<string, AssetState> = {};
  for (const [id, def] of Object.entries(catalog)) {
    assets[id] = {
      price: def.initialPrice,
      lastReturn: 0,
      haltedUntilDay: null,
    };
  }

  return {
    dayIndex: 0,
    cash: INITIAL_CASH,
    portfolio: {},
    assets,
    assetCatalog: catalog,
    macro: {
      baseRateAnnual: MACRO.baseRate.initial,
      inflationAnnual: MACRO.inflation.initial,
    },
    regime: INITIAL_REGIME,
    calendar: {
      nextFiiPayDay: DIVIDENDS.fiiPeriodDays,
      nextStockPayDay: DIVIDENDS.stockPeriodDays,
    },
    credit: { watch: {} },
    history: { equity: [INITIAL_CASH], drawdown: [0], cdiAccumulated: [INITIAL_CASH] },
    seed,
    rngState: rng.state(),
  };
}
