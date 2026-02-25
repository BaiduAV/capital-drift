// ── LocalStorage persistence ──

import type { GameState } from './types';

const STORAGE_KEY = 'patrimonio_save';
const LOCALE_KEY = 'patrimonio_locale';

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save game:', e);
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GameState;
  } catch {
    return null;
  }
}

export function deleteSave(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function hasSave(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null;
}

export function saveLocale(locale: 'pt-BR' | 'en'): void {
  localStorage.setItem(LOCALE_KEY, locale);
}

export function loadLocale(): 'pt-BR' | 'en' {
  return (localStorage.getItem(LOCALE_KEY) as 'pt-BR' | 'en') || 'pt-BR';
}
