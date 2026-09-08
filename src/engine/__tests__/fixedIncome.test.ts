import { afterEach, describe, expect, it } from 'vitest';
import { createGameState } from '../init';
import { createRNG } from '../rng';
import { generateReturns, applyReturnsToPrices } from '../pricing';
import { annualToDaily, addBusinessDays, calendarDaysBetween, gameDate, isBusinessDay, taxMonth } from '../financialCalendar';
import { accrueFixedIncomeCustody, settleFixedIncomeMaturities, fixedIncomeSellCapacity, fixedIncomeTax, defaultFixedIncomeIssuer, initializeFixedIncome, processFixedIncomeCredit } from '../fixedIncome';
import { executeBuy, executeSell, quoteBuy, quoteSell } from '../trading';
import { computeEquity } from '../invariants';
import { simulateDay } from '../simulateDay';
import { applyEventMacro, maybeGenerateEvents } from '../events';
import { loadGame, saveGame } from '../persistence';
import { settleReceivables } from '../cash';
import type { GameState, FixedIncomeLot } from '../types';

afterEach(() => localStorage.clear());
function buy(s: GameState, id: string, qty = 1) { expect(executeBuy(s, quoteBuy(s, id, qty))).toBe(true); }
function advance(s: GameState, days = 1) {
  for (let i = 0; i < days; i++) {
    applyReturnsToPrices(s, generateReturns(s, createRNG(i)));
    accrueFixedIncomeCustody(s);
    s.dayIndex++;
    s.calendarDate = addBusinessDays(s.calendarDate!, 1);
    settleReceivables(s);
    settleFixedIncomeMaturities(s);
  }
}
const lot = (purchaseDate: string, unitCost = 100): FixedIncomeLot => ({ quantity: 1, unitCost, purchaseDate, purchaseDay: 0, maturityDay: 1000, custodyAccrued: 0 });

describe('contractual fixed income returns', () => {
  it('compounds effective annual rates instead of dividing them by 252', () => {
    expect(Math.pow(1 + annualToDaily(0.12), 252) - 1).toBeCloseTo(0.12, 12);
  });
  it('CDB100 follows simulated CDI and CDB110 applies 110% to each daily factor', () => {
    const s = createGameState(1);
    s.macro.baseRateAnnual = 0.121; // simulated CDI = 12%
    advance(s, 252);
    expect(s.assets.CDB100.price).toBeCloseTo(112, 8);
    expect(s.assets.CDB110.price).toBeCloseTo(100 * Math.pow(1 + 1.1 * annualToDaily(0.12), 252), 8);
    expect(s.assets.CDB110.price).toBeGreaterThan(s.assets.CDB100.price);
  });
  it('Selic follows the target while CDB follows a distinct DI index', () => {
    const s = createGameState(1);
    s.macro.baseRateAnnual = 0.12;
    advance(s, 252);
    expect(s.assets.TSELIC.price).toBeCloseTo(112, 8);
    expect(s.assets.CDB100.price).toBeCloseTo(111.9, 8);
  });
  it('higher Selic changes post-fixed accrual immediately, independently of RNG', () => {
    const low = createGameState(1), high = structuredClone(low);
    low.macro.baseRateAnnual = 0.05; high.macro.baseRateAnnual = 0.20;
    const a = generateReturns(low, createRNG(3)), b = generateReturns(high, createRNG(3));
    expect(b.CDB100).toBeGreaterThan(a.CDB100);
    expect(b.TSELIC).toBeGreaterThan(a.TSELIC);
    expect(generateReturns(low, createRNG(999)).CDB100).toBe(a.CDB100);
  });
  it('CDB Pré preserves the 12% contract through macro and regime changes', () => {
    const s = createGameState(1);
    s.regime = 'CRISIS'; s.macro.riskIndex = 0.95; s.macro.baseRateAnnual = 0.20;
    advance(s, 252);
    expect(s.assets.CDBPRE.price).toBeCloseTo(112, 8);
  });
  it('fixed Treasury prices fall when yields rise and rise when yields fall', () => {
    const s = createGameState(1), lower = structuredClone(s);
    s.macro.baseRateAnnual += 0.02; lower.macro.baseRateAnnual -= 0.02;
    expect(generateReturns(s, createRNG(1)).TPRE).toBeLessThan(0);
    expect(generateReturns(lower, createRNG(1)).TPRE).toBeGreaterThan(0);
  });
  it('prices an actual rate-hike event through yields once, without a positive bond shock', () => {
    const s = createGameState(1);
    const events = maybeGenerateEvents(s, { ...createRNG(1), next: () => 0 });
    expect(events[0].card.type).toBe('RATE_HIKE');
    expect(events[0].card.impact.TPRE).toBeUndefined();
    applyEventMacro(s, [events[0]]);
    const returns = generateReturns(s, createRNG(1));
    expect(returns.TPRE).toBeLessThan(0);
    expect(returns.TIPCA).toBeLessThan(0);
  });
  it('IPCA updates indexed principal over calendar days and pays indexed face value', () => {
    const s = createGameState(1);
    s.assets.TIPCA.fixedIncome!.maturityDay = 1;
    const face = s.assets.TIPCA.fixedIncome!.faceValue;
    const days = calendarDaysBetween(s.calendarDate!, addBusinessDays(s.calendarDate!, 1));
    const inflation = Math.pow(1 + s.macro.inflationAnnual, days / 365);
    const r = generateReturns(s, createRNG(1));
    expect(100 * (1 + r.TIPCA)).toBeCloseTo(face * inflation, 8);
    const high = structuredClone(s); high.macro.inflationAnnual = 0.10;
    expect(generateReturns(high, createRNG(1)).TIPCA).toBeGreaterThan(r.TIPCA);
  });
  it('risk held constant does not create a recurring loss in unchanged Treasury yields', () => {
    const s = createGameState(1);
    expect(generateReturns(s, createRNG(1)).TPRE).toBeCloseTo(annualToDaily(s.assets.TPRE.fixedIncome!.issuedYield), 12);
  });
});

