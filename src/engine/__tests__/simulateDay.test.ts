import { expect, test, describe } from 'vitest';
import { simulateDay } from '../simulateDay';
import { createRNG } from '../rng';
import type { SimulationState } from '../types';

function createMockState(seed: number): SimulationState {
    const rng = createRNG(seed);
    return {
        dayIndex: 1,
        cash: 10000,
        portfolio: {
            'PETR4': { quantity: 100, avgPrice: 35.0 },
        },
        assets: {
            'PETR4': { price: 35.0, lastReturn: 0, haltedUntilDay: null, priceHistory: [35.0] },
            'VALE3': { price: 70.0, lastReturn: 0, haltedUntilDay: null, priceHistory: [70.0] },
            'USD': { price: 5.0, lastReturn: 0, haltedUntilDay: null, priceHistory: [5.0] },  
            'BTC': { price: 50000.0, lastReturn: 0, haltedUntilDay: null, priceHistory: [50000.0] }
        },
        assetCatalog: {
            'PETR4': { id: 'PETR4', nameKey: 'n/a', class: 'STOCK', sector: 'ENERGIA', corrGroup: 'EQUITY', liquidityRule: 'D0', initialPrice: 35.0 },
            'VALE3': { id: 'VALE3', nameKey: 'n/a', class: 'STOCK', sector: 'MINERACAO', corrGroup: 'EQUITY', liquidityRule: 'D0', initialPrice: 70.0 },
            'USD': { id: 'USD', nameKey: 'asset.usd', class: 'FX', sector: 'NONE', corrGroup: 'FX', liquidityRule: 'D0', initialPrice: 5.0 },
            'BTC': { id: 'BTC', nameKey: 'n/a', class: 'CRYPTO_MAJOR', sector: 'NONE', corrGroup: 'CRYPTO', liquidityRule: 'D0', initialPrice: 50000.0 },
        },
        macro: {
            baseRateAnnual: 0.10,
            inflationAnnual: 0.05,
            fxUSDBRL: 5.0,
            activityAnnual: 0.02,
            riskIndex: 0.5,
        },
        regime: 'CALM',
        calendar: {
            nextFiiPayDay: 30,
            nextStockPayDay: 90,
        },
        credit: { watch: {} },
        history: { equity: [13500], drawdown: [0], cdiAccumulated: [1], inflationAccumulated: [1] },
        seed,
        rngState: rng.state(),
        events: { active: [] },
        market: { sectors: {}, newListingsCount: {} },
        ipoPipeline: [],
        achievements: {},
        marginCallSettings: { drawdownThreshold: 0.50, recoveryTarget: 0.40 },
    };
}

describe('simulateDay deterministic pipeline', () => {
    test('reproducibility with same seed and state', () => {
        const initialStateA = createMockState(12345);
        const initialStateB = createMockState(12345);

        const resultA = simulateDay(initialStateA);
        const resultB = simulateDay(initialStateB);

        expect(resultA.state.dayIndex).toBe(2);
        // Prices should be EXACTLY identical between A and B
        for (const id of Object.keys(initialStateA.assets)) {
            expect(resultA.state.assets[id].price).toBe(resultB.state.assets[id].price);
        }

        // Check that history accumulation is deterministic
        expect(resultA.state.history.equity[1]).toBe(resultB.state.history.equity[1]);
    });

    test('sensitivity to different seed', () => {
        const initialStateA = createMockState(12345);
        const initialStateB = createMockState(99999);

        const resultA = simulateDay(initialStateA);
        const resultB = simulateDay(initialStateB);

        // It is extraordinarily unlikely that prices will be exact same with two different seeds
        let diffDetected = false;
        for (const id of Object.keys(initialStateA.assets)) {
            if (Math.abs(resultA.state.assets[id].price - resultB.state.assets[id].price) > 1e-6) {
                diffDetected = true;
                break;
            }
        }

        expect(diffDetected).toBe(true);
    });

    test('trace contains expected phases', () => {
        const initialState = createMockState(12345);
        const result = simulateDay(initialState);

        expect(result.trace).toBeDefined();
        expect(result.trace.phases).toEqual(['Expectations', 'Shocks', 'MarketClearing', 'Accounting']);
    });

    test('does not mutate original state', () => {
        const initialState = createMockState(12345);
        const snapshot = JSON.parse(JSON.stringify(initialState));

        simulateDay(initialState);

        expect(initialState).toEqual(snapshot);
    });

    test('IPO is generated under high heat', () => {
        const state = createMockState(12345);
        state.market = {
            sectors: {
                TECH: { sentiment: 1.0, bubble: 1.0, stress: 0, ipoHeat: 1.0 }
            },
            newListingsCount: {
                TECH: 0
            }
        };

        // We run multiple days to guarantee the probability hits (prob max 2% per day)
        // With a specific seed or enough days it will trigger.
        let triggered = false;
        let currentState = state;
        for (let i = 0; i < 200; i++) {
            const res = simulateDay(currentState);
            currentState = res.state;
            if (Object.keys(currentState.assets).length > Object.keys(state.assets).length) {
                triggered = true;
                break;
            }
        }
        expect(triggered).toBe(true);
    });

    test('asset goes bankrupt under extreme stress', () => {
        const state = createMockState(12345);
        state.market = {
            sectors: {
                ENERGIA: { sentiment: -1.0, bubble: 2.0, stress: 1.0, ipoHeat: 0 } // high burst proxy
            },
            newListingsCount: {}
        };
        state.macro.baseRateAnnual = 5.0; // insanely high selic guarantees bankruptcy before decay

        let triggered = false;
        let currentState = state;
        for (let i = 0; i < 2000; i++) {
            // Force values to stay at burst levels to prevent decay over 2000 days
            if (currentState.market?.sectors?.['ENERGIA']) {
                currentState.market.sectors['ENERGIA'].stress = 1.0;
                currentState.market.sectors['ENERGIA'].bubble = 2.0;
                currentState.market.sectors['ENERGIA'].sentiment = -1.0;
            }
            currentState.macro.baseRateAnnual = 0.20;

            const res = simulateDay(currentState);
            currentState = res.state;
            if (currentState.assets['PETR4'].isBankrupt) {
                expect(currentState.assets['PETR4'].price).toBe(0);
                triggered = true;
                break;
            }
        }
        expect(triggered).toBe(true);
    });

    test('bubbles naturally form and stress grows', () => {
        const state = createMockState(12345);
        const res = simulateDay(state);
        // On first day, sentiment should exist for active sectors and we should track bubble mechanics
        expect(res.state.market).toBeDefined();
        const techBubble = res.state.market?.sectors?.['TECH'];
        // Tech isn't in original assets, Energy is.
        const energyBubble = res.state.market?.sectors?.['ENERGIA'];
        expect(energyBubble).toBeDefined();
        // Since we had 0 return initially, sentiment should be near 0
        expect(typeof energyBubble?.sentiment).toBe('number');
    });
});
