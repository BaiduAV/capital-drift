import type { GameState, YieldCurvePoint, YieldCurveState } from './types';
import { expectedInflation, expectedPolicyRate } from './monetaryPolicy';

export const CURVE_TENORS = [21, 126, 252, 504, 1260, 2520];
type CurveName = 'nominal' | 'real' | 'selicSpread';
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const references = (s: GameState) => ({
  referencePolicyRate: expectedPolicyRate(s),
  referenceInflationExpectation: expectedInflation(s),
  referenceRiskIndex: s.macro.riskIndex,
  referenceActivity: s.macro.activityAnnual,
});

/** Scenario parameters, not fitted market data. Real yields are independent of nominal yields. */
function initialCurves(s: GameState): YieldCurveState {
  const points = (rates: number[]) => rates.map((annualRate, i) => ({ businessDays: CURVE_TENORS[i], annualRate }));
  return {
    ...references(s),
    nominal: points([0, .0025, .005, .01, .0175, .025].map(p => expectedPolicyRate(s) + p)),
    real: points([.04, .0425, .045, .05, .06, .065]),
    selicSpread: points([0, .0001, .0002, .00035, .0005, .0007]),
  };
}

const responses = {
  nominal: { policy: [1, .95, .8, .65, .45, .3], inflation: [.05, .15, .25, .4, .6, .75], risk: [.001, .002, .004, .007, .012, .018], activity: .15, min: 0, max: .4 },
  real: { policy: [.35, .35, .3, .25, .2, .15], inflation: [.05, .05, .07, .1, .12, .15], risk: [.002, .003, .005, .01, .016, .022], activity: .1, min: -.02, max: .25 },
  selicSpread: { policy: [0, 0, 0, 0, 0, 0], inflation: [0, 0, 0, 0, 0, 0], risk: [.0001, .0002, .0005, .001, .002, .003], activity: 0, min: -.01, max: .02 },
};

/** Pure projection also makes an announcement visible to quotes before the next session. */
export function currentYieldCurves(s: GameState): YieldCurveState {
  const previous = s.yieldCurves ?? initialCurves(s);
  const next = references(s);
  const project = (name: CurveName) => previous[name].map((point, i) => {
    const r = responses[name];
    return { ...point, annualRate: clamp(point.annualRate
      + (next.referencePolicyRate - previous.referencePolicyRate) * r.policy[i]
      + (next.referenceInflationExpectation - previous.referenceInflationExpectation) * r.inflation[i]
      + (next.referenceRiskIndex - previous.referenceRiskIndex) * r.risk[i]
      + (next.referenceActivity - previous.referenceActivity) * r.activity, r.min, r.max) };
  });
  return { ...next, nominal: project('nominal'), real: project('real'), selicSpread: project('selicSpread') };
}

export function initializeYieldCurves(s: GameState): void { s.yieldCurves ??= initialCurves(s); }
export function updateYieldCurves(s: GameState): void { s.yieldCurves = currentYieldCurves(s); }

/** Log-linear discount factors; flat zero yield outside the quoted maturities. */
export function interpolatedYield(points: YieldCurvePoint[], businessDays: number): number {
  if (businessDays <= points[0].businessDays) return points[0].annualRate;
  const right = points.findIndex(p => p.businessDays >= businessDays);
  if (right < 0) return points[points.length - 1].annualRate;
  const a = points[right - 1], b = points[right];
  const weight = (businessDays - a.businessDays) / (b.businessDays - a.businessDays);
  const logGrowth = Math.log1p(a.annualRate) * a.businessDays * (1 - weight)
    + Math.log1p(b.annualRate) * b.businessDays * weight;
  return Math.expm1(logGrowth / businessDays);
}

export function curveYield(s: GameState, curve: CurveName, businessDays: number): number {
  return interpolatedYield(currentYieldCurves(s)[curve], businessDays);
}