describe('financial dates, lots and tax', () => {
  it('skips weekends, Carnival and national market holidays', () => {
    expect(addBusinessDays('2026-01-02', 1)).toBe('2026-01-05');
    expect(addBusinessDays('2026-02-13', 1)).toBe('2026-02-18');
    expect(isBusinessDay('2026-07-09')).toBe(true);
    expect(isBusinessDay('2026-11-20')).toBe(false);
  });
  it('uses calendar month boundaries for reconciliation', () => {
    const s = createGameState(1); s.calendarDate = '2026-01-30';
    const old = taxMonth(s); advance(s);
    expect(s.calendarDate).toBe('2026-02-02'); expect(taxMonth(s)).toBe(old + 1);
  });
  it.each([[180, .225], [181, .20], [360, .20], [361, .175], [720, .175], [721, .15]])('IR uses the calendar-day boundary %s', (days, rate) => {
    const end = new Date(Date.parse('2026-01-02') + days * 86400000).toISOString().slice(0, 10);
    expect(fixedIncomeTax([lot('2026-01-02')], 110, end, false).irAmount).toBeCloseTo(10 * rate);
  });
  it('calculates each lot separately instead of averaging away IOF on a recent deposit', () => {
    const result = fixedIncomeTax([lot('2024-01-02'), lot('2026-01-01')], 110, '2026-01-02', false);
    expect(result.iofAmount).toBeCloseTo(9.6);
    expect(result.irAmount).toBeCloseTo(1.59);
    expect(result.totalTax).toBeCloseTo(11.19);
  });
  it('does not offset a profitable fixed-income lot with a losing lot', () => {
    const result = fixedIncomeTax([lot('2025-01-01', 100), lot('2025-01-02', 120)], 110, '2026-01-02', false);
    expect(result.capitalGain).toBe(0); expect(result.irAmount).toBe(1.75);
  });
  it('consumes the oldest lot and retains the cost and custody of the remainder', () => {
    const s = createGameState(1); buy(s, 'CDB100', 2); advance(s, 25); buy(s, 'CDB100', 1);
    const newer = structuredClone(s.portfolio.CDB100.fixedIncomeLots![1]);
    expect(executeSell(s, quoteSell(s, 'CDB100', 2))).toBe(true);
    expect(s.portfolio.CDB100.fixedIncomeLots).toEqual([newer]);
    expect(s.portfolio.CDB100.avgPrice).toBe(newer.unitCost);
  });
  it('uses Treasury purchase settlement dates for holding periods', () => {
    const s = createGameState(1); buy(s, 'TSELIC');
    expect(s.portfolio.TSELIC.fixedIncomeLots![0].purchaseDate).toBe('2026-01-05');
    expect(quoteSell(s, 'TSELIC', 1).canExecute).toBe(false);
    advance(s); expect(quoteSell(s, 'TSELIC', 1).canExecute).toBe(true);
  });
});

