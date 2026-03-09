// ── Event generation and application ──

import type { GameState, SimulationState, EventCard, EventType, PersistentEvent, DayContext } from './types';
import type { RNG } from './rng';
import { EVENT_BASE_PROB, DOUBLE_EVENT_PROB, EVENT_IMPACTS } from './params';

function randRange(rng: RNG, range: [number, number] | number[]): number {
  return range[0] + rng.next() * (range[1] - range[0]);
}

function pickSector(state: GameState, rng: RNG): { sector: string; assets: string[] } {
  // Derive sectors dynamically from the catalog, filtering out non-economic sectors
  const excludedSectors = new Set(['NONE', 'TOTAL_MARKET', 'DIVIDENDS', 'SMALL_CAPS']);
  const sectorSet = new Set<string>();
  for (const def of Object.values(state.assetCatalog)) {
    if (def.sector && !excludedSectors.has(def.sector) && (def.class === 'STOCK' || def.class === 'ETF' || def.class === 'FII')) {
      sectorSet.add(def.sector);
    }
  }
  const sectors = Array.from(sectorSet);
  if (sectors.length === 0) return { sector: 'NONE', assets: [] };
  const sector = sectors[Math.floor(rng.next() * sectors.length)];
  const assets = Object.values(state.assetCatalog)
    .filter(a => a.sector === sector && (a.class === 'STOCK' || a.class === 'ETF' || a.class === 'FII'))
    .map(a => a.id);
  return { sector, assets };
}

