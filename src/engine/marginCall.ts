// ── Margin Call System ──
// Forces liquidation of positions when portfolio drawdown exceeds threshold.

import type { SimulationState, EventCard, AssetClass } from './types';
import { availableCash } from './cash';
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

  if (peak <= 0 || equity <= 0) {
    return { triggered: false, totalLiquidated: 0, assetsLiquidated: [], drawdownPct: 0 };
  }

  const drawdown = (peak - equity) / peak;

  const { drawdownThreshold, recoveryTarget } = state.marginCallSettings ?? MARGIN_CALL;

  if (drawdown < drawdownThreshold) {
    return { triggered: false, totalLiquidated: 0, assetsLiquidated: [], drawdownPct: drawdown };
  }

  // Selling cannot restore lost equity. Reduce exposure by building a cash reserve.
  // Keep the recoveryTarget key so existing saved settings remain readable.
  const cashTarget = Math.max(0, Math.min(1, recoveryTarget));
  const targetReached = () => availableCash(state) + 1e-8 >= computeEquity(state) * cashTarget;
  if (targetReached()) {
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
    .filter(p => p.def && p.def.liquidityRule !== 'D7' && Number.isFinite(p.price) && p.price > 0 && Number.isFinite(p.pos.quantity) && p.pos.quantity <= Number.MAX_SAFE_INTEGER)
    .sort((a, b) => {
      const orderA = LIQUIDATION_ORDER.indexOf(a.def.class);
      const orderB = LIQUIDATION_ORDER.indexOf(b.def.class);
      return (orderA === -1 ? 99 : orderA) - (orderB === -1 ? 99 : orderB);
    });

  const liquidated: MarginCallResult['assetsLiquidated'] = [];
  let totalProceeds = 0;

  for (const { id, pos, price } of positionEntries) {
    if (targetReached()) break;
    const fullQuote = quoteSell(state, id, pos.quantity);
    if (!fullQuote.canExecute && fullQuote.reason !== 'trade.insufficient_cash') continue;

    const currentEquity = computeEquity(state);
    const reachesTarget = (units: number) => {
      const quantity = Math.min(units, pos.quantity);
      const quote = quoteSell(state, id, quantity);
      if (!quote.canExecute) return false;
      const net = quote.taxBreakdown?.netAfterTax ?? quote.totalCost;
      const equityAfter = currentEquity - quantity * price + net;
      return availableCash(state) + net + 1e-8 >= equityAfter * cashTarget;
    };

    // Exemption is monotonic, but reaching the reserve is not: crossing the
    // stock/crypto monthly limit taxes the entire gain. Split at that boundary.
    // Use quotes so prior monthly sales, category limits and spreads stay in sync.
    const maxUnits = Math.ceil(pos.quantity);
    const ranges: [number, number][] = [[1, maxUnits]];
    const isExempt = (units: number) => quoteSell(state, id, Math.min(units, pos.quantity)).taxBreakdown?.exemptionReason;
    if (isExempt(1) && !fullQuote.taxBreakdown?.exemptionReason) {
      let lo = 1;
      let hi = maxUnits;
      while (lo < hi) {
        const mid = lo + Math.ceil((hi - lo) / 2);
        if (isExempt(mid)) lo = mid;
        else hi = mid - 1;
      }
      ranges.splice(0, 1, [1, lo], [lo + 1, maxUnits]);
    }

    // Search each continuous tax range in order, allowing a fractional remainder.
    // Within each range, net proceeds increase with quantity. Keep its executable
    // endpoint as a fallback if no range can reach the entire reserve target.
    let unitsToSell = 0;
    for (const [start, end] of ranges) {
      if (!quoteSell(state, id, Math.min(end, pos.quantity)).canExecute) continue;
      unitsToSell = end;
      if (!reachesTarget(end)) continue;
      let lo = start;
      let hi = end;
      while (lo < hi) {
        const mid = lo + Math.floor((hi - lo) / 2);
        if (reachesTarget(mid)) hi = mid;
        else lo = mid + 1;
      }
      unitsToSell = lo;
      break;
    }
    if (unitsToSell === 0) continue;
    const qtyToSell = Math.min(unitsToSell, pos.quantity);
    const quote = quoteSell(state, id, qtyToSell);
    const cashBefore = state.cash;
    if (executeSell(state, quote)) {
      const proceeds = state.cash - cashBefore;
      liquidated.push({ assetId: id, quantity: qtyToSell, proceeds });
      totalProceeds += proceeds;
    }
  }

  if (liquidated.length === 0) {
    return { triggered: false, totalLiquidated: 0, assetsLiquidated: [], drawdownPct: drawdown };
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
