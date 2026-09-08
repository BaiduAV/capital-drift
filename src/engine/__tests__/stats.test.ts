import { describe, expect, it } from 'vitest';
import { bestDay, worstDay, winRate, volatility, sharpeRatio } from '../stats';

describe('portfolio statistics', () => {
  it('calculates sample volatility and returns from known percentage changes', () => {
    const equity = [100, 110, 99]; // +10%, -10%
    expect(bestDay(equity)).toBeCloseTo(.1);
    expect(worstDay(equity)).toBeCloseTo(-.1);
    expect(winRate(equity)).toBe(.5);
    expect(volatility(equity)).toBeCloseTo(Math.sqrt(.02 * 252));
    expect(sharpeRatio(equity, [200, 201, 202])).toBeCloseTo(-.02 * 126 / Math.sqrt(.02 * 252));
  });
  it('is independent of the currency scale of equity and CDI', () => {
    expect(sharpeRatio([100, 110, 99], [1, 1.01, 1.02]))
      .toBeCloseTo(sharpeRatio([5000, 5500, 4950], [5000, 5050, 5100])!);
  });
  it('retains the total-loss day without inventing returns after bankruptcy', () => {
    expect(bestDay([5000, 0, 0])).toBe(-1);
    expect(worstDay([5000, 0, 0])).toBe(-1);
    expect(winRate([5000, 0, 0])).toBe(0);
    expect(volatility([5000, 0, 0])).toBeNull();
    expect(sharpeRatio([5000, 0, 0], [5000, 5001, 5002])).toBeNull();
  });
  it.each([[], [0], [100], [0, 0], [0, 100], [100, -1], [100, NaN], [100, Infinity]].map(values => ({ values })))('reports unavailable statistics for missing or invalid observations: %j', ({ values }) => {
      expect(bestDay(values)).toBeNull();
      expect(worstDay(values)).toBeNull();
      expect(winRate(values)).toBeNull();
      expect(volatility(values)).toBeNull();
      expect(sharpeRatio(values, values)).toBeNull();
    });
  it('distinguishes a flat investment from missing observations', () => {
    expect(volatility([100, 100, 100])).toBe(0);
    expect(bestDay([100, 100])).toBe(0);
    expect(worstDay([100, 100])).toBe(0);
    expect(winRate([100, 100])).toBe(0);
    expect(sharpeRatio([100, 100, 100], [1, 1, 1])).toBeNull();
  });
  it.each([[1, 1.01], [1, 0, 1.02], [1, NaN, 1.02]].map(cdi => ({ cdi })))('rejects invalid or misaligned benchmarks: %j', ({ cdi }) => {
    expect(sharpeRatio([100, 110, 99], cdi)).toBeNull();
  });
});
