// ── Regime transitions ──

import type { GameState, RegimeId } from './types';
import type { RNG } from './rng';
import { REGIME_SWITCH_PROB, REGIME_TRANSITION } from './params';

export function maybeSwitchRegime(state: GameState, rng: RNG): RegimeId {
  const switchProb = REGIME_SWITCH_PROB[state.regime];
  if (rng.next() >= switchProb) return state.regime;

  const weights = REGIME_TRANSITION[state.regime];
  const entries = Object.entries(weights).filter(([, w]) => w > 0) as [RegimeId, number][];
  const totalWeight = entries.reduce((s, [, w]) => s + w, 0);

  let roll = rng.next() * totalWeight;
  for (const [regime, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return regime;
  }
  return entries[entries.length - 1][0];
}