describe('contractual liquidity, maturity and custody', () => {
  it('locks CDB110 per lot for 30 calendar days without inventing an early redemption penalty', () => {
    const s = createGameState(1); buy(s, 'CDB110'); advance(s, 20);
    expect(calendarDaysBetween('2026-01-02', gameDate(s))).toBe(28);
    expect(quoteSell(s, 'CDB110', 1).canExecute).toBe(false);
    advance(s); buy(s, 'CDB110');
    expect(fixedIncomeSellCapacity(s, 'CDB110')).toBe(1);
    expect(quoteSell(s, 'CDB110', 2).canExecute).toBe(false);
    expect(quoteSell(s, 'CDB110', 1).spread).toBe(0);
  });
  it('pays CDB Pré principal and 12% interest once at its maturity, withholding IR', () => {
    const s = createGameState(1); buy(s, 'CDBPRE', 10); const initial = s.cash;
    expect(quoteSell(s, 'CDBPRE', 1).canExecute).toBe(false);
    advance(s, 252);
    expect(s.portfolio.CDBPRE).toBeUndefined();
    expect(s.cash).toBeCloseTo(initial + 1120 - 120 * .175, 7);
    const paid = s.cash; settleFixedIncomeMaturities(s); expect(s.cash).toBe(paid);
  });
  it('matures only the bank lots due today, preserving newer deposits', () => {
    const s = createGameState(1); s.assetCatalog.CDB100.fixedIncome!.termBusinessDays = 2;
    buy(s, 'CDB100'); advance(s); buy(s, 'CDB100'); advance(s);
    expect(s.portfolio.CDB100.quantity).toBe(1);
    expect(s.fixedIncomeLog!.filter(e => e.type === 'MATURITY')).toHaveLength(1);
  });
  it('pays the Treasury series then rolls its offer without automatically reinvesting', () => {
    const s = createGameState(1); s.assets.TPRE.fixedIncome!.maturityDay = 2;
    buy(s, 'TPRE'); const face = s.assets.TPRE.fixedIncome!.faceValue;
    advance(s, 2);
    expect(s.portfolio.TPRE).toBeUndefined();
    expect(s.assets.TPRE.price).toBe(100);
    expect(s.cash).toBeGreaterThan(4900);
    expect(s.fixedIncomeLog![0].amount).toBeLessThan(face);
    expect(s.assets.TPRE.fixedIncome!.maturityDay).toBe(506);
  });
  it('provisions custody only above the Selic exemption and includes it in net equity', () => {
    const s = createGameState(1); s.cash = 30000; buy(s, 'TSELIC', 200);
    advance(s); const before = computeEquity(s); const old = s.portfolio.TSELIC.fixedIncomeLots![0].custodyAccrued;
    accrueFixedIncomeCustody(s);
    const fee = s.portfolio.TSELIC.fixedIncomeLots![0].custodyAccrued - old;
    expect(fee).toBeCloseTo((s.assets.TSELIC.price * 200 - 10000) * .002 / 365);
    expect(computeEquity(s)).toBeCloseTo(before - fee);
    expect(quoteSell(s, 'TSELIC', 100).fees).toBeCloseTo(s.portfolio.TSELIC.fixedIncomeLots![0].custodyAccrued / 2);
  });
  it('does not charge Selic custody below R$10k', () => {
    const s = createGameState(1); buy(s, 'TSELIC', 20); advance(s, 10);
    expect(s.portfolio.TSELIC.fixedIncomeLots![0].custodyAccrued).toBe(0);
  });
  it('rejects debenture sales without market liquidity and settles successful sales T+1', () => {
    const s = createGameState(1); buy(s, 'DEBAA', 10);
    s.macro.riskIndex = .9; expect(quoteSell(s, 'DEBAA', 1).canExecute).toBe(false);
    s.macro.riskIndex = .35; const q = quoteSell(s, 'DEBAA', 5), before = s.cash;
    expect(executeSell(s, q)).toBe(true); expect(s.cash).toBe(before);
    expect(s.pendingSettlements![0].dueDay).toBe(1);
    advance(s); expect(s.cash).toBeCloseTo(before + q.taxBreakdown!.netAfterTax);
  });
  it('does not let split debenture orders evade the daily market depth', () => {
    const s = createGameState(1); s.cash = 500000; buy(s, 'DEBAA', 2000);
    const capacity = fixedIncomeSellCapacity(s, 'DEBAA');
    expect(executeSell(s, quoteSell(s, 'DEBAA', capacity))).toBe(true);
    expect(quoteSell(s, 'DEBAA', 1).canExecute).toBe(false);
    advance(s); expect(quoteSell(s, 'DEBAA', 1).canExecute).toBe(true);
  });
});

