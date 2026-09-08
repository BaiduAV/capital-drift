// ── Period simulation (fast-forward) ──

import type { GameState, PeriodResult, EventCard } from './types';
import { simulateDay } from './simulateDay';
import { computeEquity, computeMaxDrawdown } from './invariants';

export function simulatePeriod(state: GameState, days: number): PeriodResult {
  const startDay = state.dayIndex;
  const startEquity = computeEquity(state);
  const allEvents: EventCard[] = [];
  const equities = [startEquity];

  const assetStartPrices: Record<string, number> = {};
  for (const [id, a] of Object.entries(state.assets)) {
    assetStartPrices[id] = a.price;
  }

  for (let i = 0; i < days; i++) {
    const result = simulateDay(state);
    allEvents.push(...result.events);
    const eq = result.metrics.equityAfter;
    equities.push(eq);
    // Mutate state for the next simple loop in period simulation
    Object.assign(state, result.state);
  }

  const endEquity = computeEquity(state);
  const totalReturn = startEquity > 0 ? (endEquity - startEquity) / startEquity : 0;
  const maxDrawdown = computeMaxDrawdown(equities);

  // Top movers
  const movers = Object.entries(state.assets).map(([id, a]) => ({
    asset: id,
    return: (a.price - (assetStartPrices[id] ?? a.price)) / (assetStartPrices[id] || 1),
  })).sort((a, b) => Math.abs(b.return) - Math.abs(a.return)).slice(0, 6);

  // Rank events by magnitude
  const rankedEvents = [...allEvents].sort((a, b) => b.magnitude - a.magnitude).slice(0, 6);

  // Missed opportunities
  const missedOpportunities: string[] = [];
  if (maxDrawdown > 0.10) {
    missedOpportunities.push('missed.drawdown');
  }

  return {
    startDay,
    endDay: state.dayIndex,
    totalReturn,
    maxDrawdown,
    events: rankedEvents,
    topMovers: movers,
    missedOpportunities,
  };
}
