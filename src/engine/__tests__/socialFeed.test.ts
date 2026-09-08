import { expect, it } from 'vitest';
import { gameFixture } from '@/test/factories/game';
import { generateSocialPosts } from '../socialFeed';
import { simulateDay } from '../simulateDay';
import type { EventCard } from '../types';

it.each(['pt-BR', 'en'])('interpolates policy releases in %s without consuming simulation randomness', locale => {
  const state = gameFixture();
  const result = simulateDay(state);
  result.events = [
    { type: 'RATE_HIKE', vars: { rate: '12.50', date: '2026-09-09' }, magnitude: .1 },
    { type: 'INFLATION_RELEASE', vars: { month: '2026-08', monthly: '0.30', annual: '4.50' }, magnitude: .01 },
  ].map(e => ({ titleKey: e.type, descriptionKey: e.type, impact: {}, ...e })) as EventCard[];
  const before = structuredClone(state);
  const posts = generateSocialPosts([result], state, 20, locale);
  expect(posts[0].text).toContain('12.50');
  expect(posts[0].text).toContain('2026-09-09');
  expect(posts.find(p => p.relatedEvent === 'INFLATION_RELEASE')!.text).toContain('4.50');
  expect(posts.every(p => !/[{}]/.test(p.text))).toBe(true);
  expect(generateSocialPosts([result], state, 20, locale)).toEqual(posts);
  expect(state).toEqual(before);
});
it('orders days newest first and caps posts including influencer and corporate reactions', () => {
  const state = gameFixture();
  const first = simulateDay(state);
  first.events = [{ type: 'IPO_LISTED', titleKey: '', descriptionKey: '', impact: {}, magnitude: .2 }];
  const second = { ...first, dayIndex: 2 };
  const posts = generateSocialPosts([first, second], state, 3);
  expect(posts).toHaveLength(3);
  expect(posts.map(p => p.dayIndex)).toEqual([...posts.map(p => p.dayIndex)].sort((a, b) => b - a));
  expect(new Set(posts.map(p => p.id)).size).toBe(3);
  expect(posts.some(p => p.accountType === 'corporate')).toBe(true);
  expect(generateSocialPosts([first], state, 0)).toEqual([]);
});
