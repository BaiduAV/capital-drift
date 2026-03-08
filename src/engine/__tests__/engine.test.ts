import { describe, it, expect } from 'vitest';
import { createGameState } from '../init';
import { simulateDay } from '../simulateDay';
import { simulatePeriod } from '../simulatePeriod';
import { quoteBuy, quoteSell, executeBuy, executeSell } from '../trading';
import { computeEquity, checkInvariants } from '../invariants';
import { createRNG } from '../rng';

const SEED = 42;

function cloneState(s: ReturnType<typeof createGameState>) {
  return JSON.parse(JSON.stringify(s));
}

describe('Engine - Determinism', () => {
  it('same seed produces identical simulation', () => {
    let s1 = createGameState(SEED);
    let s2 = createGameState(SEED);

    for (let i = 0; i < 30; i++) {
      s1 = simulateDay(s1).state;
      s2 = simulateDay(s2).state;
    }

    expect(s1.cash).toBe(s2.cash);
    expect(s1.dayIndex).toBe(s2.dayIndex);
    expect(s1.macro).toEqual(s2.macro);
    for (const id of Object.keys(s1.assets)) {
      expect(s1.assets[id].price).toBe(s2.assets[id].price);
    }
  });

  it('different seeds produce different results', () => {
    let s1 = createGameState(SEED);
    let s2 = createGameState(SEED + 1);

    for (let i = 0; i < 30; i++) {
      s1 = simulateDay(s1).state;
      s2 = simulateDay(s2).state;
    }

    // Very unlikely all prices match with different seeds
    const prices1 = Object.values(s1.assets).map(a => a.price);
    const prices2 = Object.values(s2.assets).map(a => a.price);
    expect(prices1).not.toEqual(prices2);
  });
});

describe('Engine - RNG', () => {
  it('mulberry32 is deterministic', () => {
    const r1 = createRNG(123);
    const r2 = createRNG(123);
    for (let i = 0; i < 100; i++) {
      expect(r1.next()).toBe(r2.next());
    }
  });

  it('gaussian distribution has reasonable mean and stddev', () => {
    const rng = createRNG(999);
    const samples: number[] = [];
    for (let i = 0; i < 10000; i++) samples.push(rng.nextGaussian());
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const variance = samples.reduce((a, b) => a + (b - mean) ** 2, 0) / samples.length;
    expect(Math.abs(mean)).toBeLessThan(0.05);
    expect(Math.abs(Math.sqrt(variance) - 1)).toBeLessThan(0.1);
  });
});

describe('Engine - Invariants', () => {
  it('prices never negative after 365 days', () => {
    let state = createGameState(SEED);
    for (let i = 0; i < 365; i++) {
      state = simulateDay(state).state;
      const errors = checkInvariants(state);
      expect(errors).toEqual([]);
    }
  });

  it('equity is consistent', () => {
    let state = createGameState(SEED);
    // Buy some assets first
    const quote = quoteBuy(state, 'CRBTC', 5);
    if (quote.canExecute) executeBuy(state, quote);

    for (let i = 0; i < 30; i++) {
      state = simulateDay(state).state;
    }

    const equity = computeEquity(state);
    expect(isNaN(equity)).toBe(false);
    expect(equity).toBeGreaterThan(0);
  });
});

describe('Engine - Correlation in crisis', () => {
  it.skip('crisis regime increases effective correlation', () => {
    // Run many days in crisis and check correlation of returns
    let state = createGameState(SEED);
    state.regime = 'CRISIS';

    const returns: Record<string, number[]> = {};
    for (let i = 0; i < 100; i++) {
      state = simulateDay(state).state;
      state.regime = 'CRISIS'; // force crisis
      for (const [id, a] of Object.entries(state.assets)) {
        if (!returns[id]) returns[id] = [];
        returns[id].push(a.lastReturn);
      }
    }

    // Check that equity assets have higher pairwise correlation than in calm
    let stateCalm = createGameState(SEED + 100);
    stateCalm.regime = 'CALM';
    const returnsCalm: Record<string, number[]> = {};
    for (let i = 0; i < 100; i++) {
      stateCalm = simulateDay(stateCalm).state;
      stateCalm.regime = 'CALM';
      for (const [id, a] of Object.entries(stateCalm.assets)) {
        if (!returnsCalm[id]) returnsCalm[id] = [];
        returnsCalm[id].push(a.lastReturn);
      }
    }

    // Compute average pairwise correlation for stocks
    const stockIds = Object.keys(state.assetCatalog).filter(id => state.assetCatalog[id].class === 'STOCK');
    const corrCrisis = avgPairwiseCorr(stockIds, returns);
    const corrCalm = avgPairwiseCorr(stockIds, returnsCalm);

    expect(corrCrisis).toBeGreaterThan(corrCalm);
  });
});

