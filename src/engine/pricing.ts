// ── Price generation with correlated market factors + macro tilt ──

import type { GameState } from './types';
import type { RNG } from './rng';
import { DRIFT_VOL, CORR_STRENGTH, CRISIS_CRYPTO_CROSS_LINK, MACRO_TILT, MACRO, IPO } from './params';
import { computeSectorReturn } from './correlation';

export function generateReturns(state: GameState, rng: RNG): Record<string, number> {
  const regime = state.regime;
  const corrStrength = CORR_STRENGTH[regime];

  // Generate group factors
  const equityFactor = rng.nextGaussian();
  const cryptoFactor = rng.nextGaussian();

  // New Macro Delta format for betas
  // For simplicity since we don't have the T-1 macro state here cleanly without passing it,
  // we proxy the "delta" as the drift + current level deviation. We can just use the current levels 
  // scaled reasonably for the formulas, or rely on macro.riskIndex directly.
  const macroDelta = {
    selic: (state.macro.baseRateAnnual - 0.10), // relative to 10%
    fx: (state.macro.fxUSDBRL - 5.0) / 5.0, // relative to 5.0
    riskOn: 1.0 - state.macro.riskIndex,
    commodity: state.macro.activityAnnual * 2.0 // proxy
  };

  const returns: Record<string, number> = {};

  for (const [assetId, def] of Object.entries(state.assetCatalog)) {
    const isBankrupt = state.assets[assetId]?.isBankrupt;
    if (isBankrupt) {
      returns[assetId] = 0;
      continue;
    }

    const dv = DRIFT_VOL[def.class]?.[regime];
    if (!dv) {
      returns[assetId] = 0;
      continue;
    }

    const { drift, vol } = dv;

    if (def.corrGroup === 'FIXED_INCOME') {
      // Fixed income: mostly idiosyncratic, very low correlation
      const noise = rng.nextGaussian();
      let ret = drift + vol * noise;

      // Long bonds (PRE/IPCA) are sensitive to rate changes and risk
      if (def.class === 'RF_PRE' || def.class === 'RF_IPCA') {
        ret -= MACRO_TILT.bondsLongRiskSensitivity * state.macro.riskIndex;
      }

      returns[assetId] = ret;
    } else if (def.corrGroup === 'FX') {
      // FX: price tracks USD/BRL exchange rate
      const fxDrift = MACRO.fxUSDBRL.regimeDrift[regime];
      const fxNoise = rng.nextGaussian() * MACRO.fxUSDBRL.dailyVol * 0.5;
      returns[assetId] = fxDrift + fxNoise;
    } else if (def.corrGroup === 'EQUITY') {
      const sectorBubble = state.market?.sectors?.[def.sector];

      const shocks = {
        marketShock: equityFactor * vol,
        sectorShock: rng.nextGaussian() * vol,
        idioShock: rng.nextGaussian() * vol
      };

      const secReturn = computeSectorReturn(def.sector, macroDelta, shocks, sectorBubble);
      returns[assetId] = drift + secReturn;
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
    asset.lastReturn = ret;
    asset.price = Math.max(0.01, asset.price * (1 + ret)); // never go to 0
  }
}
