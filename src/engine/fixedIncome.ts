import type { FixedIncomeInstrument, FixedIncomeLot, FixedIncomeTerms, GameState, TradeQuote, EventCard } from './types';
import type { RNG } from './rng';
import { annualToDaily, simulatedCDI, gameDate, dateAtDay, calendarDaysBetween, addBusinessDays, taxMonth, START_DATE } from './financialCalendar';
import { getFixedIncomeIRRate, getIOFRate } from './fixedIncomeTax';

// Illustrative contracts, not live offers. All instruments use bullet payments.
const terms = (overrides: Partial<FixedIncomeTerms>): FixedIncomeTerms => ({
  kind: 'BANK', indexer: 'CDI', annualRate: 0, cdiPercent: 1, termBusinessDays: 504,
  lockCalendarDays: 0, redemption: 'DAILY', settlementBusinessDays: 0,
  issuer: 'Banco Aurora (simulado)', fgcCovered: true, taxExempt: false, custodyAnnual: 0, ...overrides,
});
export const FIXED_INCOME_CONTRACTS: Record<string, FixedIncomeTerms> = {
  CDB100: terms({}),
  CDB110: terms({ cdiPercent: 1.1, lockCalendarDays: 30, issuer: 'Banco Horizonte (simulado)' }),
  CDBPRE: terms({ indexer: 'FIXED', annualRate: 0.12, termBusinessDays: 252, redemption: 'MATURITY' }),
  TSELIC: terms({ kind: 'TREASURY', indexer: 'SELIC', termBusinessDays: 756, issuer: 'Tesouro Nacional', fgcCovered: false, custodyAnnual: 0.002 }),
  TPRE: terms({ kind: 'TREASURY', indexer: 'FIXED', annualRate: 0.12, termBusinessDays: 504, issuer: 'Tesouro Nacional', fgcCovered: false, custodyAnnual: 0.002 }),
  TIPCA: terms({ kind: 'TREASURY', indexer: 'IPCA', annualRate: 0.06, termBusinessDays: 1260, issuer: 'Tesouro Nacional', fgcCovered: false, custodyAnnual: 0.002 }),
  DEBAA: terms({ kind: 'CORPORATE', indexer: 'CDI', annualRate: 0.02, termBusinessDays: 756, redemption: 'SECONDARY', settlementBusinessDays: 1, issuer: 'Energia Aurora (simulada)', fgcCovered: false }),
  DEBBBB: terms({ kind: 'CORPORATE', indexer: 'CDI', annualRate: 0.04, termBusinessDays: 756, redemption: 'SECONDARY', settlementBusinessDays: 1, issuer: 'Indústria Horizonte (simulada)', fgcCovered: false }),
};

export function marketYield(state: GameState, t: FixedIncomeTerms): number {
  const riskPremium = (state.macro.riskIndex - 0.35) * (t.kind === 'CORPORATE' ? 0.10 : 0.02);
  if (t.kind === 'CORPORATE') return Math.max(0, t.annualRate + riskPremium);
  if (t.indexer === 'IPCA') return Math.max(-0.01, (1 + state.macro.baseRateAnnual) / (1 + state.macro.inflationAnnual) - 1 + 0.005 + riskPremium);
  return Math.max(0, state.macro.baseRateAnnual + 0.01 + riskPremium);
}
function newInstrument(state: GameState, id: string): FixedIncomeInstrument {
  const t = state.assetCatalog[id].fixedIncome!;
  const price = state.assets[id].price;
  const yieldRate = marketYield(state, t);
  return { maturityDay: state.dayIndex + t.termBusinessDays,
    faceValue: price * Math.pow(1 + yieldRate, t.termBusinessDays / 252),
    bookValue: price, inflationFactor: 1, issuedYield: yieldRate, marketYield: yieldRate };
}

