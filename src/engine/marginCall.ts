// ── Margin Call System ──
// Forces liquidation of positions when portfolio drawdown exceeds threshold.

import type { SimulationState, EventCard, AssetClass } from './types';
import { MARGIN_CALL } from './params';
import { computeEquity } from './invariants';
import { quoteSell, executeSell } from './trading';

// Liquidation priority: riskiest assets first
const LIQUIDATION_ORDER: AssetClass[] = [
  'CRYPTO_ALT', 'CRYPTO_MAJOR', 'STOCK', 'ETF', 'FII',
  'DEBENTURE', 'RF_PRE', 'RF_IPCA', 'FX', 'RF_POS',
];

export interface MarginCallResult {
  triggered: boolean;
  totalLiquidated: number;
  assetsLiquidated: { assetId: string; quantity: number; proceeds: number }[];
  drawdownPct: number;
  event?: EventCard;
}

export function checkAndExecuteMarginCall(state: SimulationState): MarginCallResult {
  const equity = computeEquity(state);
  const peak = Math.max(0, ...state.history.equity, equity);

  if (peak <= 0) {
    return { triggered: false, totalLiquidated: 0, assetsLiquidated: [], drawdownPct: 0 };
  }

  const drawdown = (peak - equity) / peak;

  const { drawdownThreshold, recoveryTarget } = state.marginCallSettings ?? MARGIN_CALL;

  if (drawdown < drawdownThreshold) {
    return { triggered: false, totalLiquidated: 0, assetsLiquidated: [], drawdownPct: drawdown };
  }

  // Target equity to reach recovery level
  const targetEquity = peak * (1 - recoveryTarget);
  const deficit = targetEquity - equity;

  if (deficit <= 0) {
    return { triggered: false, totalLiquidated: 0, assetsLiquidated: [], drawdownPct: drawdown };
  }

  // Sort positions by liquidation priority
  const positionEntries = Object.entries(state.portfolio)
    .filter(([, pos]) => pos.quantity > 0)
    .map(([id, pos]) => ({
      id,
      pos,
      def: state.assetCatalog[id],
      price: state.assets[id]?.price ?? 0,
    }))
    .filter(p => p.def && p.price > 0)
    .sort((a, b) => {
      const orderA = LIQUIDATION_ORDER.indexOf(a.def.class);
      const orderB = LIQUIDATION_ORDER.indexOf(b.def.class);
      return (orderA === -1 ? 99 : orderA) - (orderB === -1 ? 99 : orderB);
    });

  let remaining = deficit;
  const liquidated: MarginCallResult['assetsLiquidated'] = [];
  let totalProceeds = 0;

  for (const { id, pos, price } of positionEntries) {
    if (remaining <= 0) break;

    const qtyNeeded = Math.ceil(remaining / price);
    const qtyToSell = Math.min(qtyNeeded, pos.quantity);

    const quote = quoteSell(state, id, qtyToSell);
    if (quote.canExecute) {
      executeSell(state, quote);
      liquidated.push({ assetId: id, quantity: qtyToSell, proceeds: quote.totalCost });
      totalProceeds += quote.totalCost;
      remaining -= quote.totalCost;
    }
  }

  const drawdownPctStr = (drawdown * 100).toFixed(1);
  const liquidatedStr = totalProceeds.toFixed(0);

  const event: EventCard = {
    type: 'MARGIN_CALL',
    titleKey: 'event.margin_call.title',
    descriptionKey: 'event.margin_call.desc',
    impact: {},
    magnitude: drawdown,
    vars: { drawdown: drawdownPctStr, liquidated: liquidatedStr },
  };

  return {
    triggered: true,
    totalLiquidated: totalProceeds,
    assetsLiquidated: liquidated,
    drawdownPct: drawdown,
    event,
  };
}
