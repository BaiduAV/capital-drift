// ── Price generation with correlated market factors ──

import type { GameState } from './types';
import type { RNG } from './rng';
import { DRIFT_VOL, CORR_STRENGTH, CRISIS_CRYPTO_CROSS_LINK } from './params';

export function generateReturns(state: GameState, rng: RNG): Record<string, number> {
  const regime = state.regime;
  const corrStrength = CORR_STRENGTH[regime];

  // Generate group factors
  const equityFactor = rng.nextGaussian();
  const cryptoFactor = rng.nextGaussian();

  const returns: Record<string, number> = {};

  for (const [assetId, def] of Object.entries(state.assetCatalog)) {
    const dv = DRIFT_VOL[def.class]?.[regime];
    if (!dv) {
      returns[assetId] = 0;
      continue;
    }

    const { drift, vol } = dv;

    if (def.corrGroup === 'FIXED_INCOME') {
      // Fixed income: mostly idiosyncratic, very low correlation
      const noise = rng.nextGaussian();
      returns[assetId] = drift + vol * noise;
    } else if (def.corrGroup === 'EQUITY') {
      const idioNoise = rng.nextGaussian();
      returns[assetId] = drift + vol * (
        corrStrength * equityFactor + (1 - corrStrength) * idioNoise
      );
    } else if (def.corrGroup === 'CRYPTO') {
      const idioNoise = rng.nextGaussian();
      let factor = cryptoFactor;
      // In crisis, cross-link crypto with equity factor
      if (regime === 'CRISIS') {
        factor = cryptoFactor * (1 - CRISIS_CRYPTO_CROSS_LINK) + equityFactor * CRISIS_CRYPTO_CROSS_LINK;
      }
      returns[assetId] = drift + vol * (
        corrStrength * factor + (1 - corrStrength) * idioNoise
      );
    }
  }

  return returns;
}

export function applyReturnsToPrices(state: GameState, returns: Record<string, number>): void {
  for (const [assetId, ret] of Object.entries(returns)) {
    const asset = state.assets[assetId];
    if (!asset) continue;
    // Apply event shocks on top (already added to returns externally)
    asset.lastReturn = ret;
    asset.price = Math.max(0.01, asset.price * (1 + ret)); // never go to 0
  }
}