/** Migration is prospective: retain prices, quantities and costs; never fabricate historical lots. */
export function initializeFixedIncome(state: GameState, legacy = false): void {
  if (!state.calendarDate) {
    // Old saves had no real dates: retain their approximate age on migration.
    state.calendarDate = legacy ? new Date(Date.parse(START_DATE) + state.dayIndex * 86400000).toISOString().slice(0, 10) : START_DATE;
    if (legacy && state.taxState) {
      const oldMonth = Math.floor(state.dayIndex / 30), month = taxMonth(state);
      for (const record of [state.taxState.monthlySales, state.taxState.monthlySalesByCategory, state.taxState.monthlyResults]) {
        if (record?.[oldMonth] !== undefined) { record[month] = record[oldMonth]; delete record[oldMonth]; }
      }
    }
  }
  state.issuerDefaults ??= {};
  state.fgcHistory ??= [];
  state.fixedIncomeLog ??= [];
  for (const [id, contract] of Object.entries(FIXED_INCOME_CONTRACTS)) {
    const def = state.assetCatalog[id];
    if (!def || !state.assets[id]) continue;
    def.fixedIncome ??= { ...contract };
    const t = def.fixedIncome;
    def.liquidityRule = t.redemption === 'MATURITY' ? 'MATURITY' : t.redemption === 'SECONDARY' ? 'SECONDARY' : 'D0';
    state.assets[id].fixedIncome ??= newInstrument(state, id);
    const pos = state.portfolio[id];
    if (pos && !pos.fixedIncomeLots) {
      const age = Math.max(0, Math.round(state.dayIndex - (pos.avgPurchaseDay ?? state.dayIndex)));
      pos.fixedIncomeLots = [{ quantity: pos.quantity, unitCost: pos.avgPrice, purchaseDay: Math.max(0, Math.floor(pos.avgPurchaseDay ?? state.dayIndex)),
        purchaseDate: new Date(Date.parse(gameDate(state)) - age * 86400000).toISOString().slice(0, 10),
        maturityDay: state.assets[id].fixedIncome!.maturityDay, custodyAccrued: 0 }];
      if (legacy) state.fixedIncomeMigrationDay = state.dayIndex;
    }
  }
}

export function fixedIncomeLots(state: GameState, id: string): FixedIncomeLot[] {
  const pos = state.portfolio[id];
  if (!pos) return [];
  return pos.fixedIncomeLots ?? [{ quantity: pos.quantity, unitCost: pos.avgPrice,
    purchaseDay: pos.avgPurchaseDay ?? state.dayIndex,
    purchaseDate: dateAtDay(state, pos.avgPurchaseDay ?? state.dayIndex),
    maturityDay: state.assets[id].fixedIncome?.maturityDay ?? state.dayIndex + 252,
    custodyAccrued: 0 }];
}
export function recordFixedIncomeBuy(state: GameState, id: string, quantity: number, unitCost: number, previousLots: FixedIncomeLot[]): void {
  const t = state.assetCatalog[id].fixedIncome!;
  const settlement = t.kind === 'TREASURY' ? 1 : 0;
  state.portfolio[id].fixedIncomeLots = [...previousLots, { quantity, unitCost,
    purchaseDay: state.dayIndex + settlement, purchaseDate: dateAtDay(state, state.dayIndex + settlement),
    maturityDay: t.kind === 'BANK' ? state.dayIndex + t.termBusinessDays : state.assets[id].fixedIncome!.maturityDay,
    custodyAccrued: 0 }];
}

