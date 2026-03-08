// ── Sector Correlation Mechanics ──

import type { Sector, MacroState, SectorBubbleState } from './types';

export const SECTOR_BETAS: Partial<Record<Sector, { selic: number; fx: number; riskOn: number; commodity: number }>> = {
    BANCOS: { selic: 0.5, fx: 0, riskOn: 0.2, commodity: 0 },
    VAREJO: { selic: -0.6, fx: -0.2, riskOn: 0.4, commodity: 0 },
    AGRO: { selic: -0.1, fx: 0.4, commodity: 0.5, riskOn: 0.1 },
    TECH: { selic: -0.8, fx: 0.1, riskOn: 0.8, commodity: 0 },
    MINERACAO: { selic: -0.1, fx: 0.5, riskOn: 0.3, commodity: 0.6 },
    SAUDE: { selic: -0.3, fx: 0, riskOn: 0.2, commodity: 0 },
    INDUSTRIA: { selic: -0.4, fx: 0.3, riskOn: 0.4, commodity: 0.2 },
    UTILITIES: { selic: -0.5, fx: 0, riskOn: 0.1, commodity: 0 },
    IMOB: { selic: -0.8, fx: -0.1, riskOn: 0.5, commodity: 0 },
    TELECOM: { selic: -0.3, fx: 0, riskOn: 0.2, commodity: 0 },
    LOGISTICA: { selic: -0.4, fx: 0.1, riskOn: 0.4, commodity: 0.1 },
    ENERGIA: { selic: -0.2, fx: 0, riskOn: 0.2, commodity: 0 },
    // ETF sectors
    TOTAL_MARKET: { selic: -0.4, fx: 0.1, riskOn: 0.7, commodity: 0.1 },
    DIVIDENDS: { selic: 0.2, fx: 0, riskOn: 0.3, commodity: 0 },
    SMALL_CAPS: { selic: -0.6, fx: 0, riskOn: 0.8, commodity: 0.1 },
    // FII sectors
    BRICK: { selic: -0.7, fx: 0, riskOn: 0.4, commodity: 0 },
    PAPER: { selic: 0.4, fx: 0, riskOn: 0.1, commodity: 0 },
    HYBRID: { selic: -0.2, fx: 0, riskOn: 0.3, commodity: 0 },
};

export function computeSectorReturn(
    sector: Sector,
    macroDelta: { selic: number; fx: number; riskOn: number; commodity: number },
    shocks: { marketShock: number; sectorShock: number; idioShock: number },
    bubbleState?: SectorBubbleState
): number {
    const betas = SECTOR_BETAS[sector] || { selic: 0, fx: 0, riskOn: 0.5, commodity: 0 };

    // 1. Beta component (Macro impacts)
    const macroReturn =
        (betas.selic * macroDelta.selic) +
        (betas.fx * macroDelta.fx) +
        (betas.riskOn * macroDelta.riskOn) +
        (betas.commodity * macroDelta.commodity);

    // 2. Premium component (Bubble / Sentiment)
    // High sentiment pushes return up, high stress brings it drastically down
    let premium = 0;
    if (bubbleState) {
        premium = (bubbleState.sentiment * 0.001) + (bubbleState.bubble * 0.002) - (bubbleState.stress * 0.005);
    }

    // 3. Correlated shocks component
    // Base formulation: 50% market, 35% sector, 15% idiosyncratic
    const correlatedReturn =
        (0.50 * shocks.marketShock) +
        (0.35 * shocks.sectorShock) +
        (0.15 * shocks.idioShock);

    return macroReturn + premium + correlatedReturn;
}
