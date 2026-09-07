import { describe, expect, it } from 'vitest';
import { computeMaxDrawdown } from '../invariants';
import { createGameState } from '../init';
import { simulatePeriod } from '../simulatePeriod';

describe('chronological drawdown', () => {
  it.each([
    [[100, 110, 120], 0],
    [[100, 80, 200], 0.2],
    [[100, 150, 90, 200], 0.4],
    [[100, 0], 1],
    [[0, 0], 0],
    [[], 0],
  ])('measures only losses after a peak: %j', (equities, expected) => {
    expect(computeMaxDrawdown(equities)).toBeCloseTo(expected);
  });

  it('reports zero drawdown for a growing fixed-income portfolio', () => {
    const state = createGameState(42);
    const id = Object.keys(state.assetCatalog).find(id => state.assetCatalog[id].class === 'RF_POS')!;
    state.cash = 0;
    state.portfolio[id] = { quantity: 10, avgPrice: state.assets[id].price };
    const period = simulatePeriod(state, 10);
    expect(period.totalReturn).toBeGreaterThan(0);
    expect(period.maxDrawdown).toBe(0);
  });

  it('does not return NaN for a fully depleted portfolio', () => {
    const state = createGameState(42);
    state.cash = 0;
    expect(simulatePeriod(state, 1).totalReturn).toBe(0);
  });
});