/** Value one business day forward after macro changes; no unrelated random price noise. */
export function projectFixedIncome(state: GameState, id: string): { price: number; instrument: FixedIncomeInstrument } {
  const t = state.assetCatalog[id].fixedIncome!;
  const instrument = { ...state.assets[id].fixedIncome! };
  if (state.issuerDefaults?.[t.issuer]) return { price: 0, instrument };
  const nextDate = addBusinessDays(gameDate(state), 1);
  const elapsed = calendarDaysBetween(gameDate(state), nextDate);
  const remaining = Math.max(0, instrument.maturityDay - state.dayIndex - 1);
  const cdi = annualToDaily(simulatedCDI(state));
  if (t.indexer === 'SELIC') instrument.bookValue *= 1 + annualToDaily(state.macro.baseRateAnnual);
  if (t.indexer === 'CDI') instrument.bookValue *= (1 + cdi * t.cdiPercent) * Math.pow(1 + t.annualRate, 1 / 252);
  if (t.indexer === 'FIXED' && t.kind === 'BANK') instrument.bookValue *= 1 + annualToDaily(t.annualRate);
  instrument.marketYield = marketYield(state, t);
  let price = instrument.bookValue;
  if (t.indexer === 'IPCA') instrument.inflationFactor *= Math.pow(1 + state.macro.inflationAnnual, elapsed / 365);
  if (t.kind === 'TREASURY' && t.indexer !== 'SELIC') {
    price = instrument.faceValue * (t.indexer === 'IPCA' ? instrument.inflationFactor : 1) / Math.pow(1 + instrument.marketYield, remaining / 252);
  } else if (t.kind === 'CORPORATE') {
    // Floating-rate credit: accrued contractual value plus repricing of credit spread.
    price *= Math.pow((1 + t.annualRate) / (1 + instrument.marketYield), remaining / 252);
  }
  return { price, instrument };
}

