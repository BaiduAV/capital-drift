import { expect, it } from 'vitest';
import { gameFixture, ipoFixture } from '@/test/factories/game';
import { checkAchievements } from '../achievements';
import { simulateDay } from '../simulateDay';

it.each([0, 1, 100])('awards IPO participation only for an affordable actual allocation (quantity %i)', quantity => {
  const previous = gameFixture();
  ipoFixture(previous, 'TESTIPO', quantity);
  const result = simulateDay(previous);
  const listed = result.events.find(e => e.type === 'IPO_LISTED');
  expect(listed).toBeDefined();
  expect(Number(listed!.vars!.filledQuantity)).toBe(quantity === 1 ? 1 : 0);
  expect(checkAchievements(result.state, result, previous).includes('ipo_participant')).toBe(quantity === 1);
  result.state.achievements.ipo_participant = { unlockedAtDay: 1 };
  expect(checkAchievements(result.state, result, previous)).not.toContain('ipo_participant');
});
it('requires 30 observations above the currency-valued CDI benchmark and respects equality', () => {
  const previous = gameFixture();
  const result = simulateDay(previous);
  result.state.history.equity = Array(30).fill(5100);
  result.state.history.cdiAccumulated = Array(30).fill(5050);
  expect(checkAchievements(result.state, result, previous)).toContain('beat_cdi_30');
  result.state.history.equity[10] = 5050;
  expect(checkAchievements(result.state, result, previous)).not.toContain('beat_cdi_30');
  result.state.history.equity = Array(29).fill(5100);
  expect(checkAchievements(result.state, result, previous)).not.toContain('beat_cdi_30');
});
it('awards dividend and day milestones once, without mutating the input', () => {
  const previous = gameFixture();
  const result = simulateDay(previous);
  result.state.dayIndex = 100;
  result.metrics.dividendsPaid = 10;
  const before = structuredClone(result.state);
  expect(checkAchievements(result.state, result, previous)).toEqual(expect.arrayContaining(['first_dividend', 'day_100']));
  expect(result.state).toEqual(before);
  result.state.achievements = { first_dividend: { unlockedAtDay: 1 }, day_100: { unlockedAtDay: 100 } };
  expect(checkAchievements(result.state, result, previous)).not.toContain('first_dividend');
  expect(checkAchievements(result.state, result, previous)).not.toContain('day_100');
});
