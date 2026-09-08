import { afterEach, describe, expect, it } from 'vitest';
import { createGameState } from '../init';
import { createRNG } from '../rng';
import { applyReturnsToPrices, generateReturns } from '../pricing';
import { currentYieldCurves, interpolatedYield, updateYieldCurves } from '../yieldCurves';
import { fixedIncomeOfferRate, projectFixedIncome, settleFixedIncomeMaturities, defaultFixedIncomeIssuer } from '../fixedIncome';
import { addBusinessDays } from '../financialCalendar';
import { quoteBuy, executeBuy } from '../trading';
import { positionMarketValue, positionUnitValue } from '../valuation';
import { computeEquity } from '../invariants';
import { loadGame, loadGameResult, saveGame } from '../persistence';
import { saveSchema } from '../saveSchema';
import { simulateDay } from '../simulateDay';
import type { GameState } from '../types';

afterEach(() => localStorage.clear());
const buy = (s: GameState, id = 'CDBPRE', quantity = 1) => expect(executeBuy(s, quoteBuy(s, id, quantity))).toBe(true);
function advance(s: GameState, days = 1) {
  for (let i = 0; i < days; i++) {
    updateYieldCurves(s);
    applyReturnsToPrices(s, generateReturns(s, createRNG(i)));
    s.dayIndex++;
    s.calendarDate = addBusinessDays(s.calendarDate!, 1);
    settleFixedIncomeMaturities(s);
  }
}

describe('term structure and independent real yields', () => {
  it('interpolates discount factors and handles endpoints and negative real yields', () => {
    const points = [{ businessDays: 252, annualRate: .1 }, { businessDays: 504, annualRate: .2 }];
    const rate = interpolatedYield(points, 378);
    expect((1 + rate) ** (-378 / 252)).toBeCloseTo(Math.sqrt(1 / 1.1 * 1 / 1.2 ** 2), 12);
    expect(interpolatedYield(points, 0)).toBe(.1);
    expect(interpolatedYield(points, 1000)).toBe(.2);
    expect(interpolatedYield([{ businessDays: 252, annualRate: -.01 }], 126)).toBe(-.01);
  });
  it('nominal and real curve shocks price only the matching Treasury cash flows', () => {
    const s = createGameState(1), nominal = structuredClone(s), real = structuredClone(s);
    nominal.yieldCurves!.nominal.forEach(p => { p.annualRate += .01; });
    real.yieldCurves!.real.forEach(p => { p.annualRate += .01; });
    expect(projectFixedIncome(nominal, 'TPRE').price).toBeLessThan(projectFixedIncome(s, 'TPRE').price);
    expect(projectFixedIncome(nominal, 'TIPCA').price).toBe(projectFixedIncome(s, 'TIPCA').price);
    expect(projectFixedIncome(real, 'TIPCA').price).toBeLessThan(projectFixedIncome(s, 'TIPCA').price);
    expect(projectFixedIncome(real, 'TPRE').price).toBe(projectFixedIncome(s, 'TPRE').price);
  });
  it('higher expected inflation does not mechanically cut real yields and boost long IPCA+', () => {
    const s = createGameState(1), higher = structuredClone(s);
    higher.macro.dynamics!.inflationExpectationAnnual += .01;
    expect(currentYieldCurves(higher).real[4].annualRate).toBeGreaterThan(currentYieldCurves(s).real[4].annualRate);
    expect(projectFixedIncome(higher, 'TIPCA').price).toBeLessThan(projectFixedIncome(s, 'TIPCA').price);
  });
  it('uses remaining tenor, with a larger price impact on a longer cash flow', () => {
    const s = createGameState(1), longer = structuredClone(s);
    s.assets.TPRE.fixedIncome!.maturityDay = 253;
    longer.assets.TPRE.fixedIncome!.maturityDay = 1261;
    const shock = (base: GameState) => {
      const changed = structuredClone(base);
      changed.yieldCurves!.nominal.forEach(p => { p.annualRate += .01; });
      return projectFixedIncome(changed, 'TPRE').price / projectFixedIncome(base, 'TPRE').price - 1;
    };
    expect(shock(longer)).toBeLessThan(shock(s));
    expect(projectFixedIncome(s, 'TPRE').instrument.marketYield).toBeCloseTo(s.yieldCurves!.nominal[2].annualRate, 12);
  });
  it('announcements affect curves once and do not change effective CDI before the policy date', () => {
    const s = createGameState(1), cdi = projectFixedIncome(s, 'CDB100').price;
    s.macro.dynamics!.pendingPolicy = { rate: .13, effectiveDate: '2026-01-05' };
    const projected = currentYieldCurves(s);
    expect(projected.nominal[0].annualRate - s.yieldCurves!.nominal[0].annualRate).toBeCloseTo(.02, 12);
    expect(projected.nominal[5].annualRate - s.yieldCurves!.nominal[5].annualRate).toBeCloseTo(.006, 12);
    expect(projectFixedIncome(s, 'CDB100').price).toBe(cdi);
    updateYieldCurves(s); updateYieldCurves(s);
    expect(s.yieldCurves).toEqual(projected);
    s.macro.baseRateAnnual = .13; delete s.macro.dynamics!.pendingPolicy;
    expect(currentYieldCurves(s)).toEqual(projected);
    expect(projectFixedIncome(s, 'CDB100').price).toBeGreaterThan(cdi);
  });
});

