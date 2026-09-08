import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, renderHook, screen } from '@testing-library/react';
import { GameProvider, useGame } from '../GameContext';
import { createGameState } from '../../engine/init';
import { loadGame, loadGameResult, saveGame } from '../../engine/persistence';
import { quoteBuy } from '../../engine/trading';

const KEY = 'patrimonio_save';
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });
const setup = () => renderHook(() => useGame(), { wrapper: GameProvider });

describe('save protection and recovery', () => {
  it('preserves unreadable original data and pauses autosave', () => {
    localStorage.setItem(KEY, '{broken');
    const hook = setup();
    act(() => { hook.result.current.buy('TSELIC', 1); });
    expect(localStorage.getItem(KEY)).toBe('{broken');
    expect(screen.getByRole('alert').textContent).toContain('salvamento está pausado');
  });

  it.each([
    { cash: 'invalid' }, { cash: -1 }, { dayIndex: 0.5 }, { saveVersion: 5 },
    { portfolio: { MISSING: { quantity: 1, avgPrice: 100 } } },
    { pendingSettlements: [{ assetId: 'TSELIC', amount: -100, dueDay: 7 }] },
  ])('rejects invalid or unsupported persisted state: %j', patch => {
    const raw = JSON.stringify({ ...createGameState(1), ...patch });
    localStorage.setItem(KEY, raw);
    expect(loadGameResult().status).toBe('blocked');
    expect(saveGame(createGameState(2)).ok).toBe(false);
    expect(localStorage.getItem(KEY)).toBe(raw);
  });

  it('restores a valid backup only after explicit recovery and archives the original', () => {
    const state = createGameState(1);
    state.cash = 4321;
    localStorage.setItem('patrimonio_save_backup', JSON.stringify(state));
    localStorage.setItem(KEY, '{broken');
    const hook = setup();
    expect(hook.result.current.state.cash).toBe(4321);
    expect(localStorage.getItem(KEY)).toBe('{broken');
    fireEvent.click(screen.getByRole('button', { name: /Salvar partida recuperada/ }));
    expect(JSON.parse(localStorage.getItem(KEY)!).cash).toBe(4321);
    expect(localStorage.getItem('patrimonio_save_recovery')).toBe('{broken');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('keeps the previous valid snapshot as backup', () => {
    const state = createGameState(1);
    expect(saveGame(state).ok).toBe(true);
    state.cash = 4000;
    expect(saveGame(state).ok).toBe(true);
    expect(JSON.parse(localStorage.getItem('patrimonio_save_backup')!).cash).toBe(5000);
    expect(loadGame()!.saveVersion).toBe(4);
  });

  it('reports storage failure visibly without replacing the original', () => {
    const original = JSON.stringify(createGameState(1));
    localStorage.setItem(KEY, original);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError'); });
    const hook = setup();
    act(() => { hook.result.current.buy('TSELIC', 1); });
    expect(screen.getByRole('alert').textContent).toContain('Não foi possível salvar');
    expect(localStorage.getItem(KEY)).toBe(original);
  });

  it('reports a failed reset without changing the game and succeeds on retry', () => {
    const hook = setup();
    act(() => { hook.result.current.buy('TSELIC', 1); hook.result.current.advanceDay(); });
    const before = hook.result.current.state;
    const results = hook.result.current.dayResults;
    const macro = hook.result.current.prevMacro;
    const saved = localStorage.getItem(KEY);
    const storage = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError'); });
    act(() => { expect(hook.result.current.newGame(42)).toBe(false); });
    expect(hook.result.current.state).toBe(before);
    expect(hook.result.current.dayResults).toBe(results);
    expect(hook.result.current.prevMacro).toBe(macro);
    expect(localStorage.getItem(KEY)).toBe(saved);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    storage.mockRestore();
    act(() => { expect(hook.result.current.newGame(42)).toBe(true); });
    expect(hook.result.current.state.seed).toBe(42);
    expect(hook.result.current.state.dayIndex).toBe(0);
    expect(hook.result.current.dayResults).toEqual([]);
    expect(hook.result.current.prevMacro).toBeNull();
    expect(loadGame()!.seed).toBe(42);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('migrates overbooked IPOs deterministically and marks incomplete legacy tax history', () => {
    const state = createGameState(1);
    state.ipoPipeline = ['A', 'B'].map(ticker => ({ ticker, displayName: ticker, sector: 'NONE', assetClass: 'STOCK', offerPrice: 100, announcedDay: 0, listingDay: 7, status: 'bookbuilding', demand: 0.5, playerReservation: 40, catalogEntry: { ...state.assetCatalog.TSELIC, id: ticker, class: 'STOCK' } }));
    state.taxState = { totalIRPaid: 123, totalIOFPaid: 10, accumulatedLosses: { STOCK: -50 }, monthlySales: { 0: 20000 } };
    localStorage.setItem(KEY, JSON.stringify(state));
    const loaded = loadGameResult();
    expect(loaded.reservationsAdjusted).toBe(true);
    expect(loaded.state.ipoPipeline.map(e => e.playerReservation)).toEqual([40, 10]);
    expect(loaded.state.taxState.totalIRPaid).toBe(123);
    expect(loaded.state.taxState.reconciliationStartDay).toBe(0);
  });

  it('retains monthly accounting and receivables across reload', () => {
    const state = createGameState(1);
    state.pendingSettlements = [{ assetId: 'DEBAA', amount: 99, dueDay: 7 }];
    state.taxState = { totalIRPaid: 30, totalIOFPaid: 0, accumulatedLosses: {}, monthlySales: { 0: 20100 }, monthlyResults: { 0: { STOCK: { gain: 200, openingLoss: 0, taxPaid: 30 } } } };
    expect(saveGame(state).ok).toBe(true);
    expect(loadGame()!.pendingSettlements).toEqual(state.pendingSettlements);
    expect(loadGame()!.taxState).toEqual(state.taxState);
  });
});

describe('serialized game commands', () => {
  it('records two buys in the same React batch and saves the final state', () => {
    const hook = setup();
    act(() => {
      expect(hook.result.current.buy('TSELIC', 1).success).toBe(true);
      expect(hook.result.current.buy('TSELIC', 1).success).toBe(true);
    });
    expect(hook.result.current.state.portfolio.TSELIC.quantity).toBe(2);
    expect(hook.result.current.state.cash).toBe(4800);
    expect(loadGame()!.portfolio.TSELIC.quantity).toBe(2);
  });

  it('checks the latest cash for sequential orders before React renders', () => {
    const hook = setup();
    act(() => {
      expect(hook.result.current.buy('TSELIC', 30).success).toBe(true);
      expect(hook.result.current.buy('TSELIC', 30).success).toBe(false);
    });
    expect(hook.result.current.state.portfolio.TSELIC.quantity).toBe(30);
  });

  it('advances two distinct days in the same batch', () => {
    const hook = setup();
    act(() => { hook.result.current.advanceDay(); hook.result.current.advanceDay(); });
    expect(hook.result.current.state.dayIndex).toBe(2);
    expect(hook.result.current.dayResults.map(day => day.dayIndex)).toEqual([1, 2]);
  });

  it('revalidates quotes after a new render while keeping commands current', () => {
    const hook = setup();
    act(() => { hook.result.current.buy('TSELIC', 40); });
    expect(hook.result.current.getBuyQuote('TSELIC', 11)).toEqual(quoteBuy(hook.result.current.state, 'TSELIC', 11));
    expect(hook.result.current.getBuyQuote('TSELIC', 11).canExecute).toBe(false);
  });

  it('rolls back a batch if its callback throws', () => {
    const hook = setup();
    const before = hook.result.current.state;
    expect(() => hook.result.current.batchTrades(({ buy }) => { buy('TSELIC', 1); throw new Error('abort'); })).toThrow('abort');
    expect(hook.result.current.state).toBe(before);
    act(() => { hook.result.current.buy('TSELIC', 1); });
    expect(hook.result.current.state.portfolio.TSELIC.quantity).toBe(1);
  });
});

it('archives an unreadable save from the recovery banner before starting a new game', () => {
  localStorage.setItem(KEY, '{broken');
  const hook = setup();
  fireEvent.click(screen.getByRole('button', { name: 'Arquivar save original e iniciar nova partida' }));
  expect(localStorage.getItem('patrimonio_save_recovery')).toBe('{broken');
  expect(loadGame()!.dayIndex).toBe(0);
  expect(loadGame()!.cash).toBe(5000);
  expect(loadGame()).toMatchObject(hook.result.current.state);
  expect(screen.queryByRole('alert')).toBeNull();
});
