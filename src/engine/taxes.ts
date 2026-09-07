// ── Brazilian Tax System: IR (Imposto de Renda) & IOF ──

import type { AssetClass, AssetDefinition, GameState, Position } from './types';

// ── IOF Regressivo (renda fixa, resgates em até 30 dias) ──
// Day 1: 96%, Day 2: 93%, ... Day 29: 3%, Day 30+: 0%
const IOF_TABLE = [
  96, 93, 90, 86, 83, 80, 76, 73, 70, 66,
  63, 60, 56, 53, 50, 46, 43, 40, 36, 33,
  30, 26, 23, 20, 16, 13, 10, 6, 3, 0,
];

export function getIOFRate(holdingDays: number): number {
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

// ── Tax State (persisted in GameState) ──
export interface TaxState {
  totalIRPaid: number;
  totalIOFPaid: number;
  // Accumulated losses by category for carry-forward
  accumulatedLosses: Partial<Record<TaxCategory, number>>;
  // Monthly stock sales totals for R$20k exemption
  monthlySales: Record<number, number>; // monthKey -> total sales amount
}

export function createInitialTaxState(): TaxState {
  return {
    totalIRPaid: 0,
    totalIOFPaid: 0,
    accumulatedLosses: {},
    monthlySales: {},
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
    case 'STOCK': {
      // R$20k/month exemption (swing trade)
      const monthKey = getMonthKey(state.dayIndex);
      const currentMonthSales = taxState.monthlySales[monthKey] ?? 0;
      const totalMonthSales = currentMonthSales + saleTotal;

      if (totalMonthSales <= 20_000) {
        isExempt = true;
        exemptionReason = 'tax.exempt_20k';
        irRate = 0;
      } else {
        irRate = 0.15; // 15% swing trade
        // Apply loss carry-forward
        if (capitalGain > 0) {
          const accLoss = Math.abs(taxState.accumulatedLosses[category] ?? 0);
          lossOffset = Math.min(accLoss, capitalGain);
          irAmount = (capitalGain - lossOffset) * irRate;
        }
      }
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
    case 'CRYPTO': {
      // Crypto: 15% on gains when monthly sales > R$35k
      const monthKey = getMonthKey(state.dayIndex);
      const currentMonthSales = taxState.monthlySales[monthKey] ?? 0;
      const totalMonthSales = currentMonthSales + saleTotal;

      if (totalMonthSales <= 35_000) {
        isExempt = true;
        exemptionReason = 'tax.exempt_35k';
        irRate = 0;
      } else {
        irRate = 0.15;
        if (capitalGain > 0) {
          const accLoss = Math.abs(taxState.accumulatedLosses[category] ?? 0);
          lossOffset = Math.min(accLoss, capitalGain);
          irAmount = (capitalGain - lossOffset) * irRate;
        }
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

  irAmount = Math.max(0, irAmount);
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

  // Track monthly sales (for exemptions)
  const monthKey = getMonthKey(state.dayIndex);
  state.taxState.monthlySales[monthKey] = (state.taxState.monthlySales[monthKey] ?? 0) + saleTotal;

  // Update accumulated losses
  if (breakdown.capitalGain < 0) {
    // Add to accumulated losses
    state.taxState.accumulatedLosses[category] =
      (state.taxState.accumulatedLosses[category] ?? 0) + breakdown.capitalGain; // negative value
  } else if (breakdown.lossOffset > 0) {
    // Reduce accumulated losses by offset used
    state.taxState.accumulatedLosses[category] =
      (state.taxState.accumulatedLosses[category] ?? 0) + breakdown.lossOffset;
  }

  // Clean up old monthly sales data (keep last 3 months)
  const currentMonth = getMonthKey(state.dayIndex);
  for (const key of Object.keys(state.taxState.monthlySales)) {
    if (Number(key) < currentMonth - 3) {
      delete state.taxState.monthlySales[Number(key)];
    }
  }

  return breakdown;
}
