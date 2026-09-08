import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { GameProvider } from '@/context/GameContext';
import { buyFixture, gameFixture, ipoFixture } from '@/test/factories/game';
import { saveGame, loadGame } from '@/engine/persistence';
import { availableCash } from '@/engine/cash';
import QuickActions from '../QuickActions';
import RebalancePanel from '../RebalancePanel';
import { toast } from 'sonner';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), warning: vi.fn(), info: vi.fn() } }));
afterEach(() => { cleanup(); localStorage.clear(); vi.clearAllMocks(); });
function confirmStrategy(name: string) {
  fireEvent.click(screen.getByRole('button', { name }));
  fireEvent.click(screen.getByRole('button', { name }));
}
it('does not announce strategy success when all funds are in a locked CDB', () => {
  const state = gameFixture();
  buyFixture(state, 'CDBPRE', 50);
  expect(saveGame(state).ok).toBe(true);
  render(<GameProvider><QuickActions /></GameProvider>);
  confirmStrategy('Defensivo');
  expect(loadGame()!.portfolio).toEqual(state.portfolio);
  expect(loadGame()!.cash).toBe(0);
  expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining('Nenhuma operação'));
  expect(toast.success).not.toHaveBeenCalled();
});
it('reports partial execution while retaining locked positions', () => {
  const state = gameFixture();
  buyFixture(state, 'CDBPRE', 30);
  buyFixture(state, 'BOVA11', 5);
  expect(saveGame(state).ok).toBe(true);
  render(<GameProvider><QuickActions /></GameProvider>);
  confirmStrategy('Balanceado');
  expect(loadGame()!.portfolio.CDBPRE.quantity).toBe(30);
  expect(loadGame()!.portfolio.TSELIC.quantity).toBeGreaterThan(0);
  expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining('Execução parcial'));
  expect(toast.success).not.toHaveBeenCalledWith(expect.stringContaining('Estratégia'));
});
it.each(['Defensivo', 'Agressivo'])('%s respects cash reserved for IPOs', name => {
  const state = gameFixture();
  ipoFixture(state, 'TESTIPO', 40, 7);
  expect(saveGame(state).ok).toBe(true);
  render(<GameProvider><QuickActions /></GameProvider>);
  confirmStrategy(name);
  expect(availableCash(loadGame()!)).toBeGreaterThanOrEqual(0);
  expect(loadGame()!.ipoPipeline[0].playerReservation).toBe(40);
  expect(loadGame()!.cash).toBeGreaterThanOrEqual(4000);
  expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('operações executadas'));
});
it('rebalance continues to an executable asset after a larger locked position rejects the sale', () => {
  const state = gameFixture();
  buyFixture(state, 'CDBPRE', 30);
  buyFixture(state, 'CDB100', 20);
  state.dayIndex = 1; // daily-liquidity CDB can now be redeemed; CDBPRE remains locked
  expect(saveGame(state).ok).toBe(true);
  render(<GameProvider><RebalancePanel /></GameProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Rebalanceamento' }));
  fireEvent.click(screen.getByRole('button', { name: 'Rebalancear' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar Rebalanceamento' }));
  expect(loadGame()!.portfolio.CDBPRE.quantity).toBe(30);
  expect(loadGame()!.portfolio.CDB100?.quantity ?? 0).toBeLessThan(20);
  expect(loadGame()!.portfolio.BOVA11.quantity).toBeGreaterThan(0);
  expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining('Execução parcial'));
});