describe('issuer failures, guarantees and migration', () => {
  it('rejects a previously executable fixed-income quote after trading is halted', () => {
    const s = createGameState(1); buy(s, 'CDB100', 10);
    const q = quoteSell(s, 'CDB100', 1);
    expect(q.canExecute).toBe(true);
    s.assets.CDB100.haltedUntilDay = 5;
    const before = structuredClone(s);
    expect(executeSell(s, q)).toBe(false);
    expect(s).toEqual(before);
  });
  it('releases a migrated credit-watch liquidity block when its original window expires', () => {
    const s = createGameState(1); buy(s, 'DEBAA', 10);
    s.credit.watch.DEBAA = { enteredDay: 0, windowDays: 5, defaulted: false };
    const rng = { ...createRNG(1), next: () => 1 };
    s.dayIndex = 4; processFixedIncomeCredit(s, rng);
    expect(fixedIncomeSellCapacity(s, 'DEBAA')).toBe(0);
    s.dayIndex = 5; processFixedIncomeCredit(s, rng);
    expect(s.credit.watch.DEBAA).toBeUndefined();
    expect(fixedIncomeSellCapacity(s, 'DEBAA')).toBe(10);
  });
  it('aggregates bank products under one FGC limit and delays payouts', () => {
    const s = createGameState(1); s.cash = 400000; buy(s, 'CDB100', 2000); buy(s, 'CDBPRE', 1000);
    const beforeCash = s.cash;
    defaultFixedIncomeIssuer(s, s.assetCatalog.CDB100.fixedIncome!.issuer, 0.4);
    expect(s.cash).toBe(beforeCash);
    expect(s.fgcHistory![0].amount).toBe(250000);
    expect(computeEquity(s)).toBeCloseTo(beforeCash + 270000);
    expect(s.portfolio.CDB100).toBeUndefined(); expect(s.portfolio.CDBPRE).toBeUndefined();
    expect(quoteBuy(s, 'CDB100', 1).canExecute).toBe(false);
    expect(s.pendingSettlements!.filter(p => p.dueDay === 60).reduce((sum, p) => sum + p.amount, 0)).toBe(250000);
    const before = structuredClone(s); defaultFixedIncomeIssuer(s, s.assetCatalog.CDB100.fixedIncome!.issuer, .4); expect(s).toEqual(before);
  });
  it('honors the remaining global FGC cap and resets it after the four-year window', () => {
    const s = createGameState(1); s.cash = 300000; buy(s, 'CDB110', 2000);
    s.fgcWindowStart = '2025-01-01'; s.fgcHistory = [{ date: '2025-01-01', amount: 950000 }];
    defaultFixedIncomeIssuer(s, s.assetCatalog.CDB110.fixedIncome!.issuer, 0);
    expect(s.fgcHistory![1].amount).toBe(50000);
    s.calendarDate = '2029-01-02'; buy(s, 'CDB100', 100);
    defaultFixedIncomeIssuer(s, s.assetCatalog.CDB100.fixedIncome!.issuer, 0);
    expect(s.fgcHistory).toEqual([{ date: '2029-01-02', amount: 10000 }]);
  });
  it('does not give debentures FGC coverage or restart their accrual after default', () => {
    const s = createGameState(1); buy(s, 'DEBAA', 10);
    defaultFixedIncomeIssuer(s, s.assetCatalog.DEBAA.fixedIncome!.issuer, 0.5);
    expect(s.fgcHistory).toEqual([]); expect(s.fgcWindowStart).toBeUndefined();
    expect(s.pendingSettlements![0].amount).toBe(500);
    advance(s, 8); expect(s.assets.DEBAA.price).toBe(0);
  });
  it('round-trips lots, instrument values, custody and pending settlements', () => {
    const s = createGameState(1); buy(s, 'TPRE', 2); buy(s, 'DEBAA', 2); advance(s, 3);
    executeSell(s, quoteSell(s, 'DEBAA', 1));
    expect(saveGame(s).ok).toBe(true);
    const loaded = loadGame()!;
    expect(loaded.portfolio).toEqual(s.portfolio);
    expect(loaded.assets).toEqual(s.assets);
    expect(loaded.pendingSettlements).toEqual(s.pendingSettlements);
    expect(loaded.calendarDate).toBe(s.calendarDate);
  });
  it('migrates old holdings without changing equity, cost or monthly exemption usage', () => {
    const s = createGameState(1); s.dayIndex = 100; delete s.calendarDate;
    for (const def of Object.values(s.assetCatalog)) delete def.fixedIncome;
    for (const asset of Object.values(s.assets)) delete asset.fixedIncome;
    s.portfolio.CDB100 = { quantity: 10, avgPrice: 95, avgPurchaseDay: 50 };
    s.taxState = { totalIRPaid: 10, totalIOFPaid: 5, accumulatedLosses: {}, monthlySales: { 3: 19900 }, monthlySalesByCategory: { 3: { STOCK: 19900 } } };
    const before = computeEquity(s); initializeFixedIncome(s, true);
    expect(computeEquity(s)).toBe(before); expect(s.portfolio.CDB100.avgPrice).toBe(95);
    expect(calendarDaysBetween(s.portfolio.CDB100.fixedIncomeLots![0].purchaseDate, gameDate(s))).toBe(50);
    expect(s.taxState.monthlySalesByCategory![taxMonth(s)].STOCK).toBe(19900);
    expect(s.fixedIncomeMigrationDay).toBe(100);
  });

  it('rejects inconsistent lot totals instead of saving a corrupt v2 position', () => {
    const s = createGameState(1); buy(s, 'CDB100');
    expect(saveGame(s).ok).toBe(true);
    const original = localStorage.getItem('patrimonio_save');
    s.portfolio.CDB100.fixedIncomeLots![0].quantity = 2;
    expect(saveGame(s).ok).toBe(false);
    expect(localStorage.getItem('patrimonio_save')).toBe(original);
  });
  it('loads v1 holdings through the real persistence migration without losing value', () => {
    const s = createGameState(1); s.saveVersion = 1; delete s.calendarDate;
    for (const def of Object.values(s.assetCatalog)) delete def.fixedIncome;
    for (const asset of Object.values(s.assets)) delete asset.fixedIncome;
    s.dayIndex = 50; s.portfolio.TIPCA = { quantity: 2, avgPrice: 90, avgPurchaseDay: 10 };
    localStorage.setItem('patrimonio_save', JSON.stringify(s));
    const loaded = loadGame()!;
    expect(loaded.saveVersion).toBe(2);
    expect(computeEquity(loaded)).toBe(computeEquity(s));
    expect(loaded.portfolio.TIPCA.avgPrice).toBe(90);
    expect(loaded.fixedIncomeMigrationDay).toBe(50);
    expect(saveGame(loaded).ok).toBe(true);
  });

  it('integrates dates, effective CDI, custody and maturities in the real daily pipeline', () => {
    const s = createGameState(777); s.assetCatalog.CDBPRE.fixedIncome!.termBusinessDays = 1; buy(s, 'CDBPRE', 1);
    const next = simulateDay(s).state;
    expect(next.calendarDate).toBe('2026-01-05');
    expect(next.portfolio.CDBPRE).toBeUndefined();
    expect(next.history.cdiAccumulated[1] / next.history.cdiAccumulated[0] - 1).toBeCloseTo(annualToDaily(next.macro.baseRateAnnual - .001), 12);
    expect(next.history.equity[1]).toBeCloseTo(computeEquity(next));
  });
});
