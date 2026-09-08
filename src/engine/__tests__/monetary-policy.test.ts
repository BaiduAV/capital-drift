import { afterEach, describe, expect, it } from 'vitest';
import { createGameState } from '../init';
import { createRNG } from '../rng';
import { addBusinessDays, gameDate } from '../financialCalendar';
import { updateMacro } from '../macro';
import { initializeMonetaryPolicy, policyDates, nextPolicyDate, updateMonetaryPolicy, inflationAccrualFactor } from '../monetaryPolicy';
import { applyEventMacro, maybeGenerateEvents } from '../events';
import { generateReturns } from '../pricing';
import { simulateDay } from '../simulateDay';
import { loadGame, saveGame } from '../persistence';
import { computeEquity } from '../invariants';
import type { GameState, PersistentEvent } from '../types';

const quiet = () => ({ ...createRNG(1), nextGaussian: () => 0 });
function advance(s: GameState, days = 1) {
  const events = [];
  for (let i = 0; i < days; i++) {
    events.push(...updateMonetaryPolicy(s, quiet()));
    s.calendarDate = addBusinessDays(gameDate(s), 1); s.dayIndex++;
  }
  return events;
}
function initial(inflation: number, rate = .11) {
  const s = createGameState(1); s.macro.inflationAnnual = inflation; s.macro.baseRateAnnual = rate;
  delete s.macro.dynamics; initializeMonetaryPolicy(s); return s;
}
afterEach(() => localStorage.clear());

describe('scheduled monetary policy', () => {
  it('uses the published calendars and rolls into a future illustrative calendar', () => {
    expect(policyDates(2026)).toEqual(['2026-01-28','2026-03-18','2026-04-29','2026-06-17','2026-08-05','2026-09-16','2026-11-04','2026-12-09']);
    expect(policyDates(2027)).toHaveLength(8);
    expect(nextPolicyDate('2026-12-09')).toBe('2027-01-27');
    expect(nextPolicyDate('2027-12-08')).toBe(policyDates(2028)[0]);
  });
  it('announces a bounded policy move at close, effective only next business day', () => {
    const s = initial(.10); s.calendarDate = '2026-01-27';
    const old = s.macro.baseRateAnnual;
    const events = advance(s);
    expect(events.find(e => e.type === 'RATE_HIKE')).toBeDefined();
    expect(s.macro.baseRateAnnual).toBe(old);
    expect(s.macro.dynamics!.pendingPolicy).toEqual({ rate: .12, effectiveDate: '2026-01-29' });
    const returns = generateReturns(s, createRNG(1));
    expect(returns.CDB100).toBeCloseTo(Math.pow(1 + old - .001, 1 / 252) - 1, 12);
    advance(s);
    expect(s.macro.baseRateAnnual).toBe(.12);
    expect(s.macro.dynamics!.pendingPolicy).toBeUndefined();
  });
  it('keeps Selic constant between decisions throughout a simulated year', () => {
    const s = initial(.045), decisions = [];
    while (gameDate(s) < '2026-12-30') {
      const old = s.macro.baseRateAnnual, effective = s.macro.dynamics!.pendingPolicy?.effectiveDate;
      decisions.push(...advance(s).filter(e => e.type.startsWith('RATE_')));
      if (s.macro.baseRateAnnual !== old) {
        expect(gameDate(s)).toBe(effective);
        expect(Math.abs(s.macro.baseRateAnnual - old)).toBeLessThanOrEqual(.010000001);
      }
    }
    expect(decisions).toHaveLength(8);
  });
  it('does not draw random policy decisions or let fiscal news change the current target', () => {
    const s = createGameState(1), old = s.macro.baseRateAnnual;
    const fiscal: PersistentEvent = { id: 'fiscal', startedAtDay: 0, durationDays: 1,
      card: { type: 'FISCAL_STRESS', titleKey: '', descriptionKey: '', impact: {}, magnitude: .005, macroImpact: { baseRateDelta: .005 } } };
    applyEventMacro(s, [fiscal]);
    expect(s.macro.baseRateAnnual).toBe(old);
    expect(generateReturns(s, createRNG(1)).TPRE).toBeLessThan(0);
    for (let seed = 1; seed <= 100; seed++) {
      expect(maybeGenerateEvents(s, createRNG(seed)).some(e => e.card.type.startsWith('RATE_'))).toBe(false);
    }
  });
});

