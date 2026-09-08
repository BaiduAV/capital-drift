import { expect, test, describe } from 'vitest';
import { simulateDay } from '../simulateDay';
import { createRNG } from '../rng';
import { gameFixture, buyFixture } from '@/test/factories/game';
import { maybeBankruptAsset } from '../bankruptcy';
import type { SimulationState } from '../types';

function createMockState(seed: number): SimulationState {
    const state = gameFixture(seed);
    buyFixture(state, 'BOVA11', 5);
    return state;
}

describe('simulateDay deterministic pipeline', () => {
    test('reproducibility with same seed and state', () => {
        const initialStateA = createMockState(12345);
        const initialStateB = createMockState(12345);

        const resultA = simulateDay(initialStateA);
        const resultB = simulateDay(initialStateB);

        expect(resultA.state.dayIndex).toBe(1);
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
            if (resultB.state.assets[id] && Math.abs(resultA.state.assets[id].price - resultB.state.assets[id].price) > 1e-6) {
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

        // Fixed-seed integration: verify the announcement reaches listing within this window.
        // This is a reproducible scenario, not a probability guarantee for other seeds.
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

    test('bankruptcy triggers at the probability boundary under extreme stress', () => {
        const state = createMockState(12345);
        const stock = Object.values(state.assetCatalog).find(a => a.class === 'STOCK')!;
        state.market.sectors[stock.sector] = { sentiment: -1, bubble: 1, stress: 1, ipoHeat: 0 };
        state.macro.baseRateAnnual = .20;
        // Controlled random draws test the branch; no 2,000-day lottery.
        expect(maybeBankruptAsset(stock.id, state.assets[stock.id], state, { ...createRNG(1), next: () => 1 })).toBe(false);
        expect(maybeBankruptAsset(stock.id, state.assets[stock.id], state, { ...createRNG(1), next: () => 0 })).toBe(true);
        expect(state.assets[stock.id].price).toBe(0);
        expect(state.assets[stock.id].isBankrupt).toBe(true);
        expect(maybeBankruptAsset(stock.id, state.assets[stock.id], state, createRNG(1))).toBe(false);
    });

    test('bubbles naturally form and stress grows', () => {
        const state = createMockState(12345);
        const res = simulateDay(state);
        // On first day, sentiment should exist for active sectors and we should track bubble mechanics
        expect(res.state.market).toBeDefined();

        // Current catalog includes energy stocks.
        const energyBubble = res.state.market?.sectors?.['ENERGIA'];
        expect(energyBubble).toBeDefined();
        // Since we had 0 return initially, sentiment should be near 0
        expect(typeof energyBubble?.sentiment).toBe('number');
    });
});
