import { createGameState } from '@/engine/init';
import { executeBuy, quoteBuy } from '@/engine/trading';
import type { GameState } from '@/engine/types';

/** Start with the same calendar, contracts, curves and schema as a new real game. */
export const gameFixture = (seed = 42): GameState => createGameState(seed);

export function buyFixture(state: GameState, id: string, quantity = 1): void {
  const quote = quoteBuy(state, id, quantity);
  if (!executeBuy(state, quote)) throw new Error(`Fixture purchase failed: ${id}: ${quote.reason}`);
}

export function ipoFixture(state: GameState, ticker = 'TESTIPO', quantity = 1, listingDay = state.dayIndex): void {
  state.ipoPipeline.push({
    ticker, displayName: 'Test IPO', sector: 'TECH', assetClass: 'STOCK', offerPrice: 100,
    announcedDay: state.dayIndex, listingDay, status: 'bookbuilding', demand: .5, playerReservation: quantity,
    catalogEntry: { id: ticker, nameKey: ticker, displayName: 'Test IPO', class: 'STOCK', sector: 'TECH',
      corrGroup: 'EQUITY', liquidityRule: 'D0', initialPrice: 100 },
  });
}
