// ── Day simulation orchestrator (Deterministic Pipeline) ──

import type { SimulationState, DayResult, DayContext, PersistentEvent, IPOPipelineEntry } from './types';
import { createRNG } from './rng';
import { maybeSwitchRegime } from './regimes';
import { updateMacro } from './macro';
import { updateSectorBubble } from './bubbles';
import { generateAssetIdentity, generateFIIIdentity } from './naming';
import { maybeBankruptAsset } from './bankruptcy';
import { generateReturns, applyReturnsToPrices } from './pricing';
import { rollEvents, applyEventMacro, mergeEventImpacts } from './events';
import { processCreditWatchAndDefaults } from './credit';
import { applyDividendsAndDistributions } from './dividends';
import { checkInvariants, computeEquity } from './invariants';
import { IPO } from './params';

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

  // 4b. IPO Pipeline — 3-phase state machine
  if (!next.ipoPipeline) next.ipoPipeline = [];

  // Phase 3: List assets that reached listing day (process first so new announcements don't list same day)
  const toRemove = new Set<string>();
  for (const entry of next.ipoPipeline) {
    if (entry.status === 'bookbuilding' && next.dayIndex >= entry.listingDay) {
      // Calculate IPO pop based on demand
      const popFactor = IPO.popRange.low + (IPO.popRange.high - IPO.popRange.low) * entry.demand;
      const listingPrice = entry.offerPrice * (1 + popFactor);

      next.assets[entry.ticker] = {
        price: listingPrice,
        lastReturn: popFactor,
        haltedUntilDay: null,
        priceHistory: [entry.offerPrice, listingPrice],
        ipoVolatilityUntilDay: next.dayIndex + IPO.volatilityDays,
      };
      next.assetCatalog[entry.ticker] = entry.catalogEntry;

      // Credit player reservation at offer price
      if (entry.playerReservation > 0) {
        const cost = entry.playerReservation * entry.offerPrice;
        if (next.cash >= cost) {
          next.cash -= cost;
          const existing = next.portfolio[entry.ticker];
          if (existing) {
            const totalQty = existing.quantity + entry.playerReservation;
            existing.avgPrice = (existing.avgPrice * existing.quantity + cost) / totalQty;
            existing.quantity = totalQty;
          } else {
            next.portfolio[entry.ticker] = { quantity: entry.playerReservation, avgPrice: entry.offerPrice };
          }
        }
      }

      entry.status = 'listed';
      toRemove.add(entry.ticker);

      const popPct = (popFactor * 100).toFixed(1);
      allGenerated.push({
        id: `ipo_listed_${next.dayIndex}_${entry.ticker}`,
        card: {
          type: 'IPO_LISTED',
          titleKey: 'event.ipo.listed.title',
          descriptionKey: 'event.ipo.listed.desc',
          impact: {},
          magnitude: Math.abs(popFactor),
          vars: { company: entry.displayName, ticker: entry.ticker, sector: entry.sector, pop: popPct },
        },
        startedAtDay: next.dayIndex,
        durationDays: 1,
      });
    }
  }
  next.ipoPipeline = next.ipoPipeline.filter(e => !toRemove.has(e.ticker));

  // Phase 2: Transition announced → bookbuilding
  for (const entry of next.ipoPipeline) {
    if (entry.status === 'announced' && next.dayIndex >= entry.announcedDay + IPO.bookbuildingStart) {
      entry.status = 'bookbuilding';
      // Calculate demand based on regime, ipoHeat, riskIndex
      const regimeDemand: Record<string, number> = {
        CALM: 0.5, BULL: 0.75, BEAR: 0.3, CRISIS: 0.15, CRYPTO_EUPHORIA: 0.65,
      };
      const baseDemand = regimeDemand[next.regime] ?? 0.5;
      const sectorHeat = next.market?.sectors?.[entry.sector]?.ipoHeat ?? 0.5;
      const riskPenalty = next.macro.riskIndex * 0.3;
      entry.demand = Math.max(0, Math.min(1, baseDemand + sectorHeat * 0.3 - riskPenalty + (ctx.rng.market.next() - 0.5) * 0.2));

      allGenerated.push({
        id: `ipo_book_${next.dayIndex}_${entry.ticker}`,
        card: {
          type: 'IPO_BOOKBUILDING',
          titleKey: 'event.ipo.bookbuilding.title',
          descriptionKey: 'event.ipo.bookbuilding.desc',
          impact: {},
          magnitude: 0,
          vars: { company: entry.displayName, ticker: entry.ticker, sector: entry.sector, demand: (entry.demand * 100).toFixed(0) },
        },
        startedAtDay: next.dayIndex,
        durationDays: 1,
      });
    }
  }

  // Phase 1: New IPO announcements
  if (next.market?.sectors) {
    const sectors = Object.keys(next.market.sectors) as import('./types').Sector[];
    const fiiSectors = new Set(['BRICK', 'PAPER', 'LOGISTICA', 'HYBRID']);
    const alreadyInPipeline = new Set(next.ipoPipeline.map(e => e.sector));

    for (const sector of sectors) {
      if (alreadyInPipeline.has(sector)) continue; // max 1 IPO per sector in pipeline
      const heat = next.market.sectors[sector]?.ipoHeat || 0;
      if (heat > 0.6) {
        const prob = (heat - 0.6) * 0.05;
        if (ctx.rng.market.next() < prob) {
          const isFII = fiiSectors.has(sector);
          const count = next.market.newListingsCount[sector] || 0;

          let ticker: string, nameKey: string, companyName: string;
          if (isFII) {
            const identity = generateFIIIdentity(
              { usedTickers: new Set(Object.keys(next.assets)), usedNames: new Set(), rng: ctx.rng.names } as any,
              sector
            );
            ticker = identity.ticker;
            companyName = identity.displayName;
            nameKey = `asset.${ticker.toLowerCase()}`;
          } else {
            ({ ticker, nameKey, companyName } = generateAssetIdentity(ctx.rng.names, sector, count));
          }
          next.market.newListingsCount[sector] = count + 1;

          // Offer price based on sector average
          const sectorPrices = Object.entries(next.assetCatalog)
            .filter(([, d]) => d.sector === sector)
            .map(([id]) => next.assets[id]?.price ?? 0)
            .filter(p => p > 0);
          const avgPrice = sectorPrices.length > 0 ? sectorPrices.reduce((a, b) => a + b, 0) / sectorPrices.length : (isFII ? 85 : 20);
          const offerPrice = avgPrice * (0.85 + ctx.rng.market.next() * 0.30); // 85%-115% of avg

          const assetClass = isFII ? 'FII' as const : 'STOCK' as const;
          const catalogEntry = {
            id: ticker,
            nameKey,
            displayName: companyName,
            class: assetClass,
            sector,
            corrGroup: 'EQUITY' as const,
            liquidityRule: 'D0' as const,
            initialPrice: offerPrice,
            ...(isFII ? { dividendYieldAnnual: 0.06 + ctx.rng.market.next() * 0.04, dividendPeriodDays: 30 } : {}),
          };

          const entry: IPOPipelineEntry = {
            ticker,
            displayName: companyName,
            sector,
            assetClass,
            offerPrice: Math.round(offerPrice * 100) / 100,
            announcedDay: next.dayIndex,
            listingDay: next.dayIndex + IPO.leadDays,
            status: 'announced',
            demand: 0,
            playerReservation: 0,
            catalogEntry,
          };
          next.ipoPipeline.push(entry);

          allGenerated.push({
            id: `ipo_announced_${next.dayIndex}_${ticker}`,
            card: {
              type: 'IPO_ANNOUNCED',
              titleKey: 'event.ipo.announced.title',
              descriptionKey: 'event.ipo.announced.desc',
              impact: {},
              magnitude: 0,
              vars: { company: companyName, ticker, sector, price: offerPrice.toFixed(2) },
            },
            startedAtDay: next.dayIndex,
            durationDays: 1,
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
      dividendDetails,
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
