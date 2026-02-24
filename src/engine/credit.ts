// ── Credit watch & default for debentures ──

import type { GameState, EventCard } from './types';
import type { RNG } from './rng';
import { CREDIT } from './params';

export function processCreditWatchAndDefaults(state: GameState, rng: RNG): EventCard[] {
  const events: EventCard[] = [];

  for (const [assetId, def] of Object.entries(state.assetCatalog)) {
    if (def.class !== 'DEBENTURE' || !def.creditRating) continue;

    const rating = def.creditRating;
    const existing = state.credit.watch[assetId];

    if (existing) {
      // Check if watch window expired
      if (state.dayIndex - existing.enteredDay >= CREDIT.watchWindowDays) {
        delete state.credit.watch[assetId];
        continue;
      }

      if (existing.defaulted) continue;

      // Daily default probability = total prob / window days
      const dailyDefaultProb = CREDIT.defaultProbTotal[rating] / CREDIT.watchWindowDays;
      if (rng.next() < dailyDefaultProb) {
        existing.defaulted = true;
        const [minLoss, maxLoss] = CREDIT.principalLoss[rating];
        const lossFraction = minLoss + rng.next() * (maxLoss - minLoss);

        // Apply loss to positions
        const pos = state.portfolio[assetId];
        if (pos && pos.quantity > 0) {
          const lostValue = pos.quantity * state.assets[assetId].price * lossFraction;
          state.assets[assetId].price *= (1 - lossFraction);
        }

        // Halt trading
        state.assets[assetId].haltedUntilDay = state.dayIndex + 3 + Math.floor(rng.next() * 7);

        events.push({
          type: 'CREDIT_DOWNGRADE',
          titleKey: 'credit.default',
          descriptionKey: 'credit.default',
          impact: { [assetId]: -lossFraction },
          magnitude: lossFraction,
        });
      }
    } else {
      // Maybe enter watch
      if (rng.next() < CREDIT.watchProbDaily[rating]) {
        state.credit.watch[assetId] = {
          enteredDay: state.dayIndex,
          windowDays: CREDIT.watchWindowDays,
          defaulted: false,
        };
        events.push({
          type: 'CREDIT_DOWNGRADE',
          titleKey: 'credit.watch',
          descriptionKey: 'credit.watch',
          impact: { [assetId]: -0.01 },
          magnitude: 0.01,
        });
      }
    }
  }

  return events;
}
