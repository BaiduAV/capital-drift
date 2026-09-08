import { describe, expect, it } from 'vitest';
import { createGameState } from '../init';
import { executeBuy, executeSell, quoteBuy, quoteSell } from '../trading';
import { availableCash, reserveIPO, settleReceivables } from '../cash';
import { computeEquity } from '../invariants';
import { simulateDay } from '../simulateDay';
import { checkAndExecuteMarginCall } from '../marginCall';
import type { AssetClass, GameState } from '../types';

function asset(state: GameState, id: string, cls: AssetClass, quantity = 1000, basis = 0) {
  state.assets[id] = { price: 100, lastReturn: 0, haltedUntilDay: null, priceHistory: [100] };
  state.assetCatalog[id] = { id, nameKey: id, class: cls, sector: 'NONE', corrGroup: cls === 'STOCK' ? 'EQUITY' : 'CRYPTO', liquidityRule: 'D0', initialPrice: 100 };
  state.portfolio[id] = { quantity, avgPrice: basis, avgPurchaseDay: 0 };
}
function sell(state: GameState, id: string, quantity: number) {
  expect(executeSell(state, quoteSell(state, id, quantity))).toBe(true);
}
function ipo(state: GameState, ticker: string) {
  const def = { ...state.assetCatalog.TSELIC, id: ticker, class: 'STOCK' as const, corrGroup: 'EQUITY' as const };
  state.ipoPipeline.push({ ticker, displayName: ticker, sector: 'NONE', assetClass: 'STOCK', offerPrice: 100, announcedDay: 0, listingDay: 0, status: 'bookbuilding', demand: 0.5, playerReservation: 0, catalogEntry: def });
}

