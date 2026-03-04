import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveGame, loadGame } from '../persistence';
import { createGameState } from '../init';

describe('Engine - Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('can save and load a game state securely', () => {
    const state = createGameState(123);
    saveGame(state);

    const loaded = loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded?.cash).toBe(state.cash);
    expect(loaded?.dayIndex).toBe(state.dayIndex);
  });

  it('loads legacy saves without a checksum wrapper', () => {
    const state = createGameState(123);
    localStorage.setItem('patrimonio_save', JSON.stringify(state));

    const loaded = loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded?.cash).toBe(state.cash);
  });

  it('rejects tampered saves where data is changed but hash remains the same', () => {
    const state = createGameState(123);
    saveGame(state);

    const raw = localStorage.getItem('patrimonio_save');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);

    // Tamper with the data string
    const tamperedData = JSON.parse(parsed.data);
    tamperedData.cash = 9999999;
    parsed.data = JSON.stringify(tamperedData);

    localStorage.setItem('patrimonio_save', JSON.stringify(parsed));

    // Suppress console.warn for this test
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const loaded = loadGame();
    expect(loaded).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith('Save file checksum validation failed! Possible tampering detected.');

    warnSpy.mockRestore();
  });
});