export function fixedIncomeSellCapacity(state: GameState, id: string): number {
  const t = state.assetCatalog[id]?.fixedIncome;
  if (!t || state.issuerDefaults?.[t.issuer]) return 0;
  if (t.redemption === 'MATURITY') return 0;
  const eligible = fixedIncomeLots(state, id).filter(l => l.purchaseDay <= state.dayIndex
    && calendarDaysBetween(l.purchaseDate, gameDate(state)) >= t.lockCalendarDays).reduce((sum, l) => sum + l.quantity, 0);
  if (t.redemption !== 'SECONDARY') return eligible;
  if (state.macro.riskIndex >= 0.8 || state.credit.watch[id]) return 0;
  const instrument = state.assets[id].fixedIncome!;
  const used = instrument.volumeDay === state.dayIndex ? instrument.volumeSold ?? 0 : 0;
  const depth = Math.max(0, Math.floor(100000 * (1 - state.macro.riskIndex) / state.assets[id].price) - used);
  return Math.min(eligible, depth);
}
function selectLots(state: GameState, id: string, quantity: number, eligible?: (lot: FixedIncomeLot) => boolean): FixedIncomeLot[] {
  let remaining = quantity;
  const selected: FixedIncomeLot[] = [];
  for (const lot of [...fixedIncomeLots(state, id)].sort((a, b) => a.purchaseDate.localeCompare(b.purchaseDate))) {
    if (eligible && !eligible(lot)) continue;
    const taken = Math.min(remaining, lot.quantity);
    if (taken > 0) selected.push({ ...lot, quantity: taken, custodyAccrued: lot.custodyAccrued * taken / lot.quantity });
    remaining -= taken;
    if (remaining <= 1e-10) break;
  }
  return selected;
}
export function fixedIncomeTax(lots: FixedIncomeLot[], unitPrice: number, date: string, exempt: boolean) {
  let capitalGain = 0, irAmount = 0, iofAmount = 0, taxable = 0, positiveGain = 0;
  for (const lot of lots) {
    const gain = (unitPrice - lot.unitCost) * lot.quantity;
    capitalGain += gain;
    if (exempt || gain <= 0) continue;
    const days = Math.max(0, calendarDaysBetween(lot.purchaseDate, date));
    const iof = gain * getIOFRate(days);
    iofAmount += iof;
    irAmount += (gain - iof) * getFixedIncomeIRRate(days);
    taxable += gain - iof;
    positiveGain += gain;
  }
  return { capitalGain, irAmount, iofAmount, totalTax: irAmount + iofAmount,
    irRate: taxable > 0 ? irAmount / taxable : 0, iofRate: positiveGain > 0 ? iofAmount / positiveGain : 0,
    isExempt: exempt, lossOffset: 0 };
}
export function quoteFixedIncomeSell(state: GameState, id: string, quantity: number): TradeQuote {
  const t = state.assetCatalog[id].fixedIncome!;
  const lots = selectLots(state, id, quantity, l => l.purchaseDay <= state.dayIndex && calendarDaysBetween(l.purchaseDate, gameDate(state)) >= t.lockCalendarDays);
  const spread = t.redemption === 'SECONDARY' ? 0.003 + state.macro.riskIndex * 0.007 : 0;
  const unitPrice = state.assets[id].price * (1 - spread);
  const fees = lots.reduce((sum, l) => sum + l.custodyAccrued, 0);
  const totalCost = unitPrice * quantity - fees;
  const settlementDay = state.dayIndex + t.settlementBusinessDays;
  const tax = fixedIncomeTax(lots, unitPrice, dateAtDay(state, settlementDay), t.taxExempt);
  const canExecute = Number.isFinite(totalCost) && Number.isFinite(tax.totalTax) && Number.isFinite(state.cash + totalCost)
    && quantity <= fixedIncomeSellCapacity(state, id) + 1e-10 && totalCost >= tax.totalTax;
  return { assetId: id, quantity, unitPrice, fees, totalCost, spread, settlementDay, canExecute,
    reason: canExecute ? undefined : t.redemption === 'MATURITY' ? 'trade.at_maturity' : t.redemption === 'SECONDARY' ? 'trade.no_liquidity' : 'trade.locked',
    taxBreakdown: { ...tax, netAfterTax: totalCost - tax.totalTax } };
}
function updatePosition(state: GameState, id: string, lots: FixedIncomeLot[]): void {
  const quantity = lots.reduce((sum, l) => sum + l.quantity, 0);
  if (quantity <= 1e-10) { delete state.portfolio[id]; return; }
  state.portfolio[id] = { quantity, avgPrice: lots.reduce((sum, l) => sum + l.unitCost * l.quantity, 0) / quantity,
    avgPurchaseDay: lots.reduce((sum, l) => sum + l.purchaseDay * l.quantity, 0) / quantity, fixedIncomeLots: lots };
}
function bookRedemption(state: GameState, id: string, lots: FixedIncomeLot[], unitPrice: number, dueDay: number): number {
  const t = state.assetCatalog[id].fixedIncome!;
  const tax = fixedIncomeTax(lots, unitPrice, dateAtDay(state, dueDay), t.taxExempt);
  const gross = lots.reduce((sum, l) => sum + l.quantity * unitPrice - l.custodyAccrued, 0);
  const amount = Math.max(0, gross - tax.totalTax);
  state.taxState ??= { totalIRPaid: 0, totalIOFPaid: 0, accumulatedLosses: {}, monthlySales: {} };
  state.taxState.totalIRPaid += tax.irAmount;
  state.taxState.totalIOFPaid += tax.iofAmount;
  if (dueDay > state.dayIndex) {
    state.pendingSettlements ??= [];
    state.pendingSettlements.push({ assetId: id, amount, dueDay });
  } else state.cash += amount;
  return amount;
}
export function executeFixedIncomeSell(state: GameState, quote: TradeQuote): boolean {
  const current = quoteFixedIncomeSell(state, quote.assetId, quote.quantity);
  if (!quote.canExecute || !current.canExecute || current.totalCost !== quote.totalCost || current.taxBreakdown!.totalTax !== quote.taxBreakdown?.totalTax || current.settlementDay !== quote.settlementDay) return false;
  const id = quote.assetId, t = state.assetCatalog[id].fixedIncome!;
  let remaining = quote.quantity;
  const kept: FixedIncomeLot[] = [], sold: FixedIncomeLot[] = [];
  for (const lot of [...fixedIncomeLots(state, id)].sort((a, b) => a.purchaseDate.localeCompare(b.purchaseDate))) {
    const eligible = lot.purchaseDay <= state.dayIndex && calendarDaysBetween(lot.purchaseDate, gameDate(state)) >= t.lockCalendarDays;
    const take = eligible ? Math.min(remaining, lot.quantity) : 0;
    if (take > 0) sold.push({ ...lot, quantity: take, custodyAccrued: lot.custodyAccrued * take / lot.quantity });
    if (lot.quantity > take) kept.push({ ...lot, quantity: lot.quantity - take, custodyAccrued: lot.custodyAccrued * (lot.quantity - take) / lot.quantity });
    remaining -= take;
  }
  bookRedemption(state, id, sold, current.unitPrice, current.settlementDay!);
  updatePosition(state, id, kept);
  if (t.redemption === 'SECONDARY') {
    const instrument = state.assets[id].fixedIncome!;
    instrument.volumeSold = (instrument.volumeDay === state.dayIndex ? instrument.volumeSold ?? 0 : 0) + quote.quantity;
    instrument.volumeDay = state.dayIndex;
  }
  return true;
}

