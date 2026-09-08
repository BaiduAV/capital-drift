// ── LocalStorage persistence ──

import type { GameState } from './types';
import { initializeFixedIncome } from './fixedIncome';
import { annualToDaily, simulatedCDI } from './financialCalendar';
import { saveSchema } from './saveSchema';
import { normalizeReservations } from './cash';
import { ensureDividendSchedules } from './dividends';

const STORAGE_KEY = 'patrimonio_save';
const LOCALE_KEY = 'patrimonio_locale';

const BACKUP_KEY = 'patrimonio_save_backup';
const RECOVERY_KEY = 'patrimonio_save_recovery';
export type SaveResult = { ok: boolean; reason?: 'invalid' | 'storage' };
export type LoadResult = { state: GameState | null; status: 'empty' | 'loaded' | 'recovered' | 'blocked'; reservationsAdjusted?: boolean };

function decode(raw: string): GameState {
    const state = saveSchema.parse(JSON.parse(raw)) as GameState;
    // Backwards compat: add priceHistory if missing
    for (const [id, a] of Object.entries(state.assets)) {
      if (a.isBankrupt) { a.price = 0; a.lastReturn = 0; }
      if (!a.priceHistory) a.priceHistory = [a.price];
    }
    // Backwards compat: add cdiAccumulated if missing
    if (!state.history.cdiAccumulated) {
      state.history.cdiAccumulated = [state.history.equity[0] ?? 5000];
      for (let i = 1; i < state.history.equity.length; i++) {
        const dailyCDI = annualToDaily(simulatedCDI(state));
        const prev = state.history.cdiAccumulated[i - 1];
        state.history.cdiAccumulated.push(prev * (1 + dailyCDI));
      }
    }
    // Backwards compat: add inflationAccumulated if missing
    if (!state.history.inflationAccumulated) {
      state.history.inflationAccumulated = [1];
      for (let i = 1; i < state.history.equity.length; i++) {
        const dailyInfl = Math.expm1(Math.log1p(state.macro.inflationAnnual) / 252);
        const prev = state.history.inflationAccumulated[i - 1];
        state.history.inflationAccumulated.push(prev * (1 + dailyInfl));
      }
    }
    // Backwards compat: add new macro fields if missing
    if (state.macro.fxUSDBRL === undefined) state.macro.fxUSDBRL = 5.0;
    if (state.macro.activityAnnual === undefined) state.macro.activityAnnual = 0.02;
    if (state.macro.riskIndex === undefined) state.macro.riskIndex = 0.35;
    if (!state.achievements) state.achievements = {};
    if (!Array.isArray(state.ipoPipeline)) state.ipoPipeline = [];
    if (!state.market) state.market = { sectors: {}, newListingsCount: {} };
    if (!state.marginCallSettings) state.marginCallSettings = { drawdownThreshold: 0.50, recoveryTarget: 0.40 };
    ensureDividendSchedules(state);
    // Legacy totals cannot reconstruct past realized gains. Track future sales explicitly.
    if (state.taxState && !state.taxState.monthlyResults) {
      if (Object.values(state.taxState.monthlySales).some(sales => sales > 0)) state.taxState.reconciliationStartDay = state.dayIndex;
      state.taxState.monthlyResults = {};
    }
    state.pendingSettlements ??= [];
    initializeFixedIncome(state, state.saveVersion !== 2);
    state.saveVersion = 2;
    return state;
}

export function loadGameResult(): LoadResult {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { state: null, status: 'empty' };
    try {
      const state = decode(raw);
      const reservationsAdjusted = normalizeReservations(state) > 0;
      return { state, status: 'loaded', reservationsAdjusted };
    } catch {
      const backup = localStorage.getItem(BACKUP_KEY);
      if (backup) {
        try { const state = decode(backup); normalizeReservations(state); return { state, status: 'recovered' }; } catch { /* Keep both originals. */ }
      }
      return { state: null, status: 'blocked' };
    }
  } catch {
    return { state: null, status: 'blocked' };
  }
}

export function loadGame(): GameState | null {
  return loadGameResult().state;
}

/** Never replace unreadable data unless the player explicitly requests recovery/reset. */
export function saveGame(state: GameState, replaceInvalid = false): SaveResult {
  const candidate = { ...state, saveVersion: 2 };
  if (!saveSchema.safeParse(candidate).success) return { ok: false, reason: 'invalid' };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let valid = false;
    if (raw) {
      try { decode(raw); valid = true; } catch {
        if (!replaceInvalid) return { ok: false, reason: 'invalid' };
        localStorage.setItem(RECOVERY_KEY, raw);
      }
    }
    const next = JSON.stringify(candidate);
    if (raw === next) return { ok: true };
    if (valid) localStorage.setItem(BACKUP_KEY, raw!);
    localStorage.setItem(STORAGE_KEY, next);
    return { ok: true };
  } catch {
    return { ok: false, reason: 'storage' };
  }
}

export function deleteSave(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function hasSave(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null;
}

export function saveLocale(locale: 'pt-BR' | 'en'): void {
  try { localStorage.setItem(LOCALE_KEY, locale); } catch { /* Preference remains in memory. */ }
}

export function loadLocale(): 'pt-BR' | 'en' {
  try { return localStorage.getItem(LOCALE_KEY) === 'en' ? 'en' : 'pt-BR'; } catch { return 'pt-BR'; }
}

const THEME_KEY = 'patrimonio_theme';

export type AppTheme = 'dark' | 'light';

export function saveTheme(theme: AppTheme): void {
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* Preference remains in memory. */ }
}

export function loadTheme(): AppTheme {
  try { return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'; } catch { return 'dark'; }
}
