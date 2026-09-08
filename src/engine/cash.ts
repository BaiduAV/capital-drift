import type { GameState } from './types';

export function reservedCash(state: GameState, exceptTicker?: string): number {
  return (state.ipoPipeline ?? []).reduce((sum, entry) => sum + (
    entry.ticker !== exceptTicker && entry.status === 'bookbuilding'
      ? entry.playerReservation * entry.offerPrice : 0), 0);
}

export function availableCash(state: GameState): number {
  return Math.max(0, state.cash - reservedCash(state));
}

/** Replacing a reservation releases its previous commitment; zero cancels it. */
export function reserveIPO(state: GameState, ticker: string, quantity: number): boolean {
  const entry = state.ipoPipeline?.find(e => e.ticker === ticker && e.status === 'bookbuilding');
  if (!entry || !Number.isSafeInteger(quantity) || quantity < 0) return false;
  if (quantity * entry.offerPrice > state.cash - reservedCash(state, ticker) + 1e-8) return false;
  entry.playerReservation = quantity;
  return true;
}

/** Legacy saves could overbook cash. Keep affordable reservations in listing order. */
export function normalizeReservations(state: GameState): number {
  let remaining = state.cash;
  let adjusted = 0;
  for (const entry of [...state.ipoPipeline].sort((a, b) => a.listingDay - b.listingDay)) {
    if (entry.status !== 'bookbuilding') continue;
    const quantity = Math.min(Math.floor(entry.playerReservation), Math.max(0, Math.floor(remaining / entry.offerPrice)));
    if (quantity !== entry.playerReservation) adjusted++;
    entry.playerReservation = quantity;
    remaining -= quantity * entry.offerPrice;
  }
  return adjusted;
}

export function settleReceivables(state: GameState): void {
  const pending: NonNullable<GameState['pendingSettlements']> = [];
  for (const settlement of state.pendingSettlements ?? []) {
    if (settlement.dueDay <= state.dayIndex) state.cash += settlement.amount;
    else pending.push(settlement);
  }
  state.pendingSettlements = pending;
}