export function accrueFixedIncomeCustody(state: GameState): void {
  const nextDate = addBusinessDays(gameDate(state), 1);
  for (const [id, pos] of Object.entries(state.portfolio)) {
    const t = state.assetCatalog[id]?.fixedIncome;
    if (!t?.custodyAnnual) continue;
    const lots = fixedIncomeLots(state, id);
    const total = state.assets[id].price * pos.quantity;
    const taxableFraction = t.indexer === 'SELIC' ? Math.max(0, total - 10000) / Math.max(total, 1) : 1;
    for (const lot of lots) {
      const from = lot.purchaseDate > gameDate(state) ? lot.purchaseDate : gameDate(state);
      const days = Math.max(0, calendarDaysBetween(from, nextDate));
      lot.custodyAccrued += state.assets[id].price * lot.quantity * taxableFraction * t.custodyAnnual * days / 365;
    }
    pos.fixedIncomeLots = lots;
  }
}
export function settleFixedIncomeMaturities(state: GameState): void {
  for (const [id, def] of Object.entries(state.assetCatalog)) {
    if (!def.fixedIncome || state.issuerDefaults?.[def.fixedIncome.issuer]) continue;
    const lots = fixedIncomeLots(state, id);
    const matured = lots.filter(l => l.maturityDay <= state.dayIndex);
    if (matured.length) {
      const amount = bookRedemption(state, id, matured, state.assets[id].price, state.dayIndex);
      updatePosition(state, id, lots.filter(l => l.maturityDay > state.dayIndex));
      state.fixedIncomeLog ??= [];
      state.fixedIncomeLog.push({ day: state.dayIndex, assetId: id, type: 'MATURITY', amount });
    }
    if (def.fixedIncome.kind !== 'BANK' && state.assets[id].fixedIncome!.maturityDay <= state.dayIndex) {
      // Replace the matured series with a new par issue; no investor is auto-reinvested.
      state.assets[id].price = 100;
      state.assets[id].priceHistory = [100];
      state.assets[id].lastReturn = 0;
      state.assets[id].fixedIncome = newInstrument(state, id);
    }
  }
  if (state.fixedIncomeLog) state.fixedIncomeLog = state.fixedIncomeLog.slice(-100);
}

