// ── Core Types for Patrimônio Simulation Engine ──

export type RegimeId = 'CALM' | 'BULL' | 'BEAR' | 'CRISIS' | 'CRYPTO_EUPHORIA';

export type AssetClass = 'RF_POS' | 'RF_PRE' | 'RF_IPCA' | 'DEBENTURE' | 'STOCK' | 'ETF' | 'FII' | 'CRYPTO_MAJOR' | 'CRYPTO_ALT';

export type CorrGroup = 'EQUITY' | 'CRYPTO' | 'FIXED_INCOME';

export type Sector = 'BANK' | 'ENERGY' | 'RETAIL' | 'TECH' | 'TOTAL_MARKET' | 'DIVIDENDS' | 'SMALL_CAPS' | 'BRICK' | 'PAPER' | 'LOGISTICS' | 'HYBRID' | 'NONE';

export type CreditRating = 'AA' | 'BBB';

export type LiquidityRule = 'D0' | 'D7' | 'D30_OR_PENALTY';

export interface AssetDefinition {
  id: string;
  nameKey: string; // i18n key
  class: AssetClass;
  sector: Sector;
  corrGroup: CorrGroup;
  creditRating?: CreditRating;
  liquidityRule: LiquidityRule;
  dividendYieldAnnual?: number; // fixed per asset at init
  dividendPeriodDays?: number;  // 30 for FIIs, 90 for stocks
  initialPrice: number;
}

export interface AssetState {
  price: number;
  lastReturn: number;
  haltedUntilDay: number | null;
  priceHistory: number[]; // last 90 prices
}

export interface Position {
  quantity: number;
  avgPrice: number;
}

export interface CreditWatchState {
  enteredDay: number;
  windowDays: number;
  defaulted: boolean;
}

export interface MacroState {
  baseRateAnnual: number;
  inflationAnnual: number;
}

export interface CalendarState {
  nextFiiPayDay: number;
  nextStockPayDay: number;
}

export interface GameState {
  dayIndex: number;
  cash: number;
  portfolio: Record<string, Position>;
  assets: Record<string, AssetState>;
  assetCatalog: Record<string, AssetDefinition>;
  macro: MacroState;
  regime: RegimeId;
  calendar: CalendarState;
  credit: { watch: Record<string, CreditWatchState> };
  history: { equity: number[]; drawdown: number[]; cdiAccumulated: number[] };
  seed: number;
  rngState: number;
}

export type EventType = 'RATE_HIKE' | 'RATE_CUT' | 'INFLATION_UP' | 'INFLATION_DOWN' | 'SECTOR_BOOM' | 'SECTOR_BUST' | 'CRYPTO_HACK' | 'CRYPTO_EUPHORIA_EVENT' | 'CRYPTO_RUG_PULL' | 'CREDIT_DOWNGRADE';

export interface EventCard {
  type: EventType;
  titleKey: string;
  descriptionKey: string;
  impact: Record<string, number>; // assetId -> return shock
  macroImpact?: { baseRateDelta?: number; inflationDelta?: number };
  magnitude: number; // absolute impact for ranking
}

export interface DayResult {
  dayIndex: number;
  regime: RegimeId;
  previousRegime: RegimeId;
  events: EventCard[];
  marketSummary: { topGainers: string[]; topLosers: string[] };
  equityBefore: number;
  equityAfter: number;
  dividendsPaid: number;
}

export interface PeriodResult {
  startDay: number;
  endDay: number;
  totalReturn: number;
  maxDrawdown: number;
  events: EventCard[];
  topMovers: { asset: string; return: number }[];
  missedOpportunities: string[]; // i18n keys
}

export interface TradeQuote {
  assetId: string;
  quantity: number;
  unitPrice: number;
  totalCost: number;
  fees: number;
  spread: number;
  canExecute: boolean;
  reason?: string; // i18n key if can't execute
}
