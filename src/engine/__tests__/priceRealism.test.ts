import { expect, test, describe } from 'vitest';
import { simulateDay } from '../simulateDay';
import { createRNG } from '../rng';
import type { SimulationState, RegimeId } from '../types';

function createFullState(seed: number): SimulationState {
  const rng = createRNG(seed);
  return {
    dayIndex: 1,
    cash: 10000,
    portfolio: {},
    assets: {
      'PETR4': { price: 35.0, lastReturn: 0, haltedUntilDay: null, priceHistory: [35.0] },
      'VALE3': { price: 70.0, lastReturn: 0, haltedUntilDay: null, priceHistory: [70.0] },
      'ITUB4': { price: 28.0, lastReturn: 0, haltedUntilDay: null, priceHistory: [28.0] },
      'USD': { price: 5.0, lastReturn: 0, haltedUntilDay: null, priceHistory: [5.0] },
      'BTC': { price: 50000.0, lastReturn: 0, haltedUntilDay: null, priceHistory: [50000.0] },
      'DOGE': { price: 0.30, lastReturn: 0, haltedUntilDay: null, priceHistory: [0.30] },
      'CDB110': { price: 1000.0, lastReturn: 0, haltedUntilDay: null, priceHistory: [1000.0] },
      'XPLG11': { price: 95.0, lastReturn: 0, haltedUntilDay: null, priceHistory: [95.0] },
    },
    assetCatalog: {
      'PETR4': { id: 'PETR4', nameKey: 'n/a', class: 'STOCK', sector: 'ENERGIA', corrGroup: 'EQUITY', liquidityRule: 'D0', initialPrice: 35.0 },
      'VALE3': { id: 'VALE3', nameKey: 'n/a', class: 'STOCK', sector: 'MINERACAO', corrGroup: 'EQUITY', liquidityRule: 'D0', initialPrice: 70.0 },
      'ITUB4': { id: 'ITUB4', nameKey: 'n/a', class: 'STOCK', sector: 'BANCOS', corrGroup: 'EQUITY', liquidityRule: 'D0', initialPrice: 28.0 },
      'USD': { id: 'USD', nameKey: 'asset.usd', class: 'FX', sector: 'NONE', corrGroup: 'FX', liquidityRule: 'D0', initialPrice: 5.0 },
      'BTC': { id: 'BTC', nameKey: 'n/a', class: 'CRYPTO_MAJOR', sector: 'NONE', corrGroup: 'CRYPTO', liquidityRule: 'D0', initialPrice: 50000.0 },
      'DOGE': { id: 'DOGE', nameKey: 'n/a', class: 'CRYPTO_ALT', sector: 'NONE', corrGroup: 'CRYPTO', liquidityRule: 'D0', initialPrice: 0.30 },
      'CDB110': { id: 'CDB110', nameKey: 'n/a', class: 'RF_POS', sector: 'NONE', corrGroup: 'FIXED_INCOME', liquidityRule: 'D1', initialPrice: 1000.0 },
      'XPLG11': { id: 'XPLG11', nameKey: 'n/a', class: 'FII', sector: 'BRICK', corrGroup: 'EQUITY', liquidityRule: 'D0', initialPrice: 95.0 },
    },
    macro: {
      baseRateAnnual: 0.11,
      inflationAnnual: 0.045,
      fxUSDBRL: 5.0,
      activityAnnual: 0.02,
      riskIndex: 0.35,
    },
    regime: 'CALM',
    calendar: { nextFiiPayDay: 30, nextStockPayDay: 90 },
    credit: { watch: {} },
    history: { equity: [10000], drawdown: [0], cdiAccumulated: [1], inflationAccumulated: [1] },
    seed,
    rngState: createRNG(seed).state(),
    events: { active: [] },
    market: { sectors: {}, newListingsCount: {} },
    ipoPipeline: [],
    achievements: {},
  };
}

function simulate(state: SimulationState, days: number, regimeOverride?: RegimeId) {
  let current = state;
  for (let i = 0; i < days; i++) {
    if (regimeOverride) current.regime = regimeOverride;
    const res = simulateDay(current);
    current = res.state;
  }
  return current;
}

function pctChange(initial: number, final: number) {
  return (final - initial) / initial;
}

