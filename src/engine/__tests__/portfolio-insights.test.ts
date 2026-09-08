import { describe, expect, it } from 'vitest';
import { gameFixture, buyFixture, ipoFixture } from '@/test/factories/game';
import { computeHealthScore } from '../healthScore';
import { generateRecommendations } from '../recommendations';
import { computeEquity } from '../invariants';

describe('portfolio insights', () => {
  it('scores concentration using each bank lot instead of the current offer price', () => {
    const state = gameFixture();
    buyFixture(state, 'CDBPRE', 10);
    buyFixture(state, 'CDB100', 10);
    state.portfolio.CDBPRE.fixedIncomeLots![0].bookUnitValue = 300;
    // Invested values 3,000 and 1,000: HHI .625 -> diversification 9/20.
    const score = computeHealthScore(state, computeEquity(state));
    expect(score.breakdown.assetDiv).toBe(9);
    expect(generateRecommendations(state, computeEquity(state)).some(r => r.pt.includes('CDBPRE representa 43%'))).toBe(true);
    state.assets.CDBPRE.price = 10_000; // new offer quote must not revalue old bank lots
    expect(computeHealthScore(state, computeEquity(state))).toEqual(score);
  });
  it.each([0, .03, .075, .2, .45, .8, 1])('bounds score components for cash weight %f', weight => {
    const state = gameFixture();
    state.cash = weight * 5000;
    state.history.equity = [5000, 4500];
    state.history.cdiAccumulated = [5000, 5050];
    const score = computeHealthScore(state, 4500);
    expect(Object.values(score.breakdown).every(v => v >= 0 && v <= 20)).toBe(true);
    expect(score.total).toBe(Object.values(score.breakdown).reduce((a, b) => a + b, 0));
    expect(score.tips.length).toBeLessThanOrEqual(3);
    expect(score.tips.every(t => t.pt.length > 0 && t.en.length > 0)).toBe(true);
  });
  it('prioritizes crisis, liquidity and drawdown warnings over opportunities', () => {
    const state = gameFixture();
    buyFixture(state, 'BOVA11', 5);
    state.cash = 0;
    state.regime = 'CRISIS';
    state.macro.riskIndex = .9;
    state.history.equity = [5000, 2000];
    const recommendations = generateRecommendations(state, 2000);
    expect(recommendations).toHaveLength(5);
    expect(recommendations.slice(0, 4).every(r => r.priority === 1 && r.actionType === 'sell')).toBe(true);
    expect(recommendations.map(r => r.priority)).toEqual([...recommendations.map(r => r.priority)].sort());
  });
  it.each(['BEAR', 'BULL', 'CRYPTO_EUPHORIA'] as const)('explains %s with localized actionable guidance', regime => {
    const state = gameFixture();
    state.regime = regime;
    expect(generateRecommendations(state, 5000).some(r => r.pt && r.en && r.icon === ({ BEAR: '🐻', BULL: '🐂', CRYPTO_EUPHORIA: '🚀' }[regime]))).toBe(true);
  });
  it('targets existing indexed assets and stops recommending an already reserved IPO', () => {
    const state = gameFixture();
    state.cash = 1000;
    state.macro.baseRateAnnual = .14;
    state.macro.inflationAnnual = .07;
    ipoFixture(state, 'TESTIPO', 0, 7);
    const recommendations = generateRecommendations(state, 5000);
    expect(recommendations.flatMap(r => r.targetAssets ?? []).every(id => state.assetCatalog[id])).toBe(true);
    expect(recommendations.some(r => r.pt.includes('IPO de Test IPO'))).toBe(true);
    state.ipoPipeline[0].playerReservation = 1;
    expect(generateRecommendations(state, 5000).some(r => r.pt.includes('IPO de Test IPO'))).toBe(false);
  });
});