function generateSingleEvent(state: GameState, rng: RNG): EventCard | null {
  const regime = state.regime;

  const weights: [EventType, number][] = [
    ['RATE_HIKE', regime === 'BEAR' || regime === 'CRISIS' ? 3 : 1],
    ['RATE_CUT', regime === 'BULL' || regime === 'CALM' ? 3 : 1],
    ['INFLATION_UP', regime === 'CRISIS' ? 2 : 1],
    ['INFLATION_DOWN', regime === 'CALM' ? 2 : 1],
    ['SECTOR_BOOM', regime === 'BULL' ? 3 : 1],
    ['SECTOR_BUST', regime === 'BEAR' || regime === 'CRISIS' ? 3 : 1],
    ['CRYPTO_HACK', regime === 'CRISIS' ? 2 : 0.5],
    ['CRYPTO_EUPHORIA_EVENT', regime === 'CRYPTO_EUPHORIA' ? 4 : 0.3],
    ['CRYPTO_RUG_PULL', 0.15],
    ['FLASH_CRASH', 0.03], // Very rare ~0.03 base weight
    ['CREDIT_DOWNGRADE', regime === 'CRISIS' ? 2 : 0.5],
    ['FX_SHOCK', regime === 'CRISIS' ? 3 : regime === 'BEAR' ? 2 : 0.5],
    ['FISCAL_STRESS', regime === 'CRISIS' ? 3 : regime === 'BEAR' ? 2 : 0.3],
    ['COMMODITY_BOOM', regime === 'BULL' ? 3 : regime === 'CRYPTO_EUPHORIA' ? 2 : 0.5],
  ];

  // Dynamically check for high bubble + stress to trigger SECTOR_CRASH
  if (state.market?.sectors) {
    let hasExtremeBubble = false;
    for (const [sector, bs] of Object.entries(state.market.sectors)) {
      if (bs.bubble > 1.2 && bs.stress > 0.8) {
        hasExtremeBubble = true;
        break;
      }
    }
    if (hasExtremeBubble) {
      weights.push(['SECTOR_CRASH' as EventType, 10.0]); // Very high weight if extreme conditions are met
    }
  }

  const totalWeight = weights.reduce((s, [, w]) => s + w, 0);
  let roll = rng.next() * totalWeight;
  let picked: EventType = 'RATE_HIKE';
  for (const [type, w] of weights) {
    roll -= w;
    if (roll <= 0) { picked = type; break; }
  }

  const impact: Record<string, number> = {};
  let macroImpact: EventCard['macroImpact'];
  let magnitude = 0;
  let vars: Record<string, string> | undefined;

  switch (picked) {
    case 'RATE_HIKE': {
      const delta = randRange(rng, EVENT_IMPACTS.rateHike.rateDelta as [number, number]);
      macroImpact = { baseRateDelta: delta };
      const shock = randRange(rng, EVENT_IMPACTS.rateHike.equityShock as [number, number]);
      for (const [id, def] of Object.entries(state.assetCatalog)) {
        if (def.corrGroup === 'EQUITY') impact[id] = shock;
        if (def.class === 'RF_PRE' || def.class === 'RF_IPCA') impact[id] = -shock * 0.8;
      }
      magnitude = Math.abs(delta);
      break;
    }
    case 'RATE_CUT': {
      const delta = randRange(rng, EVENT_IMPACTS.rateCut.rateDelta as [number, number]);
      macroImpact = { baseRateDelta: delta };
      const shock = randRange(rng, EVENT_IMPACTS.rateCut.equityShock as [number, number]);
      for (const [id, def] of Object.entries(state.assetCatalog)) {
        if (def.corrGroup === 'EQUITY') impact[id] = shock;
        if (def.class === 'RF_PRE' || def.class === 'RF_IPCA') impact[id] = shock * 0.8;
      }
      magnitude = Math.abs(delta);
      break;
    }
    case 'INFLATION_UP': {
      const delta = randRange(rng, EVENT_IMPACTS.inflationUp.inflDelta as [number, number]);
      macroImpact = { inflationDelta: delta };
      for (const [id, def] of Object.entries(state.assetCatalog)) {
        if (def.sector === 'ENERGIA') impact[id] = -0.01 * rng.next();
      }
      magnitude = Math.abs(delta);
      break;
    }
    case 'INFLATION_DOWN': {
      const delta = randRange(rng, EVENT_IMPACTS.inflationDown.inflDelta as [number, number]);
      macroImpact = { inflationDelta: delta };
      magnitude = Math.abs(delta);
      break;
    }
    case 'SECTOR_BOOM': {
      const { sector, assets } = pickSector(state, rng);
      const shock = 0.005 + rng.next() * 0.02;
      for (const id of assets) impact[id] = shock;
      magnitude = shock;
      vars = { sector };
      break;
    }
    case 'SECTOR_BUST': {
      const { sector, assets } = pickSector(state, rng);
      const shock = -(0.005 + rng.next() * 0.02);
      for (const id of assets) impact[id] = shock;
      magnitude = Math.abs(shock);
      vars = { sector };
      break;
    }
    case 'CRYPTO_HACK': {
      for (const [id, def] of Object.entries(state.assetCatalog)) {
        if (def.class === 'CRYPTO_MAJOR') impact[id] = randRange(rng, EVENT_IMPACTS.cryptoHack.majorShock as [number, number]);
        if (def.class === 'CRYPTO_ALT') impact[id] = randRange(rng, EVENT_IMPACTS.cryptoHack.altShock as [number, number]);
      }
      magnitude = 0.10;
      break;
    }
    case 'CRYPTO_EUPHORIA_EVENT': {
      for (const [id, def] of Object.entries(state.assetCatalog)) {
        if (def.class === 'CRYPTO_ALT') impact[id] = randRange(rng, EVENT_IMPACTS.cryptoEuphoria.altShock as [number, number]);
      }
      magnitude = 0.10;
      break;
    }
    case 'CRYPTO_RUG_PULL': {
      const alts = Object.values(state.assetCatalog).filter(a => a.class === 'CRYPTO_ALT');
      if (alts.length > 0) {
        const target = alts[Math.floor(rng.next() * alts.length)];
        impact[target.id] = randRange(rng, EVENT_IMPACTS.cryptoRugPull.targetShock as [number, number]);
        magnitude = Math.abs(impact[target.id] ?? 0.5);
      } else {
        magnitude = 0;
      }
      break;
    }
    case 'CREDIT_DOWNGRADE': {
      const debs = Object.values(state.assetCatalog).filter(a => a.class === 'DEBENTURE');
      if (debs.length > 0) {
        const target = debs[Math.floor(rng.next() * debs.length)];
        impact[target.id] = -(0.02 + rng.next() * 0.05);
        magnitude = Math.abs(impact[target.id]);
      }
      break;
    }
    case 'FX_SHOCK': {
      const fxD = randRange(rng, EVENT_IMPACTS.fxShock.fxDelta as [number, number]);
      const riskD = randRange(rng, EVENT_IMPACTS.fxShock.riskDelta as [number, number]);
      const eqShock = randRange(rng, EVENT_IMPACTS.fxShock.equityShock as [number, number]);
      macroImpact = { fxDelta: fxD, riskDelta: riskD };
      for (const [id, def] of Object.entries(state.assetCatalog)) {
        if (def.corrGroup === 'EQUITY') impact[id] = eqShock;
      }
      magnitude = fxD;
      break;
    }
    case 'FISCAL_STRESS': {
      const riskD = randRange(rng, EVENT_IMPACTS.fiscalStress.riskDelta as [number, number]);
      const rateD = randRange(rng, EVENT_IMPACTS.fiscalStress.rateDelta as [number, number]);
      const actD = randRange(rng, EVENT_IMPACTS.fiscalStress.activityDelta as [number, number]);
      const eqShock = randRange(rng, EVENT_IMPACTS.fiscalStress.equityShock as [number, number]);
      macroImpact = { riskDelta: riskD, baseRateDelta: rateD, activityDelta: actD };
      for (const [id, def] of Object.entries(state.assetCatalog)) {
        if (def.corrGroup === 'EQUITY') impact[id] = eqShock;
        if (def.class === 'RF_PRE' || def.class === 'RF_IPCA') impact[id] = eqShock * 0.6;
      }
      magnitude = riskD;
      break;
    }
    case 'COMMODITY_BOOM': {
      const actD = randRange(rng, EVENT_IMPACTS.commodityBoom.activityDelta as [number, number]);
      const fxD = randRange(rng, EVENT_IMPACTS.commodityBoom.fxDelta as [number, number]);
      const riskD = randRange(rng, EVENT_IMPACTS.commodityBoom.riskDelta as [number, number]);
      const eqShock = randRange(rng, EVENT_IMPACTS.commodityBoom.equityShock as [number, number]);
      macroImpact = { activityDelta: actD, fxDelta: fxD, riskDelta: riskD };
      for (const [id, def] of Object.entries(state.assetCatalog)) {
        if (def.corrGroup === 'EQUITY') impact[id] = eqShock;
        if (def.sector === 'ENERGIA') impact[id] = (impact[id] ?? 0) + eqShock * 0.5;
      }
      magnitude = actD;
      break;
    }
    case 'SECTOR_CRASH' as any: {
      const { sector, assets } = pickSector(state, rng);
      const shock = -(0.10 + rng.next() * 0.15);
      for (const id of assets) impact[id] = shock;
      magnitude = Math.abs(shock);
      vars = { sector };
      break;
    }
    case 'FLASH_CRASH': {
      // Flash crash: all crypto alts drop -40% to -80%, majors take a smaller hit
      for (const [id, def] of Object.entries(state.assetCatalog)) {
        if (def.class === 'CRYPTO_ALT') impact[id] = randRange(rng, EVENT_IMPACTS.flashCrash.altShock as [number, number]);
        if (def.class === 'CRYPTO_MAJOR') impact[id] = randRange(rng, EVENT_IMPACTS.flashCrash.majorShock as [number, number]);
      }
      const riskD = randRange(rng, EVENT_IMPACTS.flashCrash.riskDelta as [number, number]);
      macroImpact = { riskDelta: riskD };
      magnitude = 0.60;
      break;
    }
  }

  const typeToKey: Record<EventType, string> = {
    RATE_HIKE: 'rate_hike', RATE_CUT: 'rate_cut',
    INFLATION_UP: 'inflation_up', INFLATION_DOWN: 'inflation_down',
    SECTOR_BOOM: 'sector_boom', SECTOR_BUST: 'sector_bust',
    CRYPTO_HACK: 'crypto_hack', CRYPTO_EUPHORIA_EVENT: 'crypto_euphoria',
    CRYPTO_RUG_PULL: 'crypto_rug_pull', CREDIT_DOWNGRADE: 'credit_downgrade',
    FX_SHOCK: 'fx_shock', FISCAL_STRESS: 'fiscal_stress', COMMODITY_BOOM: 'commodity_boom',
    SECTOR_CRASH: 'sector_crash', FLASH_CRASH: 'flash_crash',
    IPO_ANNOUNCED: 'ipo.announced', IPO_BOOKBUILDING: 'ipo.bookbuilding', IPO_LISTED: 'ipo.listed',
  };

  return {
    type: picked,
    titleKey: `event.${typeToKey[picked]}.title`,
    descriptionKey: `event.${typeToKey[picked]}.desc`,
    impact,
    macroImpact,
    magnitude,
    vars,
  };
}

