// ── Macro updates (base rate, inflation, fx, activity, risk) ──

import type { GameState } from './types';
import type { RNG } from './rng';
import { MACRO } from './params';
import { updateMonetaryPolicy } from './monetaryPolicy';

export function updateMacro(state: GameState, rng: RNG) {
  const regime = state.regime;
  const macro = state.macro;

  // Store previous values for causal links
  const prevRate = macro.baseRateAnnual;

  const events = updateMonetaryPolicy(state, rng);

  // ── FX USD/BRL ──
  const fxDrift = MACRO.fxUSDBRL.regimeDrift[regime];
  const fxShock = rng.nextGaussian() * MACRO.fxUSDBRL.dailyVol;
  // Causal: high risk pushes FX up
  const riskFxPressure = macro.riskIndex > 0.5 ? (macro.riskIndex - 0.5) * 0.002 : 0;
  macro.fxUSDBRL = clamp(
    macro.fxUSDBRL * (1 + fxDrift + fxShock + riskFxPressure),
    MACRO.fxUSDBRL.min, MACRO.fxUSDBRL.max
  );

  // ── Activity ──
  const actDrift = MACRO.activity.regimeDrift[regime];
  const actShock = rng.nextGaussian() * MACRO.activity.dailyVol;
  // Causal: rising rates dampen activity
  const rateDelta = macro.baseRateAnnual - prevRate;
  const ratePressure = rateDelta > 0 ? -rateDelta * 0.1 : 0;
  macro.activityAnnual = clamp(
    macro.activityAnnual + actDrift + actShock + ratePressure,
    MACRO.activity.min, MACRO.activity.max
  );

  // ── Risk index ──
  const riskDrift = MACRO.risk.regimeDrift[regime];
  const riskShock = rng.nextGaussian() * MACRO.risk.dailyVol;
  macro.riskIndex = clamp(
    macro.riskIndex + riskDrift + riskShock,
    MACRO.risk.min, MACRO.risk.max
  );
  return events;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
