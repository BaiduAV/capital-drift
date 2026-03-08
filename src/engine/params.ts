// ── All simulation parameters from the design documents ──

import type { RegimeId, AssetClass, AssetDefinition, CreditRating } from './types';

// ── A. Macro ──
export const MACRO = {
  baseRate: {
    initial: 0.11,
    min: 0.02,
    max: 0.20,
    dailyVol: 0.00025,
    regimeDrift: {
      CALM: 0.0,
      BULL: -0.0001,
      BEAR: 0.0001,
      CRISIS: 0.0002,
      CRYPTO_EUPHORIA: -0.00005,
    } as Record<RegimeId, number>,
  },
  inflation: {
    initial: 0.045,
    min: 0.00,
    max: 0.12,
    dailyVol: 0.00020,
    regimeDrift: {
      CALM: 0.0,
      BULL: -0.00005,
      BEAR: 0.0001,
      CRISIS: 0.00015,
      CRYPTO_EUPHORIA: 0.0,
    } as Record<RegimeId, number>,
  },
  fxUSDBRL: {
    initial: 5.0,
    min: 3.5,
    max: 7.5,
    dailyVol: 0.008,
    regimeDrift: {
      CALM: 0.0,
      BULL: -0.0003,
      BEAR: 0.0004,
      CRISIS: 0.0012,
      CRYPTO_EUPHORIA: -0.0002,
    } as Record<RegimeId, number>,
  },
  activity: {
    initial: 0.02,
    min: -0.05,
    max: 0.08,
    dailyVol: 0.00015,
    regimeDrift: {
      CALM: 0.0,
      BULL: 0.00008,
      BEAR: -0.00006,
      CRISIS: -0.00015,
      CRYPTO_EUPHORIA: 0.00005,
    } as Record<RegimeId, number>,
  },
  risk: {
    initial: 0.35,
    min: 0.05,
    max: 0.95,
    dailyVol: 0.005,
    regimeDrift: {
      CALM: -0.001,
      BULL: -0.0015,
      BEAR: 0.002,
      CRISIS: 0.004,
      CRYPTO_EUPHORIA: 0.001,
    } as Record<RegimeId, number>,
  },
};

// ── B. Regimes ──
export const REGIME_SWITCH_PROB: Record<RegimeId, number> = {
  CALM: 0.020,
  BULL: 0.020,
  BEAR: 0.025,
  CRISIS: 0.050,
  CRYPTO_EUPHORIA: 0.040,
};

// Transition matrix: from -> { to -> weight }. Self excluded.
export const REGIME_TRANSITION: Record<RegimeId, Record<RegimeId, number>> = {
  CALM:            { CALM: 0, BULL: 0.40, BEAR: 0.35, CRISIS: 0.15, CRYPTO_EUPHORIA: 0.10 },
  BULL:            { CALM: 0.40, BULL: 0, BEAR: 0.25, CRISIS: 0.10, CRYPTO_EUPHORIA: 0.25 },
  BEAR:            { CALM: 0.35, BULL: 0.25, BEAR: 0, CRISIS: 0.30, CRYPTO_EUPHORIA: 0.10 },
  CRISIS:          { CALM: 0.45, BULL: 0.15, BEAR: 0.35, CRISIS: 0, CRYPTO_EUPHORIA: 0.05 },
  CRYPTO_EUPHORIA: { CALM: 0.25, BULL: 0.30, BEAR: 0.25, CRISIS: 0.20, CRYPTO_EUPHORIA: 0 },
};

// ── C. Drift & Volatility by class × regime ──
export interface DriftVol { drift: number; vol: number; }