export function maybeGenerateEvents(state: GameState, rng: RNG): PersistentEvent[] {
  const prob = EVENT_BASE_PROB[state.regime];
  if (rng.next() >= prob) return [];

  const events: PersistentEvent[] = [];
  const first = generateSingleEvent(state, rng);
  if (first) {
    events.push({
      id: `evt_${state.dayIndex}_1`,
      card: first,
      startedAtDay: state.dayIndex,
      durationDays: 1, // Default duration 1 day for now
    });
  }

  if (rng.next() < DOUBLE_EVENT_PROB) {
    const second = generateSingleEvent(state, rng);
    if (second) {
      events.push({
        id: `evt_${state.dayIndex}_2`,
        card: second,
        startedAtDay: state.dayIndex,
        durationDays: 1,
      });
    }
  }

  return events;
}

export function rollEvents(state: SimulationState, ctx: DayContext): { active: PersistentEvent[], generated: PersistentEvent[] } {
  // 1. Decay/remove expired events
  const active = (state.events?.active || []).filter(e => {
    return (ctx.dayIndex - e.startedAtDay) < e.durationDays;
  });

  // 2. Generate new events
  const generated = maybeGenerateEvents(state, ctx.rng.events);

  return {
    active: [...active, ...generated],
    generated
  }
}