describe('Tesouro Selic premium and discount', () => {
  it('separates daily Selic accrual from market discount risk', () => {
    const s = createGameState(1), changed = structuredClone(s);
    changed.yieldCurves!.selicSpread.forEach(p => { p.annualRate = .01; });
    const normal = projectFixedIncome(s, 'TSELIC'), stressed = projectFixedIncome(changed, 'TSELIC');
    expect(stressed.instrument.bookValue).toBe(normal.instrument.bookValue);
    expect(stressed.price).toBeCloseTo(stressed.instrument.bookValue / 1.01 ** (755 / 252), 10);
    expect(stressed.price).toBeLessThan(s.assets.TSELIC.price);
  });
  it('a negative quoted spread produces a premium above updated nominal', () => {
    const s = createGameState(1);
    s.yieldCurves!.selicSpread.forEach(p => { p.annualRate = -.001; });
    const next = projectFixedIncome(s, 'TSELIC');
    expect(next.price).toBeGreaterThan(next.instrument.bookValue);
    expect(next.price).toBeCloseTo(next.instrument.bookValue / .999 ** (755 / 252), 10);
  });
  it('discount vanishes at maturity, which pays updated nominal once and rolls the offer', () => {
    const s = createGameState(1); buy(s, 'TSELIC');
    s.assets.TSELIC.fixedIncome!.maturityDay = 2;
    s.portfolio.TSELIC.fixedIncomeLots![0].maturityDay = 2;
    s.yieldCurves!.selicSpread.forEach(p => { p.annualRate = .02; });
    advance(s);
    const final = projectFixedIncome(s, 'TSELIC');
    expect(final.price).toBe(final.instrument.bookValue);
    advance(s);
    expect(s.portfolio.TSELIC).toBeUndefined();
    const paid = s.cash; settleFixedIncomeMaturities(s); expect(s.cash).toBe(paid);
    expect(s.assets.TSELIC.price).toBe(100);
    expect(s.assets.TSELIC.fixedIncome!.bookValue).toBeGreaterThan(100);
  });
});

describe('fixed CDB deposits retain their own rates and balances', () => {
  it('new offers move, old balances keep their rates, and each maturity withholds its own IR', () => {
    const s = createGameState(1); buy(s);
    advance(s, 126);
    const before = positionMarketValue(s, 'CDBPRE');
    s.yieldCurves!.nominal.forEach(p => { p.annualRate += .02; });
    expect(fixedIncomeOfferRate(s, 'CDBPRE')).toBe(.14);
    expect(positionMarketValue(s, 'CDBPRE')).toBe(before);
    buy(s, 'CDBPRE', 2);
    advance(s, 126);
    expect(s.portfolio.CDBPRE.quantity).toBe(2);
    expect(s.portfolio.CDBPRE.fixedIncomeLots![0].fixedAnnualRate).toBe(.14);
    expect(s.cash).toBeCloseTo(4700 + 112 - 12 * .175, 8);
    expect(positionMarketValue(s, 'CDBPRE')).toBeCloseTo(200 * Math.sqrt(1.14), 8);
    expect(positionUnitValue(s, 'CDBPRE')).toBeCloseTo(100 * Math.sqrt(1.14), 8);
    expect(computeEquity(s)).toBeCloseTo(s.cash + 200 * Math.sqrt(1.14), 8);
    advance(s, 126);
    expect(s.portfolio.CDBPRE).toBeUndefined();
    expect(s.cash).toBeCloseTo(4700 + 112 - 12 * .175 + 228 - 28 * .175, 8);
    expect(s.taxState!.totalIRPaid).toBeCloseTo(40 * .175, 8);
  });
  it('rejects a stale offer even when the principal unit price and total cost are unchanged', () => {
    const s = createGameState(1), quote = quoteBuy(s, 'CDBPRE', 1);
    s.yieldCurves!.nominal.forEach(p => { p.annualRate += .01; });
    expect(quoteBuy(s, 'CDBPRE', 1).totalCost).toBe(quote.totalCost);
    expect(executeBuy(s, quote)).toBe(false);
    expect(s.cash).toBe(5000);
    expect(s.portfolio.CDBPRE).toBeUndefined();
  });
  it('FGC uses every deposit balance, freezes accrual and preserves the net receivable in equity', () => {
    const s = createGameState(1); buy(s); advance(s, 126);
    const gross = 100 * Math.sqrt(1.12);
    defaultFixedIncomeIssuer(s, s.assetCatalog.CDBPRE.fixedIncome!.issuer, .4);
    expect(s.fgcHistory![0].amount).toBeCloseTo(gross, 8);
    expect(s.pendingSettlements![0].amount).toBeCloseTo(gross - (gross - 100) * .2, 8);
    expect(computeEquity(s)).toBeCloseTo(4900 + gross - (gross - 100) * .2, 8);
    const receivables = structuredClone(s.pendingSettlements); advance(s, 10);
    expect(s.pendingSettlements).toEqual(receivables);
  });
});

