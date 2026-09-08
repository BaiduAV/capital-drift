import { describe, expect, it } from 'vitest';
import { createGameState } from '../init';
import { applyTaxOnSell, calculateSellTax, createInitialTaxState, getIOFRate } from '../taxes';
import { executeBuy, quoteBuy } from '../trading';
import type { AssetClass } from '../types';

function taxState() {
  const state = createGameState(1);
  const classes: AssetClass[] = ['STOCK', 'CRYPTO_MAJOR', 'CRYPTO_ALT', 'FII', 'ETF', 'RF_POS', 'FX'];
  for (const cls of classes) {
    state.assetCatalog[cls] = { id: cls, nameKey: cls, class: cls, sector: 'NONE', corrGroup: 'EQUITY', liquidityRule: 'D0', initialPrice: 100 };
    state.assets[cls] = { price: 100, lastReturn: 0, haltedUntilDay: null, priceHistory: [100] };
    state.portfolio[cls] = { quantity: 1000, avgPrice: 50, avgPurchaseDay: 0 };
  }
  state.taxState = createInitialTaxState();
  return state;
}

describe('separate monthly exemption counters', () => {
  it('does not let other asset classes consume stock or crypto exemptions', () => {
    const state = taxState();
    for (const cls of ['FII', 'ETF', 'RF_POS', 'FX']) applyTaxOnSell(state, cls, 400, 100);
    expect(calculateSellTax(state, 'STOCK', 10, 100).isExempt).toBe(true);
    expect(calculateSellTax(state, 'CRYPTO_MAJOR', 10, 100).isExempt).toBe(true);
    applyTaxOnSell(state, 'STOCK', 200, 100);
    expect(calculateSellTax(state, 'STOCK', 1, 100).irAmount).toBeGreaterThan(0);
    expect(calculateSellTax(state, 'CRYPTO_MAJOR', 10, 100).isExempt).toBe(true);
    applyTaxOnSell(state, 'CRYPTO_MAJOR', 350, 100);
    expect(calculateSellTax(state, 'CRYPTO_ALT', 1, 100).irAmount).toBeGreaterThan(0);
  });

  it('starts a new simulated month with fresh counters', () => {
    const state = taxState();
    applyTaxOnSell(state, 'STOCK', 201, 100);
    state.dayIndex = 30; state.calendarDate = '2026-02-02';
    expect(calculateSellTax(state, 'STOCK', 1, 100).isExempt).toBe(true);
  });

  it('preserves taxes and loss offsets from old saves without guessing categories', () => {
    const state = taxState();
    delete state.calendarDate; // Exercise legacy counters without a financial calendar.
    state.taxState = { totalIRPaid: 10, totalIOFPaid: 20, accumulatedLosses: { STOCK: -100 }, monthlySales: { 0: 90000 } };
    expect(calculateSellTax(state, 'STOCK', 1, 100).isExempt).toBe(true);
    applyTaxOnSell(state, 'STOCK', 1, 100);
    expect(state.taxState.monthlySales[0]).toBe(90100);
    expect(state.taxState.totalIRPaid).toBe(10);
    expect(state.taxState.totalIOFPaid).toBe(20);
    expect(state.taxState.accumulatedLosses.STOCK).toBe(-100);
    expect(state.taxState.monthlySalesByCategory?.[0]?.STOCK).toBe(100);
    state.dayIndex = 150;
    applyTaxOnSell(state, 'STOCK', 1, 100);
    expect(state.taxState.monthlySalesByCategory?.[0]).toBeUndefined();
  });
});

describe('IOF on weighted holding periods', () => {
  it.each([[0, 0.96], [1, 0.96], [1.3333, 0.96], [2, 0.93], [29.9, 0.03], [30, 0]])('uses complete days for %s days', (days, rate) => {
    expect(getIOFRate(days)).toBe(rate);
  });

  it('charges IOF after purchases on different days instead of indexing a fractional day', () => {
    const state = taxState();
    delete state.portfolio.RF_POS;
    executeBuy(state, quoteBuy(state, 'RF_POS', 1));
    state.dayIndex = 1;
    executeBuy(state, quoteBuy(state, 'RF_POS', 2));
    state.dayIndex = 2;
    const result = calculateSellTax(state, 'RF_POS', 3, 110);
    expect(result.capitalGain).toBe(30);
    expect(result.iofAmount).toBeCloseTo(28.8);
    expect(result.irAmount).toBeCloseTo(0.27);
    state.dayIndex = 31;
    expect(calculateSellTax(state, 'RF_POS', 3, 110).iofAmount).toBe(0);
  });
});
