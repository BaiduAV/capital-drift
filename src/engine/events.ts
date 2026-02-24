// ── Event generation and application ──

import type { GameState, EventCard, EventType, AssetDefinition } from './types';
import type { RNG } from './rng';
import { EVENT_BASE_PROB, DOUBLE_EVENT_PROB, EVENT_IMPACTS } from './params';

function randRange(rng: RNG, range: [number, number] | number[]): number {
  return range[0] + rng.next() * (range[1] - range[0]);
}

function pickSector(state: GameState, rng: RNG): { sector: string; assets: string[] } {
  const sectors = ['BANK', 'ENERGY', 'RETAIL', 'TECH'];
  const sector = sectors[Math.floor(rng.next() * sectors.length)];
  const assets = Object.values(state.assetCatalog)
    .filter(a => a.sector === sector && (a.class === 'STOCK' || a.class === 'ETF'))
    .map(a => a.id);
  return { sector, assets };
}

function generateSingleEvent(state: GameState, rng: RNG): EventCard | null {
  const regime = state.regime;

  // Weight event types by regime
  const weights: [EventType, number][] = [
    ['RATE_HIKE', regime === 'BEAR' || regime === 'CRISIS' ? 3 : 1],
    ['RATE_CUT', regime === 'BULL' || regime === 'CALM' ? 3 : 1],
    ['INFLATION_UP', regime === 'CRISIS' ? 2 : 1],
    ['INFLATION_DOWN', regime === 'CALM' ? 2 : 1],
    ['SECTOR_BOOM', regime === 'BULL' ? 3 : 1],
    ['SECTOR_BUST', regime === 'BEAR' || regime === 'CRISIS' ? 3 : 1],
    ['CRYPTO_HACK', regime === 'CRISIS' ? 2 : 0.5],
    ['CRYPTO_EUPHORIA_EVENT', regime === 'CRYPTO_EUPHORIA' ? 4 : 0.3],
    ['CRYPTO_RUG_PULL', 0.15], // rare
    ['CREDIT_DOWNGRADE', regime === 'CRISIS' ? 2 : 0.5],
  ];

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

  switch (picked) {
    case 'RATE_HIKE': {
      const delta = randRange(rng, EVENT_IMPACTS.rateHike.rateDelta as [number, number]);
      macroImpact = { baseRateDelta: delta };
      // Equities get negative shock
      const shock = randRange(rng, EVENT_IMPACTS.rateHike.equityShock as [number, number]);
      for (const [id, def] of Object.entries(state.assetCatalog)) {
        if (def.corrGroup === 'EQUITY') impact[id] = shock;
        if (def.class === 'RF_PRE' || def.class === 'RF_IPCA') impact[id] = -shock * 0.8; // bonds benefit
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
      // Retail suffers
      for (const [id, def] of Object.entries(state.assetCatalog)) {
        if (def.sector === 'RETAIL') impact[id] = -0.01 * rng.next();
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
      const { assets } = pickSector(state, rng);
      const shock = 0.005 + rng.next() * 0.02;
      for (const id of assets) impact[id] = shock;
      magnitude = shock;
      break;
    }
    case 'SECTOR_BUST': {
      const { assets } = pickSector(state, rng);
      const shock = -(0.005 + rng.next() * 0.02);
      for (const id of assets) impact[id] = shock;
      magnitude = Math.abs(shock);
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
      impact['CRALTM'] = randRange(rng, EVENT_IMPACTS.cryptoRugPull.targetShock as [number, number]);
      magnitude = Math.abs(impact['CRALTM'] ?? 0.5);
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
  }

  const typeToKey: Record<EventType, string> = {
    RATE_HIKE: 'rate_hike', RATE_CUT: 'rate_cut',
    INFLATION_UP: 'inflation_up', INFLATION_DOWN: 'inflation_down',
    SECTOR_BOOM: 'sector_boom', SECTOR_BUST: 'sector_bust',
    CRYPTO_HACK: 'crypto_hack', CRYPTO_EUPHORIA_EVENT: 'crypto_euphoria',
    CRYPTO_RUG_PULL: 'crypto_rug_pull', CREDIT_DOWNGRADE: 'credit_downgrade',
  };

  return {
    type: picked,
    titleKey: `event.${typeToKey[picked]}.title`,
    descriptionKey: `event.${typeToKey[picked]}.desc`,
    impact,
    macroImpact,
    magnitude,
  };
}

export function maybeGenerateEvents(state: GameState, rng: RNG): EventCard[] {
  const prob = EVENT_BASE_PROB[state.regime];
  if (rng.next() >= prob) return [];

  const events: EventCard[] = [];
  const first = generateSingleEvent(state, rng);
  if (first) events.push(first);

  // 10% chance of second event
  if (rng.next() < DOUBLE_EVENT_PROB) {
    const second = generateSingleEvent(state, rng);
    if (second) events.push(second);
  }

  return events;
}

export function applyEventMacro(state: GameState, events: EventCard[]): void {
  for (const ev of events) {
    if (ev.macroImpact?.baseRateDelta) {
      state.macro.baseRateAnnual = Math.max(0.02, Math.min(0.20,
        state.macro.baseRateAnnual + ev.macroImpact.baseRateDelta));
    }
    if (ev.macroImpact?.inflationDelta) {
      state.macro.inflationAnnual = Math.max(0.00, Math.min(0.12,
        state.macro.inflationAnnual + ev.macroImpact.inflationDelta));
    }
  }
}

export function mergeEventImpacts(returns: Record<string, number>, events: EventCard[]): Record<string, number> {
  const merged = { ...returns };
  for (const ev of events) {
    for (const [assetId, shock] of Object.entries(ev.impact)) {
      merged[assetId] = (merged[assetId] ?? 0) + shock;
    }
  }
  return merged;
}
