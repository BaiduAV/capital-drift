// ── Core Types for Patrimônio Simulation Engine ──

export type RegimeId = 'CALM' | 'BULL' | 'BEAR' | 'CRISIS' | 'CRYPTO_EUPHORIA';

export type AssetClass = 'RF_POS' | 'RF_PRE' | 'RF_IPCA' | 'DEBENTURE' | 'STOCK' | 'ETF' | 'FII' | 'CRYPTO_MAJOR' | 'CRYPTO_ALT' | 'FX';

export type CorrGroup = 'EQUITY' | 'CRYPTO' | 'FIXED_INCOME' | 'FX';

export type Sector =
  | "ENERGIA" | "BANCOS" | "VAREJO" | "AGRO"
  | "TECH" | "MINERACAO" | "SAUDE"
  | "INDUSTRIA" | "UTILITIES" | "IMOB"
  | "TELECOM" | "LOGISTICA"
  | "TOTAL_MARKET" | "DIVIDENDS" | "SMALL_CAPS" | "BRICK"
  | "PAPER" | "HYBRID" | "NONE";

export type SectorBubbleState = {
  sentiment: number;
  bubble: number;
  stress: number;
  ipoHeat: number;
};

export type CreditRating = 'AA' | 'BBB';

export type LiquidityRule = 'D0' | 'D7' | 'D30_OR_PENALTY';

export interface AssetDefinition {
  id: string;
  nameKey: string; // i18n key
  displayName?: string; // Dynamic name for generated assets (used when no i18n key exists)
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
  isBankrupt?: boolean;
  nextDividendDay?: number; // per-asset dividend schedule
  ipoVolatilityUntilDay?: number; // elevated vol post-listing
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
  fxUSDBRL: number;
  activityAnnual: number;
  riskIndex: number;
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
  history: { equity: number[]; drawdown: number[]; cdiAccumulated: number[]; inflationAccumulated: number[] };
  seed: number;
  rngState: number;
  events: { active: PersistentEvent[] };
  market: {
    sectors: Partial<Record<Sector, SectorBubbleState>>;
    newListingsCount: Partial<Record<Sector, number>>;
  };
  ipoPipeline: IPOPipelineEntry[];
  achievements: Record<string, { unlockedAtDay: number }>;
  marginCallSettings: { drawdownThreshold: number; recoveryTarget: number };
}

export interface IPOPipelineEntry {
  ticker: string;
  displayName: string;
  sector: Sector;
  assetClass: 'STOCK' | 'FII';
  offerPrice: number;
  announcedDay: number;
  listingDay: number;
  status: 'announced' | 'bookbuilding' | 'listed';
  demand: number;
  playerReservation: number;
  catalogEntry: AssetDefinition;
}

export interface PersistentEvent {
  id: string; // unique instance id
  card: EventCard;
  startedAtDay: number;
  durationDays: number;
  // Allows fading logic or immediate decay
}

export type SimulationState = GameState;

export type EventType = 'RATE_HIKE' | 'RATE_CUT' | 'INFLATION_UP' | 'INFLATION_DOWN' | 'SECTOR_BOOM' | 'SECTOR_BUST' | 'CRYPTO_HACK' | 'CRYPTO_EUPHORIA_EVENT' | 'CRYPTO_RUG_PULL' | 'CREDIT_DOWNGRADE' | 'FX_SHOCK' | 'FISCAL_STRESS' | 'COMMODITY_BOOM' | 'SECTOR_CRASH' | 'FLASH_CRASH' | 'MARGIN_CALL' | 'IPO_ANNOUNCED' | 'IPO_BOOKBUILDING' | 'IPO_LISTED';

export interface EventCard {
  type: EventType;
  titleKey: string;
  descriptionKey: string;
  impact: Record<string, number>; // assetId -> return shock
  macroImpact?: { baseRateDelta?: number; inflationDelta?: number; fxDelta?: number; activityDelta?: number; riskDelta?: number };
  magnitude: number; // absolute impact for ranking
  vars?: Record<string, string>; // i18n interpolation variables
}

export interface DayResult {
  state: SimulationState;
  metrics: {
    equityBefore: number;
    equityAfter: number;
    dividendsPaid: number;
    dividendDetails: { assetId: string; amount: number; quantity: number }[];
  };
  warnings: string[];
  trace: {
    previousRegime: RegimeId;
    currentRegime: RegimeId;
    eventsApplied: string[]; // event type + magnitude info
    marketSummary: { topGainers: string[]; topLosers: string[] };
    phases: string[];
  };

  // Legacy fields for partial compatibility with simulatePeriod
  dayIndex: number; // same as state.dayIndex
  regime: RegimeId; // same as trace.currentRegime
  previousRegime: RegimeId; // same as trace.previousRegime
  events: EventCard[]; // newly generated events this day
  equityBefore: number; // same as metrics.equityBefore
  equityAfter: number; // same as metrics.equityAfter
  dividendsPaid: number; // same as metrics.dividendsPaid
}

import type { RNG } from './rng';

export interface DayContext {
  dayIndex: number;
  dt: number;
  rng: {
    market: RNG;
    macro: RNG;
    events: RNG;
    agents: RNG;
    names: RNG;
  };
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