describe('save v4 and daily integration', () => {
  it('migrates v3 without changing prices, promised flows, costs, or wealth', () => {
    const s = createGameState(1); buy(s); buy(s, 'TIPCA'); buy(s, 'TPRE'); buy(s, 'TSELIC');
    advance(s, 50); s.saveVersion = 3; delete s.yieldCurves;
    s.assets.CDBPRE.price = 119; s.assets.CDBPRE.fixedIncome!.bookValue = 119;
    const oldLot = s.portfolio.CDBPRE.fixedIncomeLots![0];
    delete oldLot.fixedAnnualRate; delete oldLot.bookUnitValue; delete oldLot.valuationDay;
    for (const id of ['TIPCA', 'TPRE', 'TSELIC']) delete s.assets[id].fixedIncome!.curveYieldAdjustment;
    const wealth = computeEquity(s), prices = Object.values(s.assets).map(a => a.price);
    localStorage.setItem('patrimonio_save', JSON.stringify(s));
    const loaded = loadGame()!;
    expect(loaded.saveVersion).toBe(4);
    expect(computeEquity(loaded)).toBe(wealth);
    expect(Object.values(loaded.assets).map(a => a.price)).toEqual(prices);
    const lot = loaded.portfolio.CDBPRE.fixedIncomeLots![0];
    expect(lot.fixedAnnualRate).toBe(.12); expect(lot.unitCost).toBe(100); expect(lot.bookUnitValue).toBe(119);
    for (const id of ['TIPCA', 'TPRE', 'TSELIC']) {
      const a = loaded.assets[id], instrument = a.fixedIncome!;
      expect(instrument.faceValue).toBe(s.assets[id].fixedIncome!.faceValue);
      expect(instrument.bookValue).toBe(s.assets[id].fixedIncome!.bookValue);
      const payoff = id === 'TSELIC' ? instrument.bookValue : instrument.faceValue * (id === 'TIPCA' ? instrument.inflationFactor : 1);
      expect(payoff / (1 + instrument.marketYield) ** ((instrument.maturityDay - loaded.dayIndex) / 252)).toBeCloseTo(a.price, 8);
    }
    advance(loaded);
    expect(lot.bookUnitValue).toBeCloseTo(119 * 1.12 ** (1 / 252), 8);
    expect(saveGame(loaded).ok).toBe(true);
    expect(loadGame()!.yieldCurves).toEqual(loaded.yieldCurves);
    expect(loadGame()!.portfolio).toEqual(loaded.portfolio);
  });
  it('rejects missing lot contracts and malformed curve tenors without overwriting the save', () => {
    const s = createGameState(1); buy(s); expect(saveGame(s).ok).toBe(true);
    const raw = localStorage.getItem('patrimonio_save');
    delete s.portfolio.CDBPRE.fixedIncomeLots![0].bookUnitValue;
    expect(saveGame(s).ok).toBe(false);
    expect(localStorage.getItem('patrimonio_save')).toBe(raw);
    const corrupt = JSON.parse(raw!); corrupt.yieldCurves.real[1].businessDays = 21;
    localStorage.removeItem('patrimonio_save_backup');
    localStorage.setItem('patrimonio_save', JSON.stringify(corrupt));
    expect(loadGameResult().status).toBe('blocked');
  });
  it('keeps curves and mixed deposits valid through daily accounting and save reloads', () => {
    let s = createGameState(777); buy(s); buy(s, 'TIPCA'); buy(s, 'TSELIC'); buy(s, 'DEBAA');
    for (let day = 0; day < 280; day++) {
      if (day === 100) buy(s);
      s = simulateDay(s).state;
      expect(saveSchema.safeParse(s).success, `day ${day}`).toBe(true);
      expect(s.history.equity.at(-1)).toBeCloseTo(computeEquity(s), 8);
      if (day === 150) { expect(saveGame(s).ok).toBe(true); s = loadGame()!; }
    }
    expect(s.portfolio.CDBPRE.quantity).toBe(1);
    expect(positionMarketValue(s, 'CDBPRE')).toBeGreaterThan(100);
  });
});
