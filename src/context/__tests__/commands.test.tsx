import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { GameProvider, useGame } from '../GameContext';
import { buyFixture, gameFixture, ipoFixture } from '@/test/factories/game';
import { loadGame, saveGame, loadLocale } from '@/engine/persistence';
import { computeEquity, computeMaxDrawdown } from '@/engine/invariants';
import { toast } from 'sonner';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), warning: vi.fn() } }));
afterEach(() => { cleanup(); localStorage.clear(); vi.clearAllMocks(); });
const setup = () => renderHook(() => useGame(), { wrapper: GameProvider });

function investedGame() {
  const state = gameFixture();
  state.assetCatalog.CDBPRE.fixedIncome!.termBusinessDays = 2;
  buyFixture(state, 'CDBPRE', 5);
  buyFixture(state, 'CDB100', 5);
  buyFixture(state, 'BOVA11', 5);
  state.pendingSettlements = [{ assetId: 'TSELIC', amount: 99, dueDay: 2 }];
  state.taxState = { totalIRPaid: 30, totalIOFPaid: 0, accumulatedLosses: {}, monthlySales: { 0: 20100 }, monthlyResults: { 0: { STOCK: { gain: 200, openingLoss: 0, taxPaid: 30 } } } };
  ipoFixture(state, 'TESTIPO', 1, 1);
  return state;
}

describe('real provider commands', () => {
  it.each([7, 30])('fast-forward %i days matches individual advances, including persistence', days => {
    const initial = investedGame();
    expect(saveGame(initial).ok).toBe(true);
    let hook = setup();
    act(() => { for (let i = 0; i < days; i++) hook.result.current.advanceDay(); });
    const expected = structuredClone(hook.result.current.state);
    const results = hook.result.current.dayResults;
    hook.unmount();
    localStorage.clear();
    expect(saveGame(initial).ok).toBe(true);
    hook = setup();
    act(() => {
      const period = hook.result.current.fastForward(days);
      expect(period.startDay).toBe(0);
      expect(period.endDay).toBe(days);
      expect(period.totalReturn).toBeCloseTo(computeEquity(expected) / computeEquity(initial) - 1);
      expect(period.maxDrawdown).toBe(computeMaxDrawdown([computeEquity(initial), ...results.map(r => r.metrics.equityAfter)]));
    });
    expect(hook.result.current.state).toEqual(expected);
    expect(hook.result.current.dayResults).toEqual(results);
    expect(hook.result.current.state.portfolio.CDBPRE?.quantity ?? 0).toBe(0);
    expect(hook.result.current.state.pendingSettlements).toHaveLength(0);
    expect(hook.result.current.state.achievements.ipo_participant).toEqual({ unlockedAtDay: 2 });
    expect(loadGame()).toEqual(expected);
    hook.unmount();
    hook = setup();
    expect(hook.result.current.state).toEqual(expected);
  });
  it('reloading midway preserves the next random draw, curves and lot accounting', () => {
    expect(saveGame(investedGame()).ok).toBe(true);
    let hook = setup();
    act(() => { hook.result.current.fastForward(3); });
    const checkpoint = loadGame()!;
    act(() => { hook.result.current.fastForward(4); });
    const expected = hook.result.current.state;
    hook.unmount();
    expect(saveGame(checkpoint).ok).toBe(true);
    hook = setup();
    act(() => { hook.result.current.fastForward(4); });
    expect(hook.result.current.state).toEqual(expected);
  });
  it('reports partial batch execution and unlocks first trade exactly once', () => {
    const hook = setup();
    act(() => {
      expect(hook.result.current.batchTrades(({ buy, sell }) => {
        buy('BOVA11', 1); buy('MISSING', 1); sell('BOVA11', 1);
      })).toEqual({ executed: 2, rejected: 1 });
    });
    expect(hook.result.current.state.achievements.first_trade).toEqual({ unlockedAtDay: 0 });
    expect(toast.success).toHaveBeenCalledTimes(1);
    act(() => { hook.result.current.batchTrades(({ buy }) => { buy('TSELIC', 1); }); });
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(loadGame()!.portfolio.TSELIC.quantity).toBe(1);
  });
  it('does not save, award or report success for rejected or aborted batches', () => {
    const hook = setup();
    const initial = hook.result.current.state;
    const saved = localStorage.getItem('patrimonio_save');
    act(() => { expect(hook.result.current.batchTrades(({ buy }) => { buy('MISSING', 1); })).toEqual({ executed: 0, rejected: 1 }); });
    expect(() => hook.result.current.batchTrades(({ buy }) => { buy('TSELIC', 1); throw new Error('abort'); })).toThrow('abort');
    expect(hook.result.current.state).toBe(initial);
    expect(localStorage.getItem('patrimonio_save')).toBe(saved);
    expect(toast.success).not.toHaveBeenCalled();
  });
  it('persists IPO reservations, settings and locale while rejecting invalid commands', () => {
    const state = gameFixture();
    ipoFixture(state, 'TESTIPO', 0, 7);
    expect(saveGame(state).ok).toBe(true);
    const hook = setup();
    act(() => {
      expect(hook.result.current.reserveIPO('TESTIPO', 3)).toBe(true);
      expect(hook.result.current.reserveIPO('TESTIPO', 100)).toBe(false);
      hook.result.current.updateMarginCallSettings({ drawdownThreshold: .2, recoveryTarget: .3 });
      hook.result.current.updateMarginCallSettings({ drawdownThreshold: NaN, recoveryTarget: 2 });
      hook.result.current.switchLocale();
    });
    expect(loadGame()!.ipoPipeline[0].playerReservation).toBe(3);
    expect(loadGame()!.marginCallSettings).toEqual({ drawdownThreshold: .2, recoveryTarget: .3 });
    expect(loadLocale()).toBe('en');
    act(() => { hook.result.current.switchLocale(); });
    expect(loadLocale()).toBe('pt-BR');
  });
});
