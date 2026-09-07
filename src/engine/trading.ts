// ── Trading helpers ──

import type { GameState, TradeQuote } from './types';
import { COSTS } from './params';
import { calculateSellTax, applyTaxOnSell } from './taxes';

export function quoteBuy(state: GameState, assetId: string, quantity: number): TradeQuote {
  if (quantity <= 0) {
    return { assetId, quantity, unitPrice: 0, totalCost: 0, fees: 0, spread: 0, canExecute: false, reason: 'trade.invalid_quantity' };
  }
  const def = state.assetCatalog[assetId];
  const asset = state.assets[assetId];
  if (!def || !asset) {
    return { assetId, quantity, unitPrice: 0, totalCost: 0, fees: 0, spread: 0, canExecute: false, reason: 'trade.halted' };
  }

  // Check halt
  if (asset.haltedUntilDay && state.dayIndex < asset.haltedUntilDay) {
    return { assetId, quantity, unitPrice: asset.price, totalCost: 0, fees: 0, spread: 0, canExecute: false, reason: 'trade.halted' };
  }

  let spreadRate = 0;
  let feeRate = 0;

  if (def.class === 'CRYPTO_MAJOR' || def.class === 'CRYPTO_ALT') {
    spreadRate = COSTS.cryptoSpread;
    feeRate = COSTS.cryptoFee;
  } else if (def.class === 'DEBENTURE') {
    spreadRate = COSTS.debentureSpread;
  }

  const unitPrice = asset.price * (1 + spreadRate);
  const subtotal = unitPrice * quantity;
  const fees = subtotal * feeRate;
  const totalCost = subtotal + fees;

  if (totalCost > state.cash) {
    return { assetId, quantity, unitPrice, totalCost, fees, spread: spreadRate, canExecute: false, reason: 'trade.insufficient_cash' };
  }

  return { assetId, quantity, unitPrice, totalCost, fees, spread: spreadRate, canExecute: true };
}

export function quoteSell(state: GameState, assetId: string, quantity: number): TradeQuote {
  if (quantity <= 0) {
    return { assetId, quantity, unitPrice: 0, totalCost: 0, fees: 0, spread: 0, canExecute: false, reason: 'trade.invalid_quantity' };
  }
  const def = state.assetCatalog[assetId];
  const asset = state.assets[assetId];
  if (!def || !asset) {
    return { assetId, quantity, unitPrice: 0, totalCost: 0, fees: 0, spread: 0, canExecute: false, reason: 'trade.halted' };
  }

  if (asset.haltedUntilDay && state.dayIndex < asset.haltedUntilDay) {
    return { assetId, quantity, unitPrice: asset.price, totalCost: 0, fees: 0, spread: 0, canExecute: false, reason: 'trade.halted' };
  }

  const pos = state.portfolio[assetId];
  if (!pos || pos.quantity < quantity) {
    return { assetId, quantity, unitPrice: asset.price, totalCost: 0, fees: 0, spread: 0, canExecute: false, reason: 'trade.no_position' };
  }

  let spreadRate = 0;
  let feeRate = 0;

  if (def.class === 'CRYPTO_MAJOR' || def.class === 'CRYPTO_ALT') {
    spreadRate = COSTS.cryptoSpread;
    feeRate = COSTS.cryptoFee;
  } else if (def.class === 'DEBENTURE') {
    spreadRate = COSTS.debentureSpread;
  }

  // CDB110 early penalty
  if (def.id === 'CDB110') {
    spreadRate = Math.max(spreadRate, COSTS.cdb110EarlyPenalty);
  }

  const unitPrice = asset.price * (1 - spreadRate);
  const subtotal = unitPrice * quantity;
  const fees = subtotal * feeRate;
  const totalCost = subtotal - fees; // net proceeds before tax

  // Calculate tax estimate
  const taxResult = calculateSellTax(state, assetId, quantity, unitPrice);

  return {
    assetId, quantity, unitPrice, totalCost, fees, spread: spreadRate, canExecute: true,
    taxBreakdown: {
      capitalGain: taxResult.capitalGain,
      irRate: taxResult.irRate,
      irAmount: taxResult.irAmount,
      iofRate: taxResult.iofRate,
      iofAmount: taxResult.iofAmount,
      totalTax: taxResult.totalTax,
      netAfterTax: totalCost - taxResult.totalTax,
      isExempt: taxResult.isExempt,
      exemptionReason: taxResult.exemptionReason,
      lossOffset: taxResult.lossOffset,
    },
  };
}

export function executeBuy(state: GameState, quote: TradeQuote): boolean {
  if (!quote.canExecute) return false;
  state.cash -= quote.totalCost;
  const pos = state.portfolio[quote.assetId] ?? { quantity: 0, avgPrice: 0, avgPurchaseDay: state.dayIndex };
  const totalQty = pos.quantity + quote.quantity;
  // Update weighted average purchase day
  pos.avgPurchaseDay = totalQty > 0
    ? ((pos.avgPurchaseDay ?? state.dayIndex) * pos.quantity + state.dayIndex * quote.quantity) / totalQty
    : state.dayIndex;
  pos.avgPrice = totalQty > 0
    ? (pos.avgPrice * pos.quantity + quote.unitPrice * quote.quantity) / totalQty
    : 0;
  pos.quantity = totalQty;
  state.portfolio[quote.assetId] = pos;
  return true;
}

export function executeSell(state: GameState, quote: TradeQuote): boolean {
  if (!quote.canExecute) return false;
  // Apply tax (deducts from cash and updates taxState)
  applyTaxOnSell(state, quote.assetId, quote.quantity, quote.unitPrice);
  state.cash += quote.totalCost; // net proceeds before tax (tax already deducted by applyTaxOnSell)
  const pos = state.portfolio[quote.assetId]!;
  pos.quantity -= quote.quantity;
  if (pos.quantity <= 0) {
    delete state.portfolio[quote.assetId];
  }
  return true;
}
