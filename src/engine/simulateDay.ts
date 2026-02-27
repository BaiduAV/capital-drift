// ── Day simulation orchestrator (Deterministic Pipeline) ──

import type { SimulationState, DayResult, DayContext, PersistentEvent } from './types';
import { createRNG } from './rng';
import { maybeSwitchRegime } from './regimes';
import { updateMacro } from './macro';
import { generateReturns, applyReturnsToPrices } from './pricing';
import { rollEvents, applyEventMacro, mergeEventImpacts } from './events';
import { processCreditWatchAndDefaults } from './credit';
import { applyDividendsAndDistributions } from './dividends';
import { checkInvariants, computeEquity } from './invariants';

export interface SimulateDayOptions {
  seed?: number;
}

function buildDayContext(state: SimulationState, opts?: SimulateDayOptions): DayContext {
  const baseRng = createRNG(opts?.seed ?? state.rngState);
  return {
    dayIndex: state.dayIndex,
    dt: 1, // 1 day
    rng: {
      market: baseRng.fork('market'),
      macro: baseRng.fork('macro'),
      events: baseRng.fork('events'),
      agents: baseRng.fork('agents'),
    }
  };
}

function phaseExpectations(state: SimulationState, ctx: DayContext): SimulationState {
  const next = structuredClone(state);
  // 1. Regime transition (forward-looking expectations)
  next.regime = maybeSwitchRegime(next, ctx.rng.macro);
  return next;
}

function phaseShocks(state: SimulationState, ctx: DayContext): { next: SimulationState, generatedEvents: PersistentEvent[] } {
  const next = structuredClone(state);

  // 2. Macro shocks and drift
  updateMacro(next, ctx.rng.macro);

  // 3. Credit watch & defaults (idiosyncratic shocks)
  const creditEvents = processCreditWatchAndDefaults(next, ctx.rng.events);

  // 4. Exogenous Events
  const { active, generated } = rollEvents(next, ctx);
  next.events = { active };

  // Add credit events to active events temporarily to be processed
  const allGenerated = [...generated, ...creditEvents.map((c, i) => ({
    id: `credit_${next.dayIndex}_${i}`,
    card: c,
    startedAtDay: next.dayIndex,
    durationDays: 1
  }))];

  next.events.active.push(...allGenerated);

  // Apply macro impacts from all active events
  applyEventMacro(next, next.events.active);

  return { next, generatedEvents: allGenerated };
}

function phaseMarketClearing(state: SimulationState, ctx: DayContext): { next: SimulationState, returns: Record<string, number> } {
  const next = structuredClone(state);

  // 5. Base returns generation
  let returns = generateReturns(next, ctx.rng.market);

  // 6. Merge event impacts
  returns = mergeEventImpacts(returns, next.events?.active || []);

  // 7. Apply prices
  applyReturnsToPrices(next, returns);

  // 8. Track price history (cap at 90)
  for (const [id, assetState] of Object.entries(next.assets)) {
    if (!assetState.priceHistory) assetState.priceHistory = [];
    assetState.priceHistory.push(assetState.price);
    if (assetState.priceHistory.length > 90) assetState.priceHistory.shift();
  }

  return { next, returns };
}

function phaseAccountingAndMetrics(
  prevState: SimulationState,
  nextState: SimulationState,
  returns: Record<string, number>,
  generatedEvents: PersistentEvent[],
  ctx: DayContext
): DayResult {
  const next = structuredClone(nextState);

  const equityBefore = computeEquity(prevState);

  // 9. Dividends
  const dividendsPaid = applyDividendsAndDistributions(next);

  // 10. CDI & Inflation accumulation
  const dailyCDI = next.macro.baseRateAnnual / 252;
  const lastCDI = next.history.cdiAccumulated[next.history.cdiAccumulated.length - 1] ?? 1;
  next.history.cdiAccumulated.push(lastCDI * (1 + dailyCDI));

  const dailyInfl = next.macro.inflationAnnual / 252;
  const lastInfl = next.history.inflationAccumulated[next.history.inflationAccumulated.length - 1] ?? 1;
  next.history.inflationAccumulated.push(lastInfl * (1 + dailyInfl));

  // 11. History
  const equityAfter = computeEquity(next);
  next.history.equity.push(equityAfter);

  const peak = Math.max(0, ...next.history.equity);
  const dd = peak > 0 ? (peak - equityAfter) / peak : 0;
  next.history.drawdown.push(dd);

  // Update loop state
  const baseRng = createRNG(prevState.rngState);
  baseRng.next(); // advance the base seed for the next day
  next.rngState = baseRng.state();
  next.dayIndex++;

  // Invariants checking
  const errors = checkInvariants(next);
  const warnings = [...errors];

  // Market summary
  const assetReturns = Object.entries(returns).sort((a, b) => b[1] - a[1]);
  const topGainers = assetReturns.slice(0, 3).map(([id]) => id);
  const topLosers = assetReturns.slice(-3).reverse().map(([id]) => id);

  const newEventCards = generatedEvents.map(e => e.card);

  return {
    state: next,
    metrics: {
      equityBefore,
      equityAfter,
      dividendsPaid,
    },
    warnings,
    trace: {
      previousRegime: prevState.regime,
      currentRegime: next.regime,
      eventsApplied: next.events?.active.map(e => `${e.card.type}(${e.card.magnitude.toFixed(3)})`) || [],
      marketSummary: { topGainers, topLosers },
      phases: ['Expectations', 'Shocks', 'MarketClearing', 'Accounting'],
    },
    // Legacy fields
    dayIndex: next.dayIndex,
    regime: next.regime,
    previousRegime: prevState.regime,
    events: newEventCards,
    equityBefore,
    equityAfter,
    dividendsPaid,
  };
}

export function simulateDay(state: SimulationState, opts?: SimulateDayOptions): DayResult {
  const ctx = buildDayContext(state, opts);

  const stateT1 = phaseExpectations(state, ctx);
  const { next: stateT2, generatedEvents } = phaseShocks(stateT1, ctx);
  const { next: stateT3, returns } = phaseMarketClearing(stateT2, ctx);

  return phaseAccountingAndMetrics(state, stateT3, returns, generatedEvents, ctx);
}