export const DRIFT_VOL: Record<AssetClass, Record<RegimeId, DriftVol>> = {
  RF_POS: {
    CALM:            { drift: 0.00042, vol: 0.00005 },
    BULL:            { drift: 0.00040, vol: 0.00005 },
    BEAR:            { drift: 0.00045, vol: 0.00006 },
    CRISIS:          { drift: 0.00050, vol: 0.00008 },
    CRYPTO_EUPHORIA: { drift: 0.00038, vol: 0.00005 },
  },
  RF_PRE: {
    CALM:            { drift: 0.00030, vol: 0.0012 },
    BULL:            { drift: 0.00035, vol: 0.0014 },
    BEAR:            { drift: 0.00020, vol: 0.0016 },
    CRISIS:          { drift: -0.00010, vol: 0.0025 },
    CRYPTO_EUPHORIA: { drift: 0.00040, vol: 0.0015 },
  },
  RF_IPCA: {
    CALM:            { drift: 0.00033, vol: 0.0010 },
    BULL:            { drift: 0.00038, vol: 0.0012 },
    BEAR:            { drift: 0.00025, vol: 0.0014 },
    CRISIS:          { drift: -0.00005, vol: 0.0022 },
    CRYPTO_EUPHORIA: { drift: 0.00042, vol: 0.0013 },
  },
  DEBENTURE: {
    CALM:            { drift: 0.00036, vol: 0.0009 },
    BULL:            { drift: 0.00040, vol: 0.0010 },
    BEAR:            { drift: 0.00028, vol: 0.0012 },
    CRISIS:          { drift: -0.00020, vol: 0.0020 },
    CRYPTO_EUPHORIA: { drift: 0.00042, vol: 0.0011 },
  },
  STOCK: {
    CALM:            { drift: 0.00035, vol: 0.012 },
    BULL:            { drift: 0.00075, vol: 0.013 },
    BEAR:            { drift: -0.00040, vol: 0.015 },
    CRISIS:          { drift: -0.00120, vol: 0.025 },
    CRYPTO_EUPHORIA: { drift: 0.00060, vol: 0.014 },
  },
  ETF: {
    CALM:            { drift: 0.00030, vol: 0.010 },
    BULL:            { drift: 0.00065, vol: 0.011 },
    BEAR:            { drift: -0.00035, vol: 0.012 },
    CRISIS:          { drift: -0.00100, vol: 0.020 },
    CRYPTO_EUPHORIA: { drift: 0.00050, vol: 0.012 },
  },
  FII: {
    CALM:            { drift: 0.00028, vol: 0.006 },
    BULL:            { drift: 0.00040, vol: 0.007 },
    BEAR:            { drift: -0.00015, vol: 0.008 },
    CRISIS:          { drift: -0.00070, vol: 0.014 },
    CRYPTO_EUPHORIA: { drift: 0.00035, vol: 0.007 },
  },
  CRYPTO_MAJOR: {
    CALM:            { drift: 0.00040, vol: 0.030 },
    BULL:            { drift: 0.00100, vol: 0.035 },
    BEAR:            { drift: -0.00080, vol: 0.045 },
    CRISIS:          { drift: -0.00160, vol: 0.070 },
    CRYPTO_EUPHORIA: { drift: 0.00250, vol: 0.060 },
  },
  CRYPTO_ALT: {
    CALM:            { drift: 0.00050, vol: 0.045 },
    BULL:            { drift: 0.00130, vol: 0.055 },
    BEAR:            { drift: -0.00110, vol: 0.075 },
    CRISIS:          { drift: -0.00220, vol: 0.110 },
    CRYPTO_EUPHORIA: { drift: 0.00350, vol: 0.100 },
  },
  FX: {
    CALM:            { drift: 0.00010, vol: 0.008 },
    BULL:            { drift: -0.00020, vol: 0.009 },
    BEAR:            { drift: 0.00030, vol: 0.011 },
    CRISIS:          { drift: 0.00080, vol: 0.018 },
    CRYPTO_EUPHORIA: { drift: -0.00010, vol: 0.009 },
  },
};

// ── D. Correlation ──
export const CORR_STRENGTH: Record<RegimeId, number> = {
  CALM: 0.25,
  BULL: 0.35,
  BEAR: 0.45,
  CRISIS: 0.70,
  CRYPTO_EUPHORIA: 0.30,
};

export const CRISIS_CRYPTO_CROSS_LINK = 0.15;

// ── E. Costs & Spreads ──
export const COSTS = {
  equityBrokerage: 0,
  cryptoFee: 0.0025,
  cryptoSpread: 0.0015,
  debentureSpread: 0.0030,
  cdb110EarlyPenalty: 0.005,
};

// ── F. Dividends ──
export const DIVIDENDS = {
  fiiPeriodDays: 30,
  fiiYieldRange: [0.07, 0.12] as [number, number],
  stockPeriodDays: 90,
  stockYieldRange: [0.02, 0.06] as [number, number],
};

// ── G. Events ──
export const EVENT_BASE_PROB: Record<RegimeId, number> = {
  CALM: 0.12,
  BULL: 0.14,
  BEAR: 0.16,
  CRISIS: 0.22,
  CRYPTO_EUPHORIA: 0.18,
};

export const DOUBLE_EVENT_PROB = 0.10;

export const EVENT_IMPACTS = {
  rateHike:   { rateDelta: [0.003, 0.010], equityShock: [-0.015, -0.004] },
  rateCut:    { rateDelta: [-0.010, -0.003], equityShock: [0.004, 0.015] },
  inflationUp:   { inflDelta: [0.002, 0.010] },
  inflationDown: { inflDelta: [-0.010, -0.002] },
  cryptoHack: { majorShock: [-0.10, -0.03], altShock: [-0.18, -0.06] },
  cryptoEuphoria: { altShock: [0.05, 0.20] },
  cryptoRugPull: { targetShock: [-0.80, -0.40] },
  fxShock: { fxDelta: [0.03, 0.10], riskDelta: [0.02, 0.06], equityShock: [-0.02, -0.005] },
  fiscalStress: { riskDelta: [0.04, 0.10], rateDelta: [0.002, 0.008], activityDelta: [-0.005, -0.001], equityShock: [-0.015, -0.005] },
  commodityBoom: { activityDelta: [0.002, 0.008], fxDelta: [-0.05, -0.01], riskDelta: [-0.03, -0.01], equityShock: [0.005, 0.02] },
};

// ── H. Credit ──
export const CREDIT = {
  watchProbDaily: { AA: 0.0008, BBB: 0.0018 } as Record<CreditRating, number>,
  watchWindowDays: 7,
  defaultProbTotal: { AA: 0.02, BBB: 0.08 } as Record<CreditRating, number>,
  principalLoss: { AA: [0.30, 0.50], BBB: [0.50, 0.85] } as Record<CreditRating, [number, number]>,
};

// ── I. Initial state ──
export const INITIAL_CASH = 5000;
export const INITIAL_REGIME: RegimeId = 'CALM';

// ── J. Macro-to-pricing tilt coefficients ──
export const MACRO_TILT = {
  equityActivityCoeff: 0.008,   // positive activity boosts equity
  equityRiskCoeff: 0.006,       // high risk hurts equity
  bondsLongRateSensitivity: 0.15, // rate change impact on RF_PRE/RF_IPCA
  bondsLongRiskSensitivity: 0.003, // risk impact on long bonds
};
