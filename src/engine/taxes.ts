// ── Brazilian Tax System: IR (Imposto de Renda) & IOF ──

import type { AssetClass, GameState, TaxState } from './types';

// ── IOF Regressivo (renda fixa, resgates em até 30 dias) ──
// Day 1: 96%, Day 2: 93%, ... Day 29: 3%, Day 30+: 0%
const IOF_TABLE = [
  96, 93, 90, 86, 83, 80, 76, 73, 70, 66,
  63, 60, 56, 53, 50, 46, 43, 40, 36, 33,
  30, 26, 23, 20, 16, 13, 10, 6, 3, 0,
];

export function getIOFRate(holdingDays: number): number {
  holdingDays = Math.floor(holdingDays);
  if (holdingDays <= 0) return 0.96;
  if (holdingDays >= 30) return 0;
  return (IOF_TABLE[holdingDays - 1] ?? 0) / 100;
}

// ── IR Regressivo (renda fixa: CDB, Tesouro, Debêntures) ──
export function getFixedIncomeIRRate(holdingDays: number): number {
  if (holdingDays <= 180) return 0.225;
  if (holdingDays <= 360) return 0.20;
  if (holdingDays <= 720) return 0.175;
  return 0.15;
}

// ── Asset class → tax category ──
export type TaxCategory = 'FIXED_INCOME' | 'STOCK' | 'FII' | 'ETF' | 'CRYPTO' | 'FX';

export function getTaxCategory(assetClass: AssetClass): TaxCategory {
  switch (assetClass) {
    case 'RF_POS':
    case 'RF_PRE':
    case 'RF_IPCA':
    case 'DEBENTURE':
      return 'FIXED_INCOME';
    case 'STOCK':
      return 'STOCK';
    case 'FII':
      return 'FII';
    case 'ETF':
      return 'ETF';
    case 'CRYPTO_MAJOR':
    case 'CRYPTO_ALT':
      return 'CRYPTO';
    case 'FX':
      return 'FX';
    default:
      return 'STOCK';
  }
}

// ── Monthly sales tracker for R$20k stock exemption ──
// In the game, 1 month ≈ 21 trading days (simplified to 30 calendar days)
const MONTH_DAYS = 30;

function getMonthKey(dayIndex: number): number {
  return Math.floor(dayIndex / MONTH_DAYS);
}

// ── Tax Calculation Result ──
export interface TaxBreakdown {
  capitalGain: number;       // Lucro bruto
  irRate: number;            // Alíquota IR aplicada
  irAmount: number;          // IR a pagar
  iofRate: number;           // Alíquota IOF
  iofAmount: number;         // IOF a pagar
  totalTax: number;          // Total de impostos
  netProceeds: number;       // Valor líquido após impostos
  isExempt: boolean;         // Se está isento (ex: vendas < R$20k/mês)
  exemptionReason?: string;  // Motivo da isenção
  lossOffset: number;        // Prejuízo compensado
}

export type { TaxState } from './types';

export function createInitialTaxState(): TaxState {
  return {
    totalIRPaid: 0,
    totalIOFPaid: 0,
    accumulatedLosses: {},
    monthlySales: {},
    monthlyResults: {},
    monthlySalesByCategory: {},
  };
}

/**
 * Calculate taxes for a sell operation (estimate, does not mutate state)
 */
