// One simulation step is one business day. Taxes and lockups use calendar dates.
import type { GameState } from './types';
const DAY = 86400000;
export const START_DATE = '2026-01-02';
export const addCalendarDays = (date: string, days: number) => new Date(Date.parse(date + 'T00:00:00Z') + days * DAY).toISOString().slice(0, 10);
export const calendarDaysBetween = (start: string, end: string) => Math.round((Date.parse(end) - Date.parse(start)) / DAY);
const holidayCache = new Map<number, Set<string>>();
function holidays(year: number): Set<string> {
  if (holidayCache.has(year)) return holidayCache.get(year)!;
  // Gregorian Easter; recurring national/B3 full-day closures (no intraday model).
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = (h + l - 7 * m + 114) % 31 + 1;
  const easter = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const dates = new Set(['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-24', '12-25', '12-31'].map(s => `${year}-${s}`));
  for (const offset of [-48, -47, -2, 60]) dates.add(addCalendarDays(easter, offset));
  holidayCache.set(year, dates);
  return dates;
}
export function isBusinessDay(date: string): boolean {
  const d = new Date(date + 'T00:00:00Z');
  return d.getUTCDay() !== 0 && d.getUTCDay() !== 6 && !holidays(d.getUTCFullYear()).has(date);
}
export function addBusinessDays(date: string, count: number): string {
  const direction = count < 0 ? -1 : 1;
  let remaining = Math.abs(Math.trunc(count)), next = date;
  while (remaining > 0) { next = addCalendarDays(next, direction); if (isBusinessDay(next)) remaining--; }
  return next;
}
export const gameDate = (state: GameState) => state.calendarDate ?? addBusinessDays(START_DATE, state.dayIndex);
export const dateAtDay = (state: GameState, day: number) => addBusinessDays(gameDate(state), Math.round(day - state.dayIndex));
export function taxMonth(state: GameState): number {
  if (!state.calendarDate) return Math.floor(state.dayIndex / 30); // legacy/custom states
  return Number(state.calendarDate.slice(0, 4)) * 12 + Number(state.calendarDate.slice(5, 7)) - 1;
}
export const annualToDaily = (rate: number) => Math.expm1(Math.log1p(rate) / 252);
// DI is a simulated index, distinct from the Selic target; no live market feed.
export const simulatedCDI = (state: GameState) => Math.max(0, state.macro.baseRateAnnual - 0.001);