describe('monthly tax reconciliation', () => {
  it.each(['STOCK', 'CRYPTO_MAJOR'] as const)('makes one sale and split sales equivalent for %s', cls => {
    const whole = createGameState(1);
    asset(whole, 'TEST', cls);
    const split = structuredClone(whole);
    const thresholdUnits = cls === 'STOCK' ? 200 : 350;
    sell(whole, 'TEST', thresholdUnits + 1);
    sell(split, 'TEST', thresholdUnits);
    sell(split, 'TEST', 1);
    expect(split.taxState.totalIRPaid).toBeCloseTo(whole.taxState.totalIRPaid);
    expect(split.cash).toBeCloseTo(whole.cash);
    if (cls === 'STOCK') expect(split.taxState.totalIRPaid).toBe(3015);
  });

  it('refunds excess monthly withholding when a later sale realizes a loss', () => {
    const gainsFirst = createGameState(1);
    asset(gainsFirst, 'GAIN', 'STOCK', 300, 0);
    asset(gainsFirst, 'LOSS', 'STOCK', 100, 200);
    const lossFirst = structuredClone(gainsFirst);
    sell(gainsFirst, 'GAIN', 300);
    expect(quoteSell(gainsFirst, 'LOSS', 100).taxBreakdown.irAmount).toBe(-1500);
    sell(gainsFirst, 'LOSS', 100);
    sell(lossFirst, 'LOSS', 100);
    sell(lossFirst, 'GAIN', 300);
    expect(gainsFirst.taxState.totalIRPaid).toBe(3000);
    expect(lossFirst.taxState.totalIRPaid).toBe(3000);
    expect(gainsFirst.cash).toBe(lossFirst.cash);
  });

  it('consumes carry-forward once and starts the next month from the remaining loss', () => {
    const state = createGameState(1);
    asset(state, 'TEST', 'STOCK');
    state.taxState = { totalIRPaid: 0, totalIOFPaid: 0, monthlySales: {}, accumulatedLosses: { STOCK: -30000 } };
    sell(state, 'TEST', 201);
    expect(state.taxState.accumulatedLosses.STOCK).toBe(-9900);
    state.dayIndex = 30;
    sell(state, 'TEST', 201);
    expect(state.taxState.totalIRPaid).toBe(1530);
    expect(state.taxState.accumulatedLosses.STOCK).toBe(0);
  });

  it('rejects tax reconciliation without enough unreserved cash, leaving state intact', () => {
    const state = createGameState(1);
    asset(state, 'TEST', 'STOCK');
    sell(state, 'TEST', 200);
    state.cash = 0; // Proceeds spent on other investments.
    const before = structuredClone(state);
    const quote = quoteSell(state, 'TEST', 1);
    expect(quote.taxBreakdown.totalTax).toBe(3015);
    expect(executeSell(state, quote)).toBe(false);
    expect(state).toEqual(before);
  });

  it('preserves the exempt minimum when automatic liquidation would otherwise cross the threshold', () => {
    const state = createGameState(1);
    asset(state, 'TEST', 'STOCK');
    state.cash = 0;
    state.history.equity = [200000];
    state.marginCallSettings.recoveryTarget = 0.2;
    const result = checkAndExecuteMarginCall(state);
    expect(result.assetsLiquidated[0].quantity).toBe(200);
    expect(state.taxState.totalIRPaid).toBe(0);
  });

  it('finds the exempt boundary even on a loss-making sale with prior monthly gains', () => {
    const state = createGameState(1);
    asset(state, 'GAIN', 'STOCK', 199, 0);
    sell(state, 'GAIN', 199);
    state.cash = 0;
    asset(state, 'LOSS', 'STOCK', 10, 101);
    state.history.equity = [10000];
    state.marginCallSettings.recoveryTarget = 0.1;
    const result = checkAndExecuteMarginCall(state);
    expect(result.assetsLiquidated[0].quantity).toBe(1);
    expect(state.cash).toBe(100);
  });

  it.each([
    ['STOCK', 199, 1], ['STOCK', 197, 3], ['STOCK', 200, 0],
    ['CRYPTO_MAJOR', 349, 1], ['CRYPTO_MAJOR', 347, 3], ['CRYPTO_MAJOR', 350, 0],
  ] as const)('takes the largest executable %s tranche after %s prior units (%s remaining exempt)', (cls, priorUnits, expectedUnits) => {
    const state = createGameState(1);
    asset(state, 'GAIN', cls, priorUnits);
    sell(state, 'GAIN', priorUnits);
    state.cash = 0;
    asset(state, 'REMAINING', cls, 10);
    state.history.equity = [10000];
    state.marginCallSettings.recoveryTarget = 0.4;
    const fullQuote = quoteSell(state, 'REMAINING', 10);
    expect(fullQuote.canExecute).toBe(false);
    expect(fullQuote.reason).toBe('trade.insufficient_cash');
    const partial = expectedUnits > 0 ? quoteSell(state, 'REMAINING', expectedUnits) : null;
    if (partial) {
      expect(partial.canExecute).toBe(true);
      expect(partial.taxBreakdown.netAfterTax).toBeLessThan(computeEquity(state) * 0.4);
    }
    expect(quoteSell(state, 'REMAINING', expectedUnits + 1).canExecute).toBe(false);

    const result = checkAndExecuteMarginCall(state);
    expect(result.triggered).toBe(expectedUnits > 0);
    expect(result.assetsLiquidated).toEqual(expectedUnits > 0
      ? [{ assetId: 'REMAINING', quantity: expectedUnits, proceeds: partial!.taxBreakdown.netAfterTax }]
      : []);
    expect(state.portfolio.REMAINING.quantity).toBe(10 - expectedUnits);
    expect(state.cash).toBeCloseTo(partial?.taxBreakdown.netAfterTax ?? 0);
    expect(result.totalLiquidated).toBeCloseTo(state.cash);
    expect(state.taxState.totalIRPaid).toBe(0);
  });

  it('continues to the next asset after an exempt tranche makes partial progress', () => {
    const state = createGameState(1);
    asset(state, 'GAIN', 'STOCK', 199);
    sell(state, 'GAIN', 199);
    state.cash = 0;
    asset(state, 'REMAINING', 'STOCK', 10);
    state.portfolio.TSELIC = { quantity: 10, avgPrice: 100, avgPurchaseDay: 0 };
    state.history.equity = [10000];
    state.marginCallSettings.recoveryTarget = 0.4;
    const result = checkAndExecuteMarginCall(state);
    expect(result.assetsLiquidated).toEqual([
      { assetId: 'REMAINING', quantity: 1, proceeds: 100 },
      { assetId: 'TSELIC', quantity: 7, proceeds: 700 },
    ]);
    expect(state.cash).toBe(800);
    expect(state.taxState.totalIRPaid).toBe(0);
  });
});