export function calculateSellTax(
  state: GameState,
  assetId: string,
  quantity: number,
  saleUnitPrice: number,
): TaxBreakdown {
  const def = state.assetCatalog[assetId];
  const pos = state.portfolio[assetId];
  const taxState = state.taxState ?? createInitialTaxState();

  const noTax: TaxBreakdown = {
    capitalGain: 0, irRate: 0, irAmount: 0,
    iofRate: 0, iofAmount: 0, totalTax: 0,
    netProceeds: saleUnitPrice * quantity,
    isExempt: true, lossOffset: 0,
  };

  if (!def || !pos || quantity <= 0) return noTax;

  const category = getTaxCategory(def.class);
  const saleTotal = saleUnitPrice * quantity;
  const costBasis = pos.avgPrice * quantity;
  const capitalGain = saleTotal - costBasis;
  const holdingDays = Math.max(1, state.dayIndex - (pos.avgPurchaseDay ?? 0));

  let irRate = 0;
  let iofRate = 0;
  let iofAmount = 0;
  let irAmount = 0;
  let isExempt = false;
  let exemptionReason: string | undefined;
  let lossOffset = 0;

  // ── IOF: only on fixed income within 30 days ──
  if (category === 'FIXED_INCOME' && holdingDays < 30) {
    iofRate = getIOFRate(holdingDays);
    const gain = Math.max(0, capitalGain);
    iofAmount = gain * iofRate;
  }

  // ── IR calculation by category ──
  switch (category) {
    case 'FIXED_INCOME': {
      // IR regressivo sobre rendimento (gain only)
      irRate = getFixedIncomeIRRate(holdingDays);
      const taxableGain = Math.max(0, capitalGain - iofAmount);
      irAmount = taxableGain * irRate;
      break;
    }
    case 'STOCK':
    case 'CRYPTO': {
      const monthKey = getMonthKey(state.dayIndex);
      const sales = (taxState.monthlySalesByCategory?.[monthKey]?.[category] ?? 0) + saleTotal;
      const ledger = taxState.monthlyResults?.[monthKey]?.[category];
      const openingLoss = ledger?.openingLoss ?? Math.min(0, taxState.accumulatedLosses[category] ?? 0);
      const gain = (ledger?.gain ?? 0) + capitalGain;
      isExempt = sales <= (category === 'STOCK' ? 20_000 : 35_000);
      exemptionReason = isExempt ? (category === 'STOCK' ? 'tax.exempt_20k' : 'tax.exempt_35k') : undefined;
      irRate = isExempt ? 0 : 0.15;
      // Reconcile the entire simulated month. Losses can refund earlier withholding.
      const due = Math.max(0, gain + openingLoss) * irRate;
      irAmount = due - (ledger?.taxPaid ?? 0);
      lossOffset = isExempt ? 0 : Math.min(-openingLoss, Math.max(0, gain));
      break;
    }
    case 'FII': {
      // FII: 20% on capital gains (dividends are exempt - handled elsewhere)
      irRate = 0.20;
      if (capitalGain > 0) {
        const accLoss = Math.abs(taxState.accumulatedLosses[category] ?? 0);
        lossOffset = Math.min(accLoss, capitalGain);
        irAmount = (capitalGain - lossOffset) * irRate;
      }
      break;
    }
    case 'ETF': {
      // ETF: 15% on gains (no R$20k exemption)
      irRate = 0.15;
      if (capitalGain > 0) {
        const accLoss = Math.abs(taxState.accumulatedLosses[category] ?? 0);
        lossOffset = Math.min(accLoss, capitalGain);
        irAmount = (capitalGain - lossOffset) * irRate;
      }
      break;
    }
    case 'FX': {
      // Forex/Dollar: 15% on gains, R$35k exemption
      irRate = 0.15;
      if (capitalGain > 0) {
        irAmount = capitalGain * irRate;
      }
      break;
    }
  }

  if (category !== 'STOCK' && category !== 'CRYPTO') irAmount = Math.max(0, irAmount);
  iofAmount = Math.max(0, iofAmount);
  const totalTax = irAmount + iofAmount;

  return {
    capitalGain,
    irRate,
    irAmount,
    iofRate,
    iofAmount,
    totalTax,
    netProceeds: saleTotal - totalTax,
    isExempt: isExempt && capitalGain > 0,
    exemptionReason,
    lossOffset,
  };
}

/**
 * Apply tax effects after a sell is executed (mutates taxState)
 */
export function applyTaxOnSell(
  state: GameState,
  assetId: string,
  quantity: number,
  saleUnitPrice: number,
): TaxBreakdown {
  if (!state.taxState) state.taxState = createInitialTaxState();

  const breakdown = calculateSellTax(state, assetId, quantity, saleUnitPrice);
  const def = state.assetCatalog[assetId];
  if (!def) return breakdown;

  const category = getTaxCategory(def.class);
  const saleTotal = saleUnitPrice * quantity;

  // Deduct taxes from cash
  state.cash -= breakdown.totalTax;

  // Track IR and IOF paid
  state.taxState.totalIRPaid += breakdown.irAmount;
  state.taxState.totalIOFPaid += breakdown.iofAmount;

  // Keep legacy aggregate for save compatibility, but never use mixed totals for exemptions.
  // Old saves cannot reconstruct categories; separated accounting starts on the next sale.
  state.taxState.monthlySalesByCategory ??= {};
  const categorySales = state.taxState.monthlySalesByCategory[getMonthKey(state.dayIndex)] ??= {};
  categorySales[category] = (categorySales[category] ?? 0) + saleTotal;

  // Track aggregate monthly sales
  const monthKey = getMonthKey(state.dayIndex);
  state.taxState.monthlySales[monthKey] = (state.taxState.monthlySales[monthKey] ?? 0) + saleTotal;

  if (category === 'STOCK' || category === 'CRYPTO') {
    state.taxState.monthlyResults ??= {};
    const month = state.taxState.monthlyResults[monthKey] ??= {};
    const ledger = month[category] ??= {
      gain: 0, openingLoss: Math.min(0, state.taxState.accumulatedLosses[category] ?? 0), taxPaid: 0,
    };
    ledger.gain += breakdown.capitalGain;
    ledger.taxPaid += breakdown.irAmount;
    const exempt = categorySales[category] <= (category === 'STOCK' ? 20_000 : 35_000);
    state.taxState.accumulatedLosses[category] = exempt
      ? ledger.openingLoss + Math.min(0, ledger.gain)
      : Math.min(0, ledger.openingLoss + ledger.gain);
  } else if (breakdown.capitalGain < 0) {
    state.taxState.accumulatedLosses[category] =
      (state.taxState.accumulatedLosses[category] ?? 0) + breakdown.capitalGain;
  } else if (breakdown.lossOffset > 0) {
    state.taxState.accumulatedLosses[category] =
      (state.taxState.accumulatedLosses[category] ?? 0) + breakdown.lossOffset;
  }

  // Clean up old monthly sales data (keep last 3 months)
  const currentMonth = getMonthKey(state.dayIndex);
  for (const key of Object.keys(state.taxState.monthlySales)) {
    if (Number(key) < currentMonth - 3) {
      delete state.taxState.monthlySales[Number(key)];
      delete state.taxState.monthlySalesByCategory[Number(key)];
      if (state.taxState.monthlyResults) delete state.taxState.monthlyResults[Number(key)];
    }
  }

  return breakdown;
}
