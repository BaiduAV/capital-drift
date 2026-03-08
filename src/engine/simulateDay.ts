// ── Day simulation orchestrator (Deterministic Pipeline) ──

import type { SimulationState, DayResult, DayContext, PersistentEvent } from './types';
import { createRNG } from './rng';
import { maybeSwitchRegime } from './regimes';
import { updateMacro } from './macro';
import { updateSectorBubble } from './bubbles';
import { generateAssetIdentity } from './naming';
import { maybeBankruptAsset } from './bankruptcy';
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
      names: baseRng.fork('names'),
    }
  };
}

function phaseExpectations(state: SimulationState, ctx: DayContext): SimulationState {
  const next = structuredClone(state);
  // 1. Regime transition (forward-looking expectations)
  next.regime = maybeSwitchRegime(next, ctx.rng.macro);

  // 1b. Sector bubbles and sentiments
  if (!next.market) {
    next.market = { sectors: {}, newListingsCount: {} };
  }

  // Calculate average recent return for each sector
  const sectorReturns: Record<string, { sum: number, count: number }> = {};
  for (const [id, a] of Object.entries(next.assets)) {
    const def = next.assetCatalog[id];
    if (!def || !def.sector) continue;
    if (!sectorReturns[def.sector]) sectorReturns[def.sector] = { sum: 0, count: 0 };
    sectorReturns[def.sector].sum += a.lastReturn;
    sectorReturns[def.sector].count += 1;
  }

  const sectors = Object.keys(sectorReturns) as import('./types').Sector[];
  for (const sector of sectors) {
    const sr = sectorReturns[sector];
    const avgReturn = sr.count > 0 ? sr.sum / sr.count : 0;

    // Bubble update
    next.market.sectors[sector] = updateSectorBubble(
      next.market.sectors[sector],
      { sectorReturn: avgReturn, macro: next.macro }
    );
  }

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

  // 4b. Dynamic IPOs (Heat > 0.6)
  if (next.market?.sectors) {
    const sectors = Object.keys(next.market.sectors) as import('./types').Sector[];
    for (const sector of sectors) {
      const heat = next.market.sectors[sector]?.ipoHeat || 0;
      // Probability of an IPO scales with heat above 0.6
      if (heat > 0.6) {
        const prob = (heat - 0.6) * 0.05; // Max 2% per day at 1.0 heat
        if (ctx.rng.market.next() < prob) {
          const count = next.market.newListingsCount[sector] || 0;
          const { ticker, nameKey, companyName } = generateAssetIdentity(ctx.rng.names, sector, count);

          next.market.newListingsCount[sector] = count + 1;

          const initialPrice = 10 + 20 * ctx.rng.market.next(); // 10 to 30
          next.assets[ticker] = { price: initialPrice, lastReturn: 0, haltedUntilDay: null, priceHistory: [initialPrice] };
          next.assetCatalog[ticker] = {
            id: ticker,
            nameKey,
            displayName: companyName,
            class: 'STOCK',
            sector,
            corrGroup: 'EQUITY',
            liquidityRule: 'D0',
            initialPrice
          };

          // Generate a trace event for the IPO with company details
          allGenerated.push({
            id: `ipo_${next.dayIndex}_${ticker}`,
            card: {
              type: 'SECTOR_BOOM',
              titleKey: 'event.ipo.title',
              descriptionKey: 'event.ipo.desc',
              impact: {},
              magnitude: 0,
              vars: { company: companyName, ticker, sector },
            },
            startedAtDay: next.dayIndex,
            durationDays: 1
          });
        }
      }
    }
  }

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
  const { totalPaid: dividendsPaid, payments: dividendDetails } = applyDividendsAndDistributions(next);

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

  // 11b. Apply bankruptcies
  for (const [id, a] of Object.entries(next.assets)) {
    maybeBankruptAsset(id, a, next, ctx.rng.market);
  }

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
