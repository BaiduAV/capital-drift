import { afterEach, describe, expect, it } from 'vitest';
import { createGameState } from '../init';
import { createRNG } from '../rng';
import { generateReturns, applyReturnsToPrices } from '../pricing';
import { mergeEventImpacts } from '../events';
import { simulateDay } from '../simulateDay';
import { addBusinessDays } from '../financialCalendar';
import { saveGame, loadGame } from '../persistence';
import type { PersistentEvent } from '../types';

afterEach(() => localStorage.clear());
const downgrade = (id: string, loss: number): PersistentEvent => ({
  id: 'test-downgrade', startedAtDay: 0, durationDays: 1,
  card: { type: 'CREDIT_DOWNGRADE', titleKey: 'event.credit_downgrade.title',
    descriptionKey: 'event.credit_downgrade.desc', impact: { [id]: -loss }, magnitude: loss },
});

describe('contractual debenture credit downgrades', () => {
  it.each([['DEBAA', .02], ['DEBAA', .07], ['DEBBBB', .02], ['DEBBBB', .07]] as const)(
    'applies the %s downgrade of %s in the daily pipeline', (id, loss) => {
      const control = createGameState(777), shocked = structuredClone(control);
      shocked.events.active = [downgrade(id, loss)];
      const baseline = simulateDay(control).state, next = simulateDay(shocked).state;
      expect(next.assets[id].price).toBeCloseTo(baseline.assets[id].price - control.assets[id].price * loss, 10);
      expect(next.assets[id].lastReturn).toBeCloseTo(baseline.assets[id].lastReturn - loss, 12);
      expect(next.assets[id].fixedIncome!.bookValue).toBe(baseline.assets[id].fixedIncome!.bookValue);
      expect(next.assets[id].fixedIncome!.creditSpreadAdjustment).toBeGreaterThan(0);
      const other = id === 'DEBAA' ? 'DEBBBB' : 'DEBAA';
      expect(next.assets[other]).toEqual(baseline.assets[other]);
      expect(next.assets.TPRE).toEqual(baseline.assets.TPRE);
      expect(next.assets.CDB100).toEqual(baseline.assets.CDB100);
    },
  );

  it('retains the repricing after save/load without repeating the shock or rebounding', () => {
    const s = createGameState(777);
    const returns = generateReturns(s, createRNG(1));
    applyReturnsToPrices(s, mergeEventImpacts(returns, [downgrade('DEBAA', .05)]));
    s.dayIndex++; s.calendarDate = addBusinessDays(s.calendarDate!, 1);
    const instrument = structuredClone(s.assets.DEBAA.fixedIncome!);
    const price = s.assets.DEBAA.price;
    expect(saveGame(s).ok).toBe(true);
    const loaded = loadGame()!;
    expect(loaded.assets.DEBAA.fixedIncome).toEqual(instrument);
    applyReturnsToPrices(loaded, generateReturns(loaded, createRNG(2)));
    const expected = loaded.assets.DEBAA.fixedIncome!.bookValue
      * Math.pow(1.02 / (1 + instrument.marketYield), (instrument.maturityDay - 2) / 252);
    expect(loaded.assets.DEBAA.price).toBeCloseTo(expected, 10);
    expect(loaded.assets.DEBAA.price / price - 1).toBeGreaterThan(0);
    expect(loaded.assets.DEBAA.price / price - 1).toBeLessThan(.001);
    // A downgrade changes market value, not the contractual maturity payment.
    loaded.dayIndex = instrument.maturityDay - 1;
    applyReturnsToPrices(loaded, generateReturns(loaded, createRNG(3)));
    expect(loaded.assets.DEBAA.price).toBe(loaded.assets.DEBAA.fixedIncome!.bookValue);
  });
});
