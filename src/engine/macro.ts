// ── Macro updates (base rate & inflation random walk) ──

import type { GameState } from './types';
import type { RNG } from './rng';
import { MACRO } from './params';

export function updateMacro(state: GameState, rng: RNG): void {
  const regime = state.regime;

  // Base rate
  const rateDrift = MACRO.baseRate.regimeDrift[regime];
  const rateShock = rng.nextGaussian() * MACRO.baseRate.dailyVol;
  state.macro.baseRateAnnual = Math.max(
    MACRO.baseRate.min,
    Math.min(MACRO.baseRate.max, state.macro.baseRateAnnual + rateDrift + rateShock)
  );

  // Inflation
  const inflDrift = MACRO.inflation.regimeDrift[regime];
  const inflShock = rng.nextGaussian() * MACRO.inflation.dailyVol;
  state.macro.inflationAnnual = Math.max(
    MACRO.inflation.min,
    Math.min(MACRO.inflation.max, state.macro.inflationAnnual + inflDrift + inflShock)
  );
}
