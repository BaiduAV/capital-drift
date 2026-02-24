// ── Day simulation orchestrator ──

import type { GameState, DayResult } from './types';
import { createRNG, type RNG } from './rng';
import { maybeSwitchRegime } from './regimes';
import { updateMacro } from './macro';
import { generateReturns, applyReturnsToPrices } from './pricing';
import { maybeGenerateEvents, applyEventMacro, mergeEventImpacts } from './events';
import { processCreditWatchAndDefaults } from './credit';
import { applyDividendsAndDistributions } from './dividends';
import { checkInvariants, computeEquity } from './invariants';

export function simulateDay(state: GameState): DayResult {
  const rng = createRNG(state.rngState);
  const equityBefore = computeEquity(state);

  // 1. Regime
  state.regime = maybeSwitchRegime(state, rng);

  // 2. Macro
  updateMacro(state, rng);

  // 3. Base returns
  let returns = generateReturns(state, rng);

  // 4. Events
  const events = maybeGenerateEvents(state, rng);
  applyEventMacro(state, events);
  returns = mergeEventImpacts(returns, events);

  // 5. Apply prices
  applyReturnsToPrices(state, returns);

  // 6. Dividends
  applyDividendsAndDistributions(state);

  // 7. Credit
  const creditEvents = processCreditWatchAndDefaults(state, rng);
  events.push(...creditEvents);

  // 8. History
  const equityAfter = computeEquity(state);
  state.history.equity.push(equityAfter);

  const peak = Math.max(...state.history.equity);
  const dd = peak > 0 ? (peak - equityAfter) / peak : 0;
  state.history.drawdown.push(dd);

  // Update RNG state and day
  state.rngState = rng.state();
  state.dayIndex++;

  // Invariants (dev check)
  const errors = checkInvariants(state);
  if (errors.length > 0) {
    console.warn('Invariant violations:', errors);
  }

  // Market summary
  const assetReturns = Object.entries(returns).sort((a, b) => b[1] - a[1]);
  const topGainers = assetReturns.slice(0, 3).map(([id]) => id);
  const topLosers = assetReturns.slice(-3).reverse().map(([id]) => id);

  return {
    dayIndex: state.dayIndex,
    regime: state.regime,
    events,
    marketSummary: { topGainers, topLosers },
    equityBefore,
    equityAfter,
  };
}