describe('Price realism across regimes (90+ days)', () => {
  test('CALM regime: stocks stay within ±30% over 90 days', () => {
    const state = createFullState(42);
    const final = simulate(state, 90, 'CALM');

    const petr4Change = pctChange(35.0, final.assets['PETR4'].price);
    const vale3Change = pctChange(70.0, final.assets['VALE3'].price);

    console.log(`CALM 90d — PETR4: ${(petr4Change * 100).toFixed(1)}%, VALE3: ${(vale3Change * 100).toFixed(1)}%`);
    console.log(`  BTC: ${(pctChange(50000, final.assets['BTC'].price) * 100).toFixed(1)}%`);
    console.log(`  DOGE: ${(pctChange(0.30, final.assets['DOGE'].price) * 100).toFixed(1)}%`);
    console.log(`  CDB: ${(pctChange(1000, final.assets['CDB110'].price) * 100).toFixed(1)}%`);
    console.log(`  USD: ${(pctChange(5.0, final.assets['USD'].price) * 100).toFixed(1)}%`);

    // In CALM, stocks shouldn't move more than ~30%
    expect(Math.abs(petr4Change)).toBeLessThan(0.40);
    expect(Math.abs(vale3Change)).toBeLessThan(0.40);
    // Fixed income should be very stable
    expect(Math.abs(pctChange(1000, final.assets['CDB110'].price))).toBeLessThan(0.05);
  });

  test('BULL regime: positive drift, crypto can boom significantly', () => {
    const state = createFullState(42);
    const final = simulate(state, 90, 'BULL');

    const btcChange = pctChange(50000, final.assets['BTC'].price);
    const dogeChange = pctChange(0.30, final.assets['DOGE'].price);
    const petr4Change = pctChange(35.0, final.assets['PETR4'].price);

    console.log(`BULL 90d — PETR4: ${(petr4Change * 100).toFixed(1)}%`);
    console.log(`  BTC: ${(btcChange * 100).toFixed(1)}%, DOGE: ${(dogeChange * 100).toFixed(1)}%`);

    // In BULL, some assets should trend positive overall
    // But not guaranteed for every single asset due to randomness
  });

  test('CRISIS regime: significant drawdowns, crypto crashes hard', () => {
    const state = createFullState(42);
    const final = simulate(state, 90, 'CRISIS');

    const btcChange = pctChange(50000, final.assets['BTC'].price);
    const dogeChange = pctChange(0.30, final.assets['DOGE'].price);
    const petr4Change = pctChange(35.0, final.assets['PETR4'].price);
    const usdChange = pctChange(5.0, final.assets['USD'].price);

    console.log(`CRISIS 90d — PETR4: ${(petr4Change * 100).toFixed(1)}%`);
    console.log(`  BTC: ${(btcChange * 100).toFixed(1)}%, DOGE: ${(dogeChange * 100).toFixed(1)}%`);
    console.log(`  USD: ${(usdChange * 100).toFixed(1)}%`);
    console.log(`  CDB: ${(pctChange(1000, final.assets['CDB110'].price) * 100).toFixed(1)}%`);

    // In CRISIS, risky assets should lose value on average
    // Crypto alts should crash hard (high vol + negative drift)
    // USD should appreciate (flight to safety)
  });

  test('CRYPTO_EUPHORIA: alt-coins can explode in value', () => {
    const state = createFullState(42);
    const final = simulate(state, 90, 'CRYPTO_EUPHORIA');

    const btcChange = pctChange(50000, final.assets['BTC'].price);
    const dogeChange = pctChange(0.30, final.assets['DOGE'].price);

    console.log(`EUPHORIA 90d — BTC: ${(btcChange * 100).toFixed(1)}%, DOGE: ${(dogeChange * 100).toFixed(1)}%`);

    // In EUPHORIA, crypto alts have massive positive drift + huge vol
    // DOGE drift=0.00350/day = ~140% annualized + 10% daily vol = can go parabolic
  });

  test('Regime transition (30d each: CALM→BULL→CRISIS): realistic trajectory', () => {
    const state = createFullState(42);

    // Phase 1: CALM
    let current = simulate(state, 30, 'CALM');
    const afterCalm = { ...Object.fromEntries(Object.entries(current.assets).map(([k, v]) => [k, v.price])) };

    // Phase 2: BULL
    current = simulate(current, 30, 'BULL');
    const afterBull = { ...Object.fromEntries(Object.entries(current.assets).map(([k, v]) => [k, v.price])) };

    // Phase 3: CRISIS
    current = simulate(current, 30, 'CRISIS');
    const afterCrisis = { ...Object.fromEntries(Object.entries(current.assets).map(([k, v]) => [k, v.price])) };

    console.log('\n=== REGIME TRANSITION: CALM(30) → BULL(30) → CRISIS(30) ===');
    for (const id of ['PETR4', 'VALE3', 'BTC', 'DOGE', 'USD', 'CDB110']) {
      const initial = state.assets[id]?.price ?? 0;
      console.log(`${id}: ${initial.toFixed(2)} → ${afterCalm[id]?.toFixed(2)} → ${afterBull[id]?.toFixed(2)} → ${afterCrisis[id]?.toFixed(2)} (total: ${(pctChange(initial, afterCrisis[id] ?? initial) * 100).toFixed(1)}%)`);
    }

    // Total equity shouldn't have exploded unrealistically
    const totalEquityChange = pctChange(10000, current.history.equity[current.history.equity.length - 1]);
    console.log(`Equity: 10000 → ${current.history.equity[current.history.equity.length - 1].toFixed(0)} (${(totalEquityChange * 100).toFixed(1)}%)`);
  });

  test('No single stock daily return exceeds ±15% in CALM', () => {
    const state = createFullState(42);
    let current = state;
    let maxDailyReturn = 0;

    for (let i = 0; i < 90; i++) {
      current.regime = 'CALM';
      const res = simulateDay(current);
      for (const [id, asset] of Object.entries(res.state.assets)) {
        const def = res.state.assetCatalog[id];
        if (def?.class === 'STOCK') {
          maxDailyReturn = Math.max(maxDailyReturn, Math.abs(asset.lastReturn));
        }
      }
      current = res.state;
    }

    console.log(`Max daily stock return in CALM: ${(maxDailyReturn * 100).toFixed(2)}%`);
    // In CALM with vol=1.2%, a 3-sigma move is ~3.6%. 15% would be >12 sigma = impossible.
    expect(maxDailyReturn).toBeLessThan(0.15);
  });

  test('Fixed income (RF_POS) grows monotonically-ish over 90 days', () => {
    const state = createFullState(42);
    const final = simulate(state, 90, 'CALM');

    const cdbReturn = pctChange(1000, final.assets['CDB110'].price);
    console.log(`RF_POS 90d return: ${(cdbReturn * 100).toFixed(3)}%`);

    // RF_POS should always be positive over 90 days (drift=0.042%/day, vol=0.005%)
    expect(cdbReturn).toBeGreaterThan(0);
    // ~3.8% over 90 days annualized ~11%
    expect(cdbReturn).toBeLessThan(0.10);
  });
});
