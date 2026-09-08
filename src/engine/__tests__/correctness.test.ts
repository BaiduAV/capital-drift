import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGameState } from '../init';
import { quoteBuy, quoteSell, executeBuy, executeSell, maxAffordableBuyQuantity } from '../trading';
import { applyReturnsToPrices } from '../pricing';
import { simulateDay } from '../simulateDay';
import { computeEquity } from '../invariants';
import { applyDividendsAndDistributions } from '../dividends';
import { processCreditWatchAndDefaults } from '../credit';
import { mergeEventImpacts, rollEvents } from '../events';
import { createRNG } from '../rng';
import { loadGame, saveGame } from '../persistence';
import * as bankruptcy from '../bankruptcy';
import type { AssetClass, GameState, PersistentEvent } from '../types';

function singleAsset(assetClass: AssetClass = 'STOCK'): GameState {
  const state = createGameState(11);
  state.assets = { TEST: { price: 100, lastReturn: 0, haltedUntilDay: null, priceHistory: [100] } };
  state.assetCatalog = { TEST: { id: 'TEST', nameKey: 'test', class: assetClass, sector: 'ENERGIA', corrGroup: 'EQUITY', liquidityRule: 'D0', initialPrice: 100 } };
  return state;
}

afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

describe('bankruptcy and invalid trades', () => {
  it('keeps bankrupt shares at zero through shocks and subsequent days', () => {
    const state = singleAsset();
    state.assets.TEST.isBankrupt = true;
    state.assets.TEST.price = 0;
    state.portfolio.TEST = { quantity: 5, avgPrice: 100 };
    applyReturnsToPrices(state, { TEST: 0.5 });
    const next = simulateDay(state).state;
    expect(next.assets.TEST.price).toBe(0);
    expect(computeEquity(next)).toBe(state.cash);
    expect(quoteBuy(next, 'TEST', 1).canExecute).toBe(false);
    expect(quoteSell(next, 'TEST', 1).canExecute).toBe(false);
    expect(maxAffordableBuyQuantity(next, 'TEST')).toBe(0);
  });

  it.each([NaN, Infinity, -Infinity, 0, -1])('rejects quantity %s without mutating balances', quantity => {
    const state = singleAsset();
    state.portfolio.TEST = { quantity: 10, avgPrice: 100 };
    const before = structuredClone(state);
    expect(executeBuy(state, quoteBuy(state, 'TEST', quantity))).toBe(false);
    expect(executeSell(state, quoteSell(state, 'TEST', quantity))).toBe(false);
    expect(state).toEqual(before);
  });

  it.each([0, NaN, Infinity, -1])('rejects invalid price %s and returns a finite MAX', price => {
    const state = singleAsset();
    state.assets.TEST.price = price;
    expect(quoteBuy(state, 'TEST', 1).canExecute).toBe(false);
    expect(maxAffordableBuyQuantity(state, 'TEST')).toBe(0);
  });

  it('MAX accounts for crypto fees and remains bounded for tiny prices', () => {
    const state = singleAsset('CRYPTO_MAJOR');
    const quantity = maxAffordableBuyQuantity(state, 'TEST');
    expect(quoteBuy(state, 'TEST', quantity).canExecute).toBe(true);
    expect(quoteBuy(state, 'TEST', quantity + 1).canExecute).toBe(false);
    state.assets.TEST.price = Number.MIN_VALUE;
    expect(maxAffordableBuyQuantity(state, 'TEST')).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('rejects previously valid quotes after bankruptcy or a position change', () => {
    const state = singleAsset();
    state.portfolio.TEST = { quantity: 10, avgPrice: 100 };
    const buy = quoteBuy(state, 'TEST', 1);
    const sell = quoteSell(state, 'TEST', 1);
    state.assets.TEST.isBankrupt = true;
    expect(executeBuy(state, buy)).toBe(false);
    expect(executeSell(state, sell)).toBe(false);
    state.assets.TEST.isBankrupt = false;
    delete state.portfolio.TEST;
    expect(executeSell(state, sell)).toBe(false);
  });
});

describe('event accounting', () => {
  it('includes generated shocks once in the daily pipeline', () => {
    // Seed 5 produces an exogenous event under the contractual-income pipeline.
    const result = simulateDay(createGameState(5));
    const active = result.state.events.active;
    expect(active.some(e => e.id.startsWith('evt_'))).toBe(true);
    expect(new Set(active.map(e => e.id)).size).toBe(active.length);
  });

  it('deduplicates still-active events from legacy saves and expires them normally', () => {
    const state = singleAsset();
    const event: PersistentEvent = { id: 'legacy', startedAtDay: 0, durationDays: 2,
      card: { type: 'CREDIT_DOWNGRADE', titleKey: 'test', descriptionKey: 'test', impact: { TEST: -0.1 }, magnitude: 0.1 } };
    state.events.active = [event, structuredClone(event)];
    const rng = createRNG(1);
    const context = { dayIndex: 1, dt: 1, rng: { market: rng, macro: rng, events: rng, agents: rng, names: rng } };
    expect(rollEvents(state, context).active.filter(e => e.id === 'legacy')).toHaveLength(1);
    expect(rollEvents(state, { ...context, dayIndex: 2 }).active.filter(e => e.id === 'legacy')).toHaveLength(0);
  });

  it('applies a credit default once and independently of portfolio ownership', () => {
    const state = singleAsset('DEBENTURE');
    state.assetCatalog.TEST.creditRating = 'BBB';
    state.credit.watch.TEST = { enteredDay: 0, windowDays: 10, defaulted: false };
    const owned = structuredClone(state);
    owned.portfolio.TEST = { quantity: 1, avgPrice: 100 };
    for (const candidate of [state, owned]) {
      const rng = { ...createRNG(1), next: () => 0 };
      const cards = processCreditWatchAndDefaults(candidate, rng);
      expect(cards).toHaveLength(1);
      applyReturnsToPrices(candidate, mergeEventImpacts({ TEST: 0 }, cards.map((card, i) => ({ id: String(i), card, startedAtDay: 0, durationDays: 1 }))));
      expect(candidate.assets.TEST.price).toBeCloseTo(100 * (1 - cards[0].magnitude));
    }
    expect(owned.assets.TEST.price).toBe(state.assets.TEST.price);
  });
});

describe('IPO dividends and final balances', () => {
  it('starts a listed FII schedule and pays on the first due day', () => {
    const state = singleAsset();
    state.dayIndex = 65;
    const def = { ...state.assetCatalog.TEST, id: 'NEW11', class: 'FII' as const, dividendYieldAnnual: 0.12, dividendPeriodDays: 30 };
    state.ipoPipeline = [{ ticker: 'NEW11', displayName: 'New Fund', sector: 'ENERGIA', assetClass: 'FII', offerPrice: 100, announcedDay: 60, listingDay: 65, status: 'bookbuilding', demand: 0.5, playerReservation: 10, catalogEntry: def }];
    const listed = simulateDay(state).state;
    expect(listed.assets.NEW11.nextDividendDay).toBe(95);
    expect(listed.portfolio.NEW11.avgPurchaseDay).toBe(65);
    listed.dayIndex = 94;
    expect(applyDividendsAndDistributions(listed).totalPaid).toBe(0);
    listed.dayIndex = 95;
    const payment = applyDividendsAndDistributions(listed);
    expect(payment.totalPaid).toBeCloseTo(10 * listed.assets.NEW11.price * 0.12 * 30 / 365);
    expect(listed.assets.NEW11.nextDividendDay).toBe(125);
    expect(applyDividendsAndDistributions(listed).totalPaid).toBe(0);
  });

  it('repairs legacy schedules without resetting existing dates or paying bankrupt assets', () => {
    const state = singleAsset('FII');
    state.dayIndex = 65;
    Object.assign(state.assetCatalog.TEST, { dividendYieldAnnual: 0.12, dividendPeriodDays: 30 });
    state.portfolio.TEST = { quantity: 10, avgPrice: 100 };
    saveGame(state);
    const loaded = loadGame()!;
    expect(loaded.assets.TEST.nextDividendDay).toBe(95);
    expect(applyDividendsAndDistributions(loaded).totalPaid).toBe(0);
    loaded.assets.TEST.nextDividendDay = 70;
    saveGame(loaded);
    expect(loadGame()!.assets.TEST.nextDividendDay).toBe(70);
    loaded.dayIndex = 70;
    loaded.assets.TEST.isBankrupt = true;
    expect(applyDividendsAndDistributions(loaded).totalPaid).toBe(0);
  });

  it('records a bankruptcy loss in closing equity, drawdown and price history', () => {
    const state = singleAsset();
    state.cash = 0;
    state.portfolio.TEST = { quantity: 10, avgPrice: 100 };
    state.history.equity = [1000];
    vi.spyOn(bankruptcy, 'maybeBankruptAsset').mockImplementation((_id, asset) => {
      asset.price = 0;
      asset.isBankrupt = true;
      return true;
    });
    const result = simulateDay(state);
    expect(result.equityAfter).toBe(0);
    expect(result.metrics.equityAfter).toBe(computeEquity(result.state));
    expect(result.state.history.equity.at(-1)).toBe(0);
    expect(result.state.history.drawdown.at(-1)).toBe(1);
    expect(result.state.assets.TEST.priceHistory.at(-1)).toBe(0);
  });
});