export function applyEventMacro(state: GameState, events: PersistentEvent[]): void {
  for (const ev of events) {
    const impact = ev.card.macroImpact;
    if (!impact) continue;

    if (impact.baseRateDelta) {
      state.macro.baseRateAnnual = Math.max(0.02, Math.min(0.20,
        state.macro.baseRateAnnual + impact.baseRateDelta));
    }
    if (impact.inflationDelta) {
      state.macro.inflationAnnual = Math.max(0.00, Math.min(0.12,
        state.macro.inflationAnnual + impact.inflationDelta));
    }
    if (impact.fxDelta) {
      state.macro.fxUSDBRL = Math.max(3.5, Math.min(7.5,
        state.macro.fxUSDBRL * (1 + impact.fxDelta)));
    }
    if (impact.activityDelta) {
      state.macro.activityAnnual = Math.max(-0.05, Math.min(0.08,
        state.macro.activityAnnual + impact.activityDelta));
    }
    if (impact.riskDelta) {
      state.macro.riskIndex = Math.max(0.05, Math.min(0.95,
        state.macro.riskIndex + impact.riskDelta));
    }
  }
}

export function mergeEventImpacts(returns: Record<string, number>, events: PersistentEvent[]): Record<string, number> {
  const merged = { ...returns };
  for (const ev of events) {
    for (const [assetId, shock] of Object.entries(ev.card.impact)) {
      merged[assetId] = (merged[assetId] ?? 0) + shock;
    }
  }
  return merged;
}
