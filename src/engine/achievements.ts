// ── Achievement System ──

import type { GameState, DayResult, AssetClass } from './types';
import { computeEquity } from './invariants';

export type AchievementId =
  | 'first_trade'
  | 'first_dividend'
  | 'survived_crisis'
  | 'beat_cdi_30'
  | 'ipo_participant'
  | 'diversified'
  | 'diamond_hands'
  | 'ten_bagger'
  | 'day_100'
  | 'millionaire'
  | 'crypto_survivor'
  | 'bankruptcy_dodge';

export interface AchievementDef {
  id: AchievementId;
  icon: string;
  titleKey: string;
  descKey: string;
  hintKey: string;
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { id: 'first_trade', icon: '🤝', titleKey: 'achievement.first_trade.title', descKey: 'achievement.first_trade.desc', hintKey: 'achievement.first_trade.hint' },
  { id: 'first_dividend', icon: '💰', titleKey: 'achievement.first_dividend.title', descKey: 'achievement.first_dividend.desc', hintKey: 'achievement.first_dividend.hint' },
  { id: 'survived_crisis', icon: '🛡️', titleKey: 'achievement.survived_crisis.title', descKey: 'achievement.survived_crisis.desc', hintKey: 'achievement.survived_crisis.hint' },
  { id: 'beat_cdi_30', icon: '📈', titleKey: 'achievement.beat_cdi_30.title', descKey: 'achievement.beat_cdi_30.desc', hintKey: 'achievement.beat_cdi_30.hint' },
  { id: 'ipo_participant', icon: '🔔', titleKey: 'achievement.ipo_participant.title', descKey: 'achievement.ipo_participant.desc', hintKey: 'achievement.ipo_participant.hint' },
  { id: 'diversified', icon: '🌐', titleKey: 'achievement.diversified.title', descKey: 'achievement.diversified.desc', hintKey: 'achievement.diversified.hint' },
  { id: 'diamond_hands', icon: '💎', titleKey: 'achievement.diamond_hands.title', descKey: 'achievement.diamond_hands.desc', hintKey: 'achievement.diamond_hands.hint' },
  { id: 'ten_bagger', icon: '🚀', titleKey: 'achievement.ten_bagger.title', descKey: 'achievement.ten_bagger.desc', hintKey: 'achievement.ten_bagger.hint' },
  { id: 'day_100', icon: '🎂', titleKey: 'achievement.day_100.title', descKey: 'achievement.day_100.desc', hintKey: 'achievement.day_100.hint' },
  { id: 'millionaire', icon: '👑', titleKey: 'achievement.millionaire.title', descKey: 'achievement.millionaire.desc', hintKey: 'achievement.millionaire.hint' },
  { id: 'crypto_survivor', icon: '🔒', titleKey: 'achievement.crypto_survivor.title', descKey: 'achievement.crypto_survivor.desc', hintKey: 'achievement.crypto_survivor.hint' },
  { id: 'bankruptcy_dodge', icon: '🏃', titleKey: 'achievement.bankruptcy_dodge.title', descKey: 'achievement.bankruptcy_dodge.desc', hintKey: 'achievement.bankruptcy_dodge.hint' },
];

/**
 * Check achievements after a day simulation. Returns newly unlocked IDs.
 * Does NOT mutate state — caller is responsible for writing unlocks.
 */
export function checkAchievements(
  state: GameState,
  dayResult: DayResult,
  prevState: GameState,
): AchievementId[] {
  const unlocked = state.achievements ?? {};
  const newlyUnlocked: AchievementId[] = [];

  function tryUnlock(id: AchievementId, condition: () => boolean) {
    if (unlocked[id]) return;
    if (condition()) newlyUnlocked.push(id);
  }

  // first_dividend
  tryUnlock('first_dividend', () => dayResult.metrics.dividendsPaid > 0);

  // survived_crisis — previous regime was CRISIS and we transitioned out
  tryUnlock('survived_crisis', () =>
    dayResult.previousRegime === 'CRISIS' && dayResult.regime !== 'CRISIS'
  );

  // beat_cdi_30 — last 30 equity values all > cdi accumulated
  tryUnlock('beat_cdi_30', () => {
    const eq = state.history.equity;
    const cdi = state.history.cdiAccumulated;
    if (eq.length < 30 || cdi.length < 30) return false;
    for (let i = eq.length - 30; i < eq.length; i++) {
      if (eq[i] <= cdi[i]) return false;
    }
    return true;
  });

  // diversified — 5+ distinct asset classes in portfolio
  tryUnlock('diversified', () => {
    const classes = new Set<AssetClass>();
    for (const id of Object.keys(state.portfolio)) {
      if (state.portfolio[id].quantity > 0) {
        const def = state.assetCatalog[id];
        if (def) classes.add(def.class);
      }
    }
    return classes.size >= 5;
  });

  // ten_bagger — any position with return >= 900%
  tryUnlock('ten_bagger', () => {
    for (const [id, pos] of Object.entries(state.portfolio)) {
      if (pos.quantity <= 0 || pos.avgPrice <= 0) continue;
      const price = state.assets[id]?.price ?? 0;
      if ((price - pos.avgPrice) / pos.avgPrice >= 9) return true;
    }
    return false;
  });

  // day_100
  tryUnlock('day_100', () => state.dayIndex >= 100);

  // millionaire
  tryUnlock('millionaire', () => computeEquity(state) >= 1_000_000);

  // crypto_survivor — had crypto during CRYPTO_HACK event
  tryUnlock('crypto_survivor', () => {
    const hadCryptoHack = dayResult.events.some(e => e.type === 'CRYPTO_HACK');
    if (!hadCryptoHack) return false;
    // Check if player held crypto in previous state
    for (const id of Object.keys(prevState.portfolio)) {
      if (prevState.portfolio[id].quantity <= 0) continue;
      const def = prevState.assetCatalog[id];
      if (def && (def.class === 'CRYPTO_MAJOR' || def.class === 'CRYPTO_ALT')) return true;
    }
    return false;
  });

  // bankruptcy_dodge — asset went bankrupt but player had already sold
  tryUnlock('bankruptcy_dodge', () => {
    for (const [id, asset] of Object.entries(state.assets)) {
      if (asset.isBankrupt && !prevState.assets[id]?.isBankrupt) {
        // Newly bankrupt — did player NOT hold it?
        const pos = state.portfolio[id];
        if (!pos || pos.quantity <= 0) {
          // Check if player ever held it (avgPrice > 0 means they traded it)
          const prevPos = prevState.portfolio[id];
          if (prevPos && prevPos.avgPrice > 0) return true;
        }
      }
    }
    return false;
  });

  // diamond_hands — has held positions through >10% drawdown for 60+ days
  tryUnlock('diamond_hands', () => {
    const dd = state.history.drawdown;
    if (dd.length < 60) return false;
    let streak = 0;
    const hasPositions = Object.values(state.portfolio).some(p => p.quantity > 0);
    if (!hasPositions) return false;
    for (const d of dd) {
      if (d >= 0.10) { streak++; if (streak >= 60) return true; }
      else streak = 0;
    }
    return false;
  });

  return newlyUnlocked;
}
