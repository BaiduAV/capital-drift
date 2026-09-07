import { describe, expect, it } from 'vitest';
import { createGameState } from '../init';
import { checkAndExecuteMarginCall } from '../marginCall';
import { computeEquity } from '../invariants';
import { simulateDay } from '../simulateDay';
import type { AssetClass } from '../types';

function distressedPortfolio(assetClass: AssetClass = 'STOCK') {
  const state = createGameState(1);
  state.cash = 0;
  state.assets = { TEST: { price: 40, lastReturn: 0, haltedUntilDay: null, priceHistory: [40] } };
  state.assetCatalog = { TEST: { id: 'TEST', nameKey: 'test', class: assetClass, sector: 'NONE', corrGroup: 'EQUITY', liquidityRule: 'D0', initialPrice: 100 } };
  state.portfolio = { TEST: { quantity: 100, avgPrice: 100 } };
  state.history.equity = [10000];
  return state;
}

describe('forced liquidation builds a cash reserve', () => {
  it('stops at the reserve target instead of trying to undo losses', () => {
    const state = distressedPortfolio();
    const result = checkAndExecuteMarginCall(state);
    expect(result.triggered).toBe(true);
    expect(state.cash).toBe(1600);
    expect(state.portfolio.TEST.quantity).toBe(60);
    expect(computeEquity(state)).toBe(4000);
    expect(checkAndExecuteMarginCall(state).triggered).toBe(false);
  });

  it.each(['FII', 'CRYPTO_MAJOR'] as const)('uses net proceeds after taxes and fees for %s', assetClass => {
    const state = distressedPortfolio(assetClass);
    state.portfolio.TEST.avgPrice = 10;
    const result = checkAndExecuteMarginCall(state);
    expect(state.cash / computeEquity(state)).toBeGreaterThanOrEqual(0.4);
    expect(result.totalLiquidated).toBeCloseTo(state.cash);
    expect(result.assetsLiquidated[0].proceeds).toBeCloseTo(state.cash);
    expect(computeEquity(state)).toBeLessThan(4000);
    expect(checkAndExecuteMarginCall(state).triggered).toBe(false);
  });

  it('does not emit repeated calls when all positions are halted', () => {
    const state = distressedPortfolio();
    state.assets.TEST.haltedUntilDay = 10;
    const before = structuredClone(state);
    expect(checkAndExecuteMarginCall(state).triggered).toBe(false);
    expect(state).toEqual(before);
  });

  it('can liquidate a fractional remainder for a 100% cash target', () => {
    const state = distressedPortfolio();
    state.portfolio.TEST.quantity = 0.5;
    state.marginCallSettings.recoveryTarget = 1;
    expect(checkAndExecuteMarginCall(state).totalLiquidated).toBe(20);
    expect(state.portfolio.TEST).toBeUndefined();
  });

  it('records after-tax equity consistently in day results and drawdown history', () => {
    const state = distressedPortfolio('FII');
    state.portfolio.TEST.avgPrice = 10;
    const result = simulateDay(state);
    const finalEquity = computeEquity(result.state);
    expect(result.events.some(e => e.type === 'MARGIN_CALL')).toBe(true);
    expect(result.metrics.equityAfter).toBe(finalEquity);
    expect(result.equityAfter).toBe(finalEquity);
    expect(result.state.history.equity.at(-1)).toBe(finalEquity);
    expect(result.state.history.drawdown.at(-1)).toBeCloseTo((10000 - finalEquity) / 10000);
  });
});
