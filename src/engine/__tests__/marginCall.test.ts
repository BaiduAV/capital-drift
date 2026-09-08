import { describe, expect, it } from 'vitest';
import { createGameState } from '../init';
import { checkAndExecuteMarginCall } from '../marginCall';
import { computeEquity } from '../invariants';
import { simulateDay } from '../simulateDay';
import { quoteSell } from '../trading';
import { createInitialTaxState, getTaxCategory } from '../taxes';
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


describe('liquidation across monthly exemption boundaries', () => {
  function portfolio(assetClass: AssetClass, priorSales = 0, quantity = 1000) {
    const state = distressedPortfolio(assetClass);
    state.assets.TEST.price = 100;
    state.portfolio.TEST = { quantity, avgPrice: 0 };
    state.history.equity = [200000];
    state.taxState = createInitialTaxState();
    state.taxState.monthlySalesByCategory = { 0: { [getTaxCategory(assetClass)]: priorSales } };
    return state;
  }

  it('sells exactly 200 exempt shares for a 20% reserve, preserving equity', () => {
    const state = portfolio('STOCK');
    state.marginCallSettings.recoveryTarget = 0.2;
    const result = checkAndExecuteMarginCall(state);
    expect(result.assetsLiquidated[0].quantity).toBe(200);
    expect(state.cash).toBe(20000);
    expect(state.portfolio.TEST.quantity).toBe(800);
    expect(state.taxState.totalIRPaid).toBe(0);
    expect(computeEquity(state)).toBe(100000);
  });

  it.each([
    ['STOCK', 5000, 150],
    ['CRYPTO_MAJOR', 0, 350],
    ['CRYPTO_ALT', 15000, 200],
  ] as const)('checks the exempt endpoint for %s with prior sales of %s', (assetClass, priorSales, expectedQuantity) => {
    const state = portfolio(assetClass, priorSales);
    const exemptQuote = quoteSell(state, 'TEST', expectedQuantity);
    expect(exemptQuote.taxBreakdown.isExempt).toBe(true);
    expect(quoteSell(state, 'TEST', expectedQuantity + 1).taxBreakdown.isExempt).toBe(false);
    const net = exemptQuote.taxBreakdown.netAfterTax;
    state.marginCallSettings.recoveryTarget = net / (computeEquity(state) - expectedQuantity * 100 + net);
    const result = checkAndExecuteMarginCall(state);
    expect(result.assetsLiquidated[0].quantity).toBe(expectedQuantity);
    expect(state.taxState.totalIRPaid).toBe(0);
    expect(state.cash).toBeCloseTo(net);
  });

  it('finds the exempt solution even when selling the full fractional position misses the target', () => {
    const state = portfolio('STOCK', 0, 200.5);
    state.assets.LOCKED = { ...state.assets.TEST, haltedUntilDay: 10 };
    state.assetCatalog.LOCKED = { ...state.assetCatalog.TEST, id: 'LOCKED', class: 'RF_POS' };
    state.portfolio.LOCKED = { quantity: 1000, avgPrice: 100 };
    state.history.equity = [400000];
    state.marginCallSettings.recoveryTarget = 20000 / computeEquity(state);
    const result = checkAndExecuteMarginCall(state);
    expect(result.assetsLiquidated[0].quantity).toBe(200);
    expect(state.portfolio.TEST.quantity).toBe(0.5);
    expect(state.taxState.totalIRPaid).toBe(0);
  });

  it.each([
    ['STOCK', 0, 0.2001, 0],
    ['CRYPTO_MAJOR', 0, 0.4, 0],
    ['CRYPTO_ALT', 35000, 0.2, 0],
    ['STOCK', 20000, 0.2, 0],
    ['STOCK', 10000, 0.2, 100],
    ['STOCK', 10000, 0.2, 150],
  ] as const)('matches an exhaustive minimum for %s, prior sales %s, target %s, basis %s', (assetClass, priorSales, target, basis) => {
    const state = portfolio(assetClass, priorSales);
    state.portfolio.TEST.avgPrice = basis;
    state.marginCallSettings.recoveryTarget = target;
    const equity = computeEquity(state);
    let expected = state.portfolio.TEST.quantity;
    for (let quantity = 1; quantity <= state.portfolio.TEST.quantity; quantity++) {
      const net = quoteSell(state, 'TEST', quantity).taxBreakdown.netAfterTax;
      if (net + 1e-8 >= (equity - quantity * 100 + net) * target) {
        expected = quantity;
        break;
      }
    }
    const result = checkAndExecuteMarginCall(state);
    expect(result.assetsLiquidated[0].quantity).toBe(expected);
    expect(state.cash + 1e-8).toBeGreaterThanOrEqual(computeEquity(state) * target);
  });
});