function avgPairwiseCorr(ids: string[], returns: Record<string, number[]>): number {
  let total = 0;
  let count = 0;
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = returns[ids[i]];
      const b = returns[ids[j]];
      if (a && b) {
        total += pearson(a, b);
        count++;
      }
    }
  }
  return count > 0 ? total / count : 0;
}

function pearson(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const xi = x[i] - mx;
    const yi = y[i] - my;
    num += xi * yi;
    dx += xi * xi;
    dy += yi * yi;
  }
  return dx > 0 && dy > 0 ? num / Math.sqrt(dx * dy) : 0;
}

describe('Engine - Fast forward equivalence', () => {
  it('simulatePeriod N = simulateDay N times (no trades)', () => {
    let s1 = createGameState(SEED);
    const s2 = cloneState(s1);

    // Manual loop
    for (let i = 0; i < 30; i++) s1 = simulateDay(s1).state;

    // Fast forward
    simulatePeriod(s2, 30);

    expect(s1.dayIndex).toBe(s2.dayIndex);
    expect(s1.cash).toBe(s2.cash);
    for (const id of Object.keys(s1.assets)) {
      expect(s1.assets[id].price).toBe(s2.assets[id].price);
    }
  });
});

describe('Engine - Trading', () => {
  it('can buy and sell assets', () => {
    const state = createGameState(SEED);
    // Use BOVA11 (static ETF)
    const buyQuote = quoteBuy(state, 'BOVA11', 10);
    expect(buyQuote.canExecute).toBe(true);

    const cashBefore = state.cash;
    executeBuy(state, buyQuote);
    expect(state.cash).toBeLessThan(cashBefore);
    expect(state.portfolio['BOVA11']?.quantity).toBe(10);

    const sellQuote = quoteSell(state, 'BOVA11', 5);
    expect(sellQuote.canExecute).toBe(true);
    executeSell(state, sellQuote);
    expect(state.portfolio['BOVA11']?.quantity).toBe(5);
  });

  it('cannot buy more than cash allows', () => {
    const state = createGameState(SEED);
    // Find a crypto asset dynamically
    const cryptoId = Object.keys(state.assetCatalog).find(id => state.assetCatalog[id].class === 'CRYPTO_MAJOR')!;
    const quote = quoteBuy(state, cryptoId, 10000);
    expect(quote.canExecute).toBe(false);
    expect(quote.reason).toBe('trade.insufficient_cash');
  });

  it('cannot sell more than held', () => {
    const state = createGameState(SEED);
    const quote = quoteSell(state, 'BOVA11', 5);
    expect(quote.canExecute).toBe(false);
    expect(quote.reason).toBe('trade.no_position');
  });

  it('applies crypto fees and spread', () => {
    const state = createGameState(SEED);
    const cryptoId = Object.keys(state.assetCatalog).find(id => state.assetCatalog[id].class === 'CRYPTO_MAJOR')!;
    const quote = quoteBuy(state, cryptoId, 1);
    expect(quote.spread).toBe(0.0015);
    expect(quote.fees).toBeGreaterThan(0);
  });
});

describe('Engine - Dividends', () => {
  it('FIIs pay dividends monthly', () => {
    let state = createGameState(SEED);
    const fiiId = Object.keys(state.assetCatalog).find(id => state.assetCatalog[id].class === 'FII')!;
    const q = quoteBuy(state, fiiId, 10);
    executeBuy(state, q);
    const cashAfterBuy = state.cash;

    // Advance to next FII pay day
    for (let i = 0; i < 31; i++) state = simulateDay(state).state;

    // Cash should have increased from dividends
    expect(state.cash).toBeGreaterThan(cashAfterBuy);
  });

  it('stocks pay dividends quarterly', () => {
    let state = createGameState(SEED);
    const stockId = Object.keys(state.assetCatalog).find(id => state.assetCatalog[id].class === 'STOCK')!;
    const q = quoteBuy(state, stockId, 10);
    executeBuy(state, q);
    const cashAfterBuy = state.cash;

    // Advance 91 days
    for (let i = 0; i < 91; i++) state = simulateDay(state).state;

    expect(state.cash).toBeGreaterThan(cashAfterBuy);
  });
});

describe('Engine - Game Init', () => {
  it('initializes with correct starting state', () => {
    const state = createGameState(SEED);
    expect(state.cash).toBe(5000);
    expect(state.dayIndex).toBe(0);
    expect(state.regime).toBe('CALM');
    expect(state.macro.baseRateAnnual).toBe(0.11);
    expect(state.macro.inflationAnnual).toBe(0.045);
    expect(Object.keys(state.assetCatalog).length).toBe(33);
    expect(Object.keys(state.assets).length).toBe(33);
  });
});