describe('committed IPO cash', () => {
  it('prevents overbooking and spending reserved cash; cancellation releases it', () => {
    const state = createGameState(1);
    ipo(state, 'IPO_A'); ipo(state, 'IPO_B');
    expect(reserveIPO(state, 'IPO_A', 40)).toBe(true);
    expect(reserveIPO(state, 'IPO_B', 40)).toBe(false);
    expect(availableCash(state)).toBe(1000);
    expect(executeBuy(state, quoteBuy(state, 'TSELIC', 11))).toBe(false);
    expect(reserveIPO(state, 'IPO_A', 30)).toBe(true);
    expect(availableCash(state)).toBe(2000);
    expect(reserveIPO(state, 'IPO_A', 0)).toBe(true);
    expect(availableCash(state)).toBe(5000);
  });

  it('fills simultaneous covered reservations and consumes the commitment exactly once', () => {
    const state = createGameState(1);
    ipo(state, 'IPO_A'); ipo(state, 'IPO_B');
    reserveIPO(state, 'IPO_A', 40); reserveIPO(state, 'IPO_B', 10);
    const next = simulateDay(state).state;
    expect(next.portfolio.IPO_A.quantity).toBe(40);
    expect(next.portfolio.IPO_B.quantity).toBe(10);
    expect(next.cash).toBe(0);
    expect(next.ipoPipeline).toHaveLength(0);
    expect(simulateDay(next).state.portfolio.IPO_A.quantity).toBe(40);
  });

  it('does not let forced sales spend cash committed to an IPO', () => {
    const state = createGameState(1);
    asset(state, 'TEST', 'STOCK');
    ipo(state, 'IPO_A'); reserveIPO(state, 'IPO_A', 40);
    sell(state, 'TEST', 200);
    state.cash = 4000;
    expect(quoteSell(state, 'TEST', 1).canExecute).toBe(false);
  });
});

describe('redemption timing', () => {
  it.each([[29, 0.005], [30, 0], [100, 0]])('CDB110 penalty at day %s is %s', (day, penalty) => {
    const state = createGameState(1);
    state.dayIndex = day;
    state.portfolio.CDB110 = { quantity: 1, avgPrice: 100, avgPurchaseDay: 0 };
    expect(quoteSell(state, 'CDB110', 1).spread).toBe(penalty);
  });

  it('keeps D7 net proceeds in equity but unavailable until settlement', () => {
    const state = createGameState(1);
    state.cash = 0;
    state.portfolio.DEBAA = { quantity: 10, avgPrice: 80, avgPurchaseDay: 0 };
    const quote = quoteSell(state, 'DEBAA', 10);
    expect(quote.settlementDay).toBe(7);
    expect(executeSell(state, quote)).toBe(true);
    expect(state.cash).toBe(0);
    expect(state.portfolio.DEBAA).toBeUndefined();
    expect(computeEquity(state)).toBeCloseTo(quote.taxBreakdown.netAfterTax);
    expect(quoteBuy(state, 'TSELIC', 1).canExecute).toBe(false);
    state.dayIndex = 6; settleReceivables(state);
    expect(state.cash).toBe(0);
    const final = simulateDay(state).state;
    expect(final.cash).toBeCloseTo(quote.taxBreakdown.netAfterTax);
    expect(final.pendingSettlements).toHaveLength(0);
    settleReceivables(final);
    expect(final.cash).toBeCloseTo(quote.taxBreakdown.netAfterTax);
  });
});