describe('monthly inflation and delayed transmission', () => {
  it('allocates a weekend crossing month-end to the correct calendar months', () => {
    const s = initial(.03, 1.03 * 1.04 - 1);
    while (gameDate(s) < '2026-02-02') advance(s);
    const d = s.macro.dynamics!;
    expect(d.inflationMonths[11]).toBeCloseTo(Math.pow(1.03, 31 / 365) - 1, 12);
    expect(d.inflationMonthFactor).toBeCloseTo(Math.pow(1.03, 1 / 365), 12);
    expect(d.inflationStep!.factor).toBeCloseTo(Math.pow(1.03, 3 / 365), 12);
  });
  it('still allows a persistent supply shock to raise inflation relative to calm', () => {
    const calm = initial(.03, 1.03 * 1.04 - 1), crisis = structuredClone(calm);
    crisis.regime = 'CRISIS';
    advance(calm, 252); advance(crisis, 252);
    expect(crisis.macro.inflationAnnual).toBeGreaterThan(calm.macro.inflationAnnual + .005);
  });
  it('publishes only at month boundaries and compounds the last 12 observations', () => {
    const s = initial(.045), old = s.macro.inflationAnnual;
    advance(s, 10); expect(s.macro.inflationAnnual).toBe(old);
    while (gameDate(s) < '2026-02-02') advance(s);
    const d = s.macro.dynamics!;
    expect(d.inflationReferenceMonth).toBe('2026-01');
    expect(d.estimatedHistoryMonths).toBe(11);
    expect(s.macro.inflationAnnual).toBeCloseTo(d.inflationMonths.reduce((acc, r) => acc * (1 + r), 1) - 1, 12);
    const monthly = d.inflationMonths[11]; advance(s, 10);
    expect(d.inflationMonths[11]).toBe(monthly);
  });
  it('allows monthly deflation without imposing an artificial zero floor', () => {
    const s = initial(-.01, .02);
    while (gameDate(s) < '2026-02-02') advance(s);
    expect(s.macro.dynamics!.inflationMonths[11]).toBeLessThan(0);
  });
  it('does not rewrite already reported inflation after a news shock', () => {
    const s = initial(.045), before = structuredClone(s.macro.dynamics!.inflationMonths);
    applyEventMacro(s, [{ id: 'inflation', startedAtDay: 0, durationDays: 1,
      card: { type: 'INFLATION_UP', titleKey: '', descriptionKey: '', impact: {}, magnitude: .002, macroImpact: { inflationDelta: .002 } } }]);
    expect(s.macro.inflationAnnual).toBe(.045);
    expect(s.macro.dynamics!.inflationMonths).toEqual(before);
    expect(s.macro.dynamics!.inflationExpectationAnnual).toBeCloseTo(.047);
  });
  it('disinflates gradually after a crisis rather than keeping 12% forever in calm', () => {
    const s = initial(.12);
    advance(s); expect(s.macro.inflationAnnual).toBe(.12);
    advance(s, 503);
    expect(s.macro.inflationAnnual).toBeLessThan(.06);
    expect(s.macro.inflationAnnual).toBeGreaterThan(0);
    expect(s.macro.dynamics!.estimatedHistoryMonths).toBe(0);
  });
  it('passes higher real rates through a lag, with stronger effects over time', () => {
    const low = initial(.045, .08), high = structuredClone(low);
    high.macro.baseRateAnnual = .18;
    low.macro.dynamics!.nextPolicyDate = high.macro.dynamics!.nextPolicyDate = '2030-01-01';
    advance(low); advance(high);
    const firstGap = low.macro.dynamics!.inflationExpectationAnnual - high.macro.dynamics!.inflationExpectationAnnual;
    expect(firstGap).toBeGreaterThan(0); expect(firstGap).toBeLessThan(.0001);
    advance(low, 125); advance(high, 125);
    expect(low.macro.dynamics!.inflationExpectationAnnual - high.macro.dynamics!.inflationExpectationAnnual).toBeGreaterThan(firstGap * 10);
  });
  it('uses the same daily price factor for IPCA bonds and purchasing power', () => {
    const s = createGameState(777), before = s.assets.TIPCA.fixedIncome!.inflationFactor;
    const next = simulateDay(s).state, factor = next.macro.dynamics!.inflationStep!.factor;
    expect(next.assets.TIPCA.fixedIncome!.inflationFactor / before).toBeCloseTo(factor, 12);
    expect(next.history.inflationAccumulated![1]).toBeCloseTo(factor, 12);
    expect(next.macro.dynamics!.inflationStep!.to).toBe('2026-01-05');
  });
  it('produces no random daily Selic changes in the full macro updater', () => {
    const s = initial(.045), rng = createRNG(5);
    for (let i = 0; i < 10; i++) {
      updateMacro(s, rng); expect(s.macro.baseRateAnnual).toBe(.11);
      expect(inflationAccrualFactor(s)).toBeGreaterThan(1);
      s.calendarDate = addBusinessDays(gameDate(s), 1); s.dayIndex++;
    }
  });
});

describe('monetary save migration', () => {
  it('preserves old wealth, rates and history while marking synthesized monthly history', () => {
    const s = initial(.10); delete s.macro.dynamics; s.saveVersion = 2;
    const before = computeEquity(s), history = structuredClone(s.history);
    localStorage.setItem('patrimonio_save', JSON.stringify(s));
    const loaded = loadGame()!;
    expect(loaded.saveVersion).toBe(3); expect(computeEquity(loaded)).toBe(before);
    expect(loaded.history).toEqual(history); expect(loaded.macro.inflationAnnual).toBe(.10);
    expect(loaded.macro.baseRateAnnual).toBe(.11); expect(loaded.macro.dynamics!.estimatedHistoryMonths).toBe(12);
    expect(saveGame(loaded).ok).toBe(true);
  });
  it('retains a pending decision and monthly accumulation through save/load', () => {
    const s = initial(.10); s.calendarDate = '2026-01-27'; advance(s);
    expect(saveGame(s).ok).toBe(true);
    const loaded = loadGame()!;
    expect(loaded.macro.dynamics).toEqual(s.macro.dynamics);
    expect(simulateDay(loaded).state).toEqual(simulateDay(s).state);
  });
  it('rejects a corrupted rolling inflation series without overwriting a good save', () => {
    const s = initial(.045); expect(saveGame(s).ok).toBe(true);
    const before = localStorage.getItem('patrimonio_save');
    s.macro.dynamics!.inflationMonths[0] = .50;
    expect(saveGame(s).ok).toBe(false); expect(localStorage.getItem('patrimonio_save')).toBe(before);
  });
});
