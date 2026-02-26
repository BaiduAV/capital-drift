// ── Day simulation orchestrator ──

import type { GameState, DayResult } from './types';
import { createRNG } from './rng';
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
  const previousRegime = state.regime;

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

  // 5b. Track price history (cap at 90)
  for (const [id, assetState] of Object.entries(state.assets)) {
    if (!assetState.priceHistory) assetState.priceHistory = [];
    assetState.priceHistory.push(assetState.price);
    if (assetState.priceHistory.length > 90) assetState.priceHistory.shift();
  }

  // 6. Dividends
  const dividendsPaid = applyDividendsAndDistributions(state);

  // 7. Credit
  const creditEvents = processCreditWatchAndDefaults(state, rng);
  events.push(...creditEvents);

  // 8. CDI accumulation
  const dailyCDI = state.macro.baseRateAnnual / 252;
  const lastCDI = state.history.cdiAccumulated[state.history.cdiAccumulated.length - 1];
  state.history.cdiAccumulated.push(lastCDI * (1 + dailyCDI));

  // 8b. Inflation accumulation
  const dailyInfl = state.macro.inflationAnnual / 252;
  const lastInfl = state.history.inflationAccumulated[state.history.inflationAccumulated.length - 1] ?? 1;
  state.history.inflationAccumulated.push(lastInfl * (1 + dailyInfl));

  // 9. History
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
    previousRegime,
    events,
    marketSummary: { topGainers, topLosers },
    equityBefore,
    equityAfter,
    dividendsPaid,
  };
}
