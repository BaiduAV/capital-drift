// ── Bankruptcy Mechanics ──

import type { SimulationState, AssetState } from './types';
import type { RNG } from './rng';

export function maybeBankruptAsset(
    assetId: string,
    asset: AssetState,
    state: SimulationState,
    rng: RNG
): boolean {
    if (asset.isBankrupt) return false;

    const def = state.assetCatalog[assetId];
    if (!def || def.class !== 'STOCK') return false;

    const bubbleState = state.market?.sectors?.[def.sector];
    if (!bubbleState) return false;

    // Bankruptcy probability factors:
    // - Extremely high stress
    // - High SELIC (borrowing cost kills companies)
    // - Bursting bubble (bubble high, but sentiment collapsed)

    let bankruptProb = 0;

    if (bubbleState.stress > 0.8) {
        bankruptProb += (bubbleState.stress - 0.8) * 0.005; // Base chance on extreme stress
    }

    if (state.macro.baseRateAnnual > 0.15) {
        bankruptProb += (state.macro.baseRateAnnual - 0.15) * 0.01;
    }

    // High burst indicator
    if (bubbleState.bubble > 0.8 && bubbleState.sentiment < -0.5) {
        bankruptProb += 0.002;
    }

    // Hard clamp daily prob to a maximum of 0.5% a day even in worst case
    bankruptProb = Math.min(bankruptProb, 0.005);

    if (bankruptProb > 0 && rng.next() < bankruptProb) {
        asset.price = 0;
        asset.isBankrupt = true;
        asset.haltedUntilDay = null; // permanently stopped essentially
        // We could log an event here if we wanted
        return true;
    }

    return false;
}
