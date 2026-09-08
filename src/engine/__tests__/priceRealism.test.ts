import { describe, expect, it } from 'vitest';
import { gameFixture } from '@/test/factories/game';
import { generateReturns } from '../pricing';
import { computeSectorReturn } from '../correlation';
import { createRNG } from '../rng';
import { simulateDay } from '../simulateDay';
import type { RegimeId } from '../types';

function correlation(a: number[], b: number[]) {
  const mean = (values: number[]) => values.reduce((s, v) => s + v, 0) / values.length;
  const ma = mean(a), mb = mean(b);
  return a.reduce((s, v, i) => s + (v - ma) * (b[i] - mb), 0)
    / Math.sqrt(a.reduce((s, v) => s + (v - ma) ** 2, 0) * b.reduce((s, v) => s + (v - mb) ** 2, 0));
}

describe('current pricing model contracts', () => {
  it('applies regime drift with neutral shocks, without relying on a lucky price path', () => {
    const state = gameFixture();
    const crypto = Object.values(state.assetCatalog).find(a => a.class === 'CRYPTO_ALT')!.id;
    const returns = (regime: RegimeId) => {
      state.regime = regime;
      return generateReturns(state, { ...createRNG(42), nextGaussian: () => 0 })[crypto];
    };
    expect(returns('BULL')).toBeGreaterThan(returns('CALM'));
    expect(returns('CRISIS')).toBeLessThan(0);
    expect(returns('CRYPTO_EUPHORIA')).toBeGreaterThan(returns('BULL'));
  });
  it.each([42, 1729])('increases crypto co-movement in crisis (seed %i)', seed => {
    const state = gameFixture();
    const ids = Object.values(state.assetCatalog).filter(a => a.corrGroup === 'CRYPTO').slice(0, 2).map(a => a.id);
    expect(ids).toHaveLength(2);
    const sample = (regime: RegimeId) => {
      state.regime = regime;
      const rng = createRNG(seed);
      const pairs = Array.from({ length: 1000 }, () => generateReturns(state, rng));
      return correlation(pairs.map(r => r[ids[0]]), pairs.map(r => r[ids[1]]));
    };
    expect(sample('CRISIS')).toBeGreaterThan(sample('CALM') + .15);
  });
  it('keeps stock factor weights and sector macro sensitivities explicit', () => {
    const neutral = { selic: 0, fx: 0, riskOn: 0, commodity: 0 };
    expect(computeSectorReturn('TECH', neutral, { marketShock: .02, sectorShock: 0, idioShock: 0 })).toBeCloseTo(.01);
    expect(computeSectorReturn('TECH', neutral, { marketShock: 0, sectorShock: .02, idioShock: 0 })).toBeCloseTo(.007);
    expect(computeSectorReturn('TECH', neutral, { marketShock: 0, sectorShock: 0, idioShock: .02 })).toBeCloseTo(.003);
    const zero = { marketShock: 0, sectorShock: 0, idioShock: 0 };
    expect(computeSectorReturn('TECH', { ...neutral, selic: .01 }, zero)).toBeLessThan(0);
    expect(computeSectorReturn('BANCOS', { ...neutral, selic: .01 }, zero)).toBeGreaterThan(0);
  });
  it('uses contractual CDB accrual across changing regimes in the real pipeline', () => {
    let state = gameFixture();
    expect(state.assetCatalog.CDB110.fixedIncome).toBeDefined();
    expect(state.assets.CDB110.fixedIncome).toBeDefined();
    for (const regime of ['CALM', 'BULL', 'CRISIS'] as const) {
      for (let day = 0; day < 30; day++) {
        state.regime = regime;
        const previous = state.assets.CDB110.price;
        state = simulateDay(state).state;
        expect(state.assets.CDB110.price).toBeGreaterThan(previous);
        expect(Object.values(state.assets).every(a => Number.isFinite(a.price) && a.price >= 0)).toBe(true);
      }
    }
    expect(state.dayIndex).toBe(90);
    expect(state.assets.CDB110.price / 100 - 1).toBeLessThan(.1);
  });
});
