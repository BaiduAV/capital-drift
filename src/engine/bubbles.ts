// ── Bubble & Sentiment Mechanics ──

import type { SectorBubbleState, MacroState } from './types';

// Clamp helper
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export function updateSectorBubble(
    prev: SectorBubbleState | undefined,
    inputs: {
        sectorReturn: number; // average return of the sector in the recent days
        macro: MacroState;
        creditStress?: number; // optional external stress metric
    }
): SectorBubbleState {
    // Default values if first time updating
    const current = prev || { sentiment: 0, bubble: 0, stress: 0, ipoHeat: 0 };
    const next = { ...current };

    const { sectorReturn, macro } = inputs;

    // Macro heuristics
    const riskOn = 1.0 - macro.riskIndex; // Higher riskIndex means less riskOn
    const selic = macro.baseRateAnnual;

    // 1. Sentiment updates
    // Sentiment rises with positive return and riskOn, falls with high SELIC
    const sentimentDelta = (sectorReturn * 5) + (riskOn * 0.05) - (selic * 0.1);
    // Natural decay of sentiment
    next.sentiment = next.sentiment * 0.95 + sentimentDelta;
    next.sentiment = clamp(next.sentiment, -1.0, 1.0);

    // 2. Bubble updates
    // Bubbles grow only if sentiment is highly positive (> 0.5)
    if (next.sentiment > 0.5) {
        next.bubble += (next.sentiment - 0.5) * 0.05;
    } else {
        // Bubble decays slowly over time if not fed
        next.bubble *= 0.98;
    }
    next.bubble = clamp(next.bubble, 0, 2.0);

    // 3. Stress updates
    // High bubble size and high selic feed stress
    const stressDelta = (next.bubble * 0.02) + (selic * 0.05) + (inputs.creditStress || 0 * 0.02);
    next.stress = next.stress * 0.9 + stressDelta;

    // If bubble bursts (high stress + low sentiment), stress spikes
    if (next.bubble > 1.0 && next.sentiment < 0) {
        next.stress += 0.2;
    }
    next.stress = clamp(next.stress, 0, 1.0);

    // 4. IPO Heat
    // IPO heat scales heavily with bubble size and sentiment
    const heatTarget = (next.sentiment > 0 ? next.sentiment : 0) + (next.bubble * 0.5);
    // Reverts to target smoothly
    next.ipoHeat = next.ipoHeat * 0.8 + heatTarget * 0.2;
    next.ipoHeat = clamp(next.ipoHeat, 0, 1.0);

    return next;
}