/** Deterministic scenario assumptions: recovery timing/probabilities are not market guarantees. */
export function defaultFixedIncomeIssuer(state: GameState, issuer: string, recoveryFraction: number): void {
  state.issuerDefaults ??= {};
  if (state.issuerDefaults[issuer]) return;
  state.issuerDefaults[issuer] = { day: state.dayIndex, recoveryFraction };
  state.fgcHistory ??= [];
  const hasCoveredHoldings = Object.entries(state.assetCatalog).some(([id, def]) => def.fixedIncome?.issuer === issuer && def.fixedIncome.fgcCovered && state.portfolio[id]?.quantity > 0);
  if (hasCoveredHoldings) {
    state.fgcWindowStart ??= state.fgcHistory[0]?.date ?? gameDate(state);
    const windowEnd = `${Number(state.fgcWindowStart.slice(0, 4)) + 4}${state.fgcWindowStart.slice(4)}`;
    if (gameDate(state) >= windowEnd) { state.fgcHistory = []; state.fgcWindowStart = gameDate(state); }
  }
  let coverage = Math.min(250000, Math.max(0, 1000000 - state.fgcHistory.reduce((sum, h) => sum + h.amount, 0)));
  let covered = 0;
  for (const [id, def] of Object.entries(state.assetCatalog)) {
    const t = def.fixedIncome;
    if (t?.issuer !== issuer) continue;
    let payment = 0;
    for (const lot of fixedIncomeLots(state, id)) {
      const gross = lot.quantity * state.assets[id].fixedIncome!.bookValue;
      const guaranteed = t.fgcCovered ? Math.min(coverage, gross) : 0;
      coverage -= guaranteed; covered += guaranteed;
      const recovered = guaranteed + (gross - guaranteed) * recoveryFraction;
      // Interest stops at intervention. Tax age is frozen at this date.
      const tax = fixedIncomeTax([lot], recovered / lot.quantity, gameDate(state), t.taxExempt);
      const net = Math.max(0, recovered - lot.custodyAccrued - tax.totalTax);
      state.taxState ??= { totalIRPaid: 0, totalIOFPaid: 0, accumulatedLosses: {}, monthlySales: {} };
      state.taxState.totalIRPaid += tax.irAmount; state.taxState.totalIOFPaid += tax.iofAmount;
      state.pendingSettlements ??= [];
      // No statutory payment deadline is asserted: 60/126 business days are scenario parameters.
      const guaranteedNet = recovered > 0 ? net * guaranteed / recovered : 0;
      if (guaranteedNet > 0) state.pendingSettlements.push({ assetId: id, amount: guaranteedNet, dueDay: state.dayIndex + 60 });
      if (net > guaranteedNet) state.pendingSettlements.push({ assetId: id, amount: net - guaranteedNet, dueDay: state.dayIndex + 126 });
      payment += net;
    }
    delete state.portfolio[id];
    state.assets[id].price = 0;
    state.assets[id].lastReturn = -1;
    state.assets[id].isBankrupt = true;
    state.fixedIncomeLog ??= [];
    state.fixedIncomeLog.push({ day: state.dayIndex, assetId: id, type: t.fgcCovered ? 'FGC' : 'DEFAULT', amount: payment });
  }
  if (covered > 0) state.fgcHistory.push({ date: gameDate(state), amount: covered });
}
export function processFixedIncomeCredit(state: GameState, rng: RNG): EventCard[] {
  const events: EventCard[] = [], seen = new Set<string>();
  for (const [id, def] of Object.entries(state.assetCatalog)) {
    const t = def.fixedIncome;
    // Preserve the remaining legacy watch window without locking migrated bonds forever.
    const watch = state.credit.watch[id];
    if (t && watch && state.dayIndex - watch.enteredDay >= watch.windowDays) delete state.credit.watch[id];
    if (!t || t.kind === 'TREASURY' || seen.has(t.issuer) || state.issuerDefaults?.[t.issuer]) continue;
    seen.add(t.issuer);
    const probability = (t.kind === 'BANK' ? 0.000005 : def.creditRating === 'AA' ? 0.00001 : 0.00005) * (1 + state.macro.riskIndex * 4);
    if (rng.next() < probability) {
      defaultFixedIncomeIssuer(state, t.issuer, t.kind === 'BANK' ? 0.4 : def.creditRating === 'AA' ? 0.5 : 0.25);
      events.push({ type: 'CREDIT_DOWNGRADE', titleKey: 'credit.default', descriptionKey: 'credit.default', impact: {}, magnitude: 1, vars: { issuer: t.issuer } });
    }
  }
  return events;
}
