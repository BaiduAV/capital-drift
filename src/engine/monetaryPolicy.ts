import type { GameState, EventCard } from './types';
import type { RNG } from './rng';
import { gameDate, addBusinessDays, addCalendarDays, isBusinessDay, calendarDaysBetween } from './financialCalendar';

// BCB calendars; subsequent years use an explicitly illustrative eight-meeting schedule.
const POLICY_DATES: Record<number, string[]> = {
  2026: ['01-28', '03-18', '04-29', '06-17', '08-05', '09-16', '11-04', '12-09'],
  2027: ['01-27', '03-17', '04-28', '06-16', '08-04', '09-22', '10-27', '12-08'],
};
export const MONETARY = {
  inflationTarget: .03, neutralRealRate: .04, inflationPersistenceDays: 126,
  transmissionDays: 126, expectationDailyVol: .00005, policyStep: .0025, maxPolicyMove: .01,
  // Scenario parameters, not an estimated structural model or a forecast.
  supplyPressure: { CALM: 0, BULL: .002, BEAR: .006, CRISIS: .02, CRYPTO_EUPHORIA: .004 },
};
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
export function policyDates(year: number): string[] {
  return (POLICY_DATES[year] ?? POLICY_DATES[2027]).map(md => {
    let date = `${year}-${md}`;
    while (!isBusinessDay(date)) date = addCalendarDays(date, 1);
    return date;
  });
}
export function nextPolicyDate(after: string): string {
  const year = Number(after.slice(0, 4));
  return [...policyDates(year), ...policyDates(year + 1)].find(d => d > after)!;
}
export function initializeMonetaryPolicy(state: GameState): void {
  if (state.macro.dynamics) return;
  const date = gameDate(state), annual = state.macro.inflationAnnual;
  const monthly = Math.expm1(Math.log1p(annual) / 12);
  state.macro.dynamics = {
    inflationExpectationAnnual: annual,
    laggedRealRate: (1 + state.macro.baseRateAnnual) / (1 + annual) - 1,
    policyExpectationAdjustment: 0, nextPolicyDate: nextPolicyDate(date),
    inflationMonths: Array(12).fill(monthly), estimatedHistoryMonths: 12,
    inflationReferenceMonth: addCalendarDays(date.slice(0, 7) + '-01', -1).slice(0, 7),
    inflationCurrentMonth: date.slice(0, 7),
    // Seed only the unobserved portion of the current month; preserve existing wealth/history.
    inflationMonthFactor: Math.pow(1 + annual, (Number(date.slice(8)) - 1) / 365),
  };
}
export const expectedInflation = (s: GameState) => s.macro.dynamics?.inflationExpectationAnnual ?? s.macro.inflationAnnual;
export const expectedPolicyRate = (s: GameState) => {
  const d = s.macro.dynamics;
  return clamp((d?.pendingPolicy?.rate ?? s.macro.baseRateAnnual) + (d?.policyExpectationAdjustment ?? 0), .02, .20);
};
export function inflationAccrualFactor(state: GameState): number {
  const from = gameDate(state), to = addBusinessDays(from, 1), step = state.macro.dynamics?.inflationStep;
  if (step?.from === from && step.to === to) return step.factor;
  return Math.pow(1 + expectedInflation(state), calendarDaysBetween(from, to) / 365);
}

/** One business-day transition. Decisions are announced at close and effective next session. */
export function updateMonetaryPolicy(state: GameState, rng: RNG): EventCard[] {
  initializeMonetaryPolicy(state);
  const macro = state.macro, d = macro.dynamics!, from = gameDate(state), to = addBusinessDays(from, 1);
  const events: EventCard[] = [];
  if (d.pendingPolicy && d.pendingPolicy.effectiveDate <= to) {
    macro.baseRateAnnual = d.pendingPolicy.rate;
    delete d.pendingPolicy;
  }
  // Monetary transmission is gradual: today's rate does not instantly reverse inflation.
  const realRate = (1 + macro.baseRateAnnual) / (1 + d.inflationExpectationAnnual) - 1;
  d.laggedRealRate += (realRate - d.laggedRealRate) * -Math.expm1(-1 / MONETARY.transmissionDays);
  const anchor = clamp(MONETARY.inflationTarget + MONETARY.supplyPressure[state.regime]
    + .3 * (macro.activityAnnual - .02) - .25 * (d.laggedRealRate - MONETARY.neutralRealRate), -.02, .15);
  d.inflationExpectationAnnual = clamp(d.inflationExpectationAnnual
    + (anchor - d.inflationExpectationAnnual) * -Math.expm1(-1 / MONETARY.inflationPersistenceDays)
    + rng.nextGaussian() * MONETARY.expectationDailyVol, -.02, .15);
  d.policyExpectationAdjustment *= Math.exp(-1 / 63);

  // Calendar-day price accrual and monthly observations use exactly the same factors.
  const dailyFactor = Math.pow(1 + d.inflationExpectationAnnual, 1 / 365);
  let factor = 1;
  for (let date = from; date < to; date = addCalendarDays(date, 1)) {
    d.inflationMonthFactor *= dailyFactor; factor *= dailyFactor;
    if (addCalendarDays(date, 1).slice(0, 7) !== d.inflationCurrentMonth) {
      const monthly = d.inflationMonthFactor - 1;
      d.inflationMonths = [...d.inflationMonths.slice(-11), monthly];
      macro.inflationAnnual = d.inflationMonths.reduce((acc, r) => acc * (1 + r), 1) - 1;
      d.inflationReferenceMonth = d.inflationCurrentMonth;
      d.inflationCurrentMonth = addCalendarDays(date, 1).slice(0, 7);
      d.inflationMonthFactor = 1;
      d.estimatedHistoryMonths = Math.max(0, d.estimatedHistoryMonths - 1);
      events.push({ type: 'INFLATION_RELEASE', titleKey: 'event.inflation_release.title', descriptionKey: 'event.inflation_release.desc',
        impact: {}, magnitude: Math.abs(monthly), vars: { month: d.inflationReferenceMonth, monthly: (monthly * 100).toFixed(2), annual: (macro.inflationAnnual * 100).toFixed(2) } });
    }
  }
  d.inflationStep = { from, to, factor };

  if (d.nextPolicyDate <= to) {
    const desired = clamp(MONETARY.neutralRealRate + d.inflationExpectationAnnual
      + 1.5 * (d.inflationExpectationAnnual - MONETARY.inflationTarget)
      + .3 * (macro.activityAnnual - .02) + d.policyExpectationAdjustment, .02, .20);
    const move = clamp(Math.round((desired - macro.baseRateAnnual) / MONETARY.policyStep) * MONETARY.policyStep,
      -MONETARY.maxPolicyMove, MONETARY.maxPolicyMove);
    const rate = Math.round(clamp(macro.baseRateAnnual + move, .02, .20) * 10000) / 10000;
    const effectiveDate = addBusinessDays(to, 1);
    d.pendingPolicy = { rate, effectiveDate };
    d.lastPolicy = { date: to, rate, effectiveDate };
    d.nextPolicyDate = nextPolicyDate(to);
    const type = rate > macro.baseRateAnnual ? 'RATE_HIKE' : rate < macro.baseRateAnnual ? 'RATE_CUT' : 'RATE_HOLD';
    const key = type.toLowerCase();
    events.push({ type, titleKey: `event.${key}.title`, descriptionKey: 'event.policy_decision.desc',
      impact: {}, magnitude: Math.abs(rate - macro.baseRateAnnual), vars: { rate: (rate * 100).toFixed(2), date: effectiveDate } });
  }
  return events;
}
