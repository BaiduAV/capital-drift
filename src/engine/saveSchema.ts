import { z } from 'zod';

const num = z.number().finite();
const nonnegative = num.nonnegative();
const day = nonnegative.int();
const classes = z.enum(['RF_POS', 'RF_PRE', 'RF_IPCA', 'DEBENTURE', 'STOCK', 'ETF', 'FII', 'CRYPTO_MAJOR', 'CRYPTO_ALT', 'FX']);
const sector = z.enum(['ENERGIA', 'BANCOS', 'VAREJO', 'AGRO', 'TECH', 'MINERACAO', 'SAUDE', 'INDUSTRIA', 'UTILITIES', 'IMOB', 'TELECOM', 'LOGISTICA', 'TOTAL_MARKET', 'DIVIDENDS', 'SMALL_CAPS', 'BRICK', 'PAPER', 'HYBRID', 'NONE']);
const definition = z.object({
  id: z.string(), nameKey: z.string(), displayName: z.string().optional(), class: classes, sector,
  corrGroup: z.enum(['EQUITY', 'CRYPTO', 'FIXED_INCOME', 'FX']),
  liquidityRule: z.enum(['D0', 'D7', 'D30_OR_PENALTY']), initialPrice: nonnegative,
  creditRating: z.enum(['AA', 'BBB']).optional(), dividendYieldAnnual: nonnegative.optional(), dividendPeriodDays: day.positive().optional(),
}).passthrough();
const ledger = z.object({ gain: num, openingLoss: num.max(0), taxPaid: nonnegative });

/** Validate storage at runtime; TypeScript casts do not validate JSON. */
export const saveSchema = z.object({
  saveVersion: z.literal(1).optional(),
  dayIndex: day, cash: nonnegative, seed: num.int(), rngState: num.int(),
  regime: z.enum(['CALM', 'BULL', 'BEAR', 'CRISIS', 'CRYPTO_EUPHORIA']),
  portfolio: z.record(z.object({ quantity: nonnegative.max(Number.MAX_SAFE_INTEGER), avgPrice: nonnegative, avgPurchaseDay: nonnegative.optional() })),
  assets: z.record(z.object({
    price: nonnegative, lastReturn: num, haltedUntilDay: day.nullable(), priceHistory: z.array(nonnegative).optional(),
    isBankrupt: z.boolean().optional(), nextDividendDay: day.optional(), ipoVolatilityUntilDay: day.optional(),
  }).passthrough()),
  assetCatalog: z.record(definition),
  macro: z.object({ baseRateAnnual: num, inflationAnnual: num, fxUSDBRL: num.positive().optional(), activityAnnual: num.optional(), riskIndex: num.optional() }).passthrough(),
  calendar: z.object({ nextFiiPayDay: day, nextStockPayDay: day }),
  credit: z.object({ watch: z.record(z.object({ enteredDay: day, windowDays: day, defaulted: z.boolean() })) }),
  history: z.object({ equity: z.array(nonnegative).nonempty(), drawdown: z.array(nonnegative), cdiAccumulated: z.array(nonnegative).optional(), inflationAccumulated: z.array(nonnegative).optional() }),
  events: z.object({ active: z.array(z.object({ id: z.string(), startedAtDay: day, durationDays: day.positive(), card: z.object({
    type: z.string(), titleKey: z.string(), descriptionKey: z.string(), impact: z.record(num), magnitude: num,
    vars: z.record(z.string()).optional(), macroImpact: z.object({ baseRateDelta: num.optional(), inflationDelta: num.optional(), fxDelta: num.optional(), activityDelta: num.optional(), riskDelta: num.optional() }).optional(),
  }) })) }),
  market: z.object({ sectors: z.record(z.object({ sentiment: num, bubble: num, stress: num, ipoHeat: num })), newListingsCount: z.record(day) }).optional(),
  ipoPipeline: z.array(z.object({
    ticker: z.string(), displayName: z.string(), sector, assetClass: z.enum(['STOCK', 'FII']), offerPrice: num.positive(),
    announcedDay: day, listingDay: day, status: z.enum(['announced', 'bookbuilding', 'listed']), demand: nonnegative.max(1),
    playerReservation: nonnegative.max(Number.MAX_SAFE_INTEGER), catalogEntry: definition,
  })).optional(),
  achievements: z.record(z.object({ unlockedAtDay: day })).optional(),
  marginCallSettings: z.object({ drawdownThreshold: num.min(0).max(1), recoveryTarget: num.min(0).max(1) }).optional(),
  pendingSettlements: z.array(z.object({ assetId: z.string(), amount: nonnegative, dueDay: day })).optional(),
  taxState: z.object({
    reconciliationStartDay: day.optional(),
    totalIRPaid: nonnegative, totalIOFPaid: nonnegative, accumulatedLosses: z.record(num.max(0)), monthlySales: z.record(nonnegative),
    monthlySalesByCategory: z.record(z.record(nonnegative)).optional(),
    monthlyResults: z.record(z.object({ STOCK: ledger.optional(), CRYPTO: ledger.optional() })).optional(),
  }).optional(),
}).passthrough().superRefine((state, ctx) => {
  for (const id of Object.keys(state.portfolio)) {
    if (!state.assets[id] || !state.assetCatalog[id]) ctx.addIssue({ code: 'custom', message: `Missing asset for position ${id}` });
  }
  for (const id of Object.keys(state.assetCatalog)) {
    if (!state.assets[id] || state.assetCatalog[id].id !== id) ctx.addIssue({ code: 'custom', message: `Invalid catalog asset ${id}` });
  }
});
