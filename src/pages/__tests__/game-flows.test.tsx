import type { ReactElement } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import App from '@/App';
import { toast } from 'sonner';
import { buyFixture, gameFixture, ipoFixture } from '@/test/factories/game';
import { loadGame, saveGame } from '@/engine/persistence';

// jsdom has no layout. Keep the real charts, supplying only their measured size.
vi.mock('recharts', async importOriginal => {
  const actual = await importOriginal<typeof import('recharts')>();
  const { cloneElement } = await import('react');
  return { ...actual, ResponsiveContainer: ({ children, height }: { children: ReactElement; height?: number }) => cloneElement(children, { width: 600, height: height ?? 200 }) };
});
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('patrimonio_tutorial_done', 'true');
});
afterEach(() => { cleanup(); localStorage.clear(); });
function open(path: string) { window.history.replaceState({}, '', path); return render(<App />); }
function go(path: string) {
  const links = screen.getAllByRole('link').filter(a => a.getAttribute('href') === path);
  expect(links.length).toBeGreaterThan(0);
  fireEvent.click(links[0]);
}
function advance() {
  const button = screen.getByRole('button', { name: 'Toque: avançar dia / Segure: avançar 7 dias' });
  fireEvent.pointerDown(button);
  fireEvent.pointerUp(button);
}
function order(side: 'Compra' | 'Venda', quantity: number) {
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Quantidade' }), { target: { value: String(quantity) } });
  fireEvent.click(screen.getByRole('button', { name: `${side === 'Compra' ? 'Comprar' : 'Vender'} ${quantity}×` }));
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: `Confirmar ${side}` }));
}

it('buys, advances, displays the portfolio, sells and reloads through real routes', () => {
  expect(saveGame(gameFixture()).ok).toBe(true);
  let view = open('/trade?asset=CDB100');
  order('Compra', 5);
  expect(loadGame()!.portfolio.CDB100.quantity).toBe(5);
  expect(loadGame()!.cash).toBe(4500);
  advance();
  expect(loadGame()!.dayIndex).toBe(1);
  go('/portfolio');
  const row = screen.getByRole('row', { name: /CDB100/ });
  expect(within(row).getByText('5')).toBeInTheDocument();
  go('/');
  expect(screen.getByText('Patrimônio', { exact: true })).toBeInTheDocument();
  go('/market');
  fireEvent.mouseDown(screen.getByRole('tab', { name: 'Lista (Screener)' }), { button: 0, ctrlKey: false });
  fireEvent.click(screen.getByRole('button', { name: 'Negociar CDB100' }));
  fireEvent.click(screen.getByRole('button', { name: 'VENDER' }));
  order('Venda', 2);
  expect(loadGame()!.portfolio.CDB100.quantity).toBe(3);
  expect(loadGame()!.taxState!.totalIOFPaid).toBeGreaterThan(0);
  const saved = loadGame();
  view.unmount();
  view = open('/portfolio');
  expect(within(screen.getByRole('row', { name: /CDB100/ })).getByText('3')).toBeInTheDocument();
  expect(loadGame()).toEqual(saved);
  go('/achievements');
  expect(screen.getByText(/Desbloqueado no dia/)).toBeInTheDocument();
}, 20_000); // Full route round-trip with real charts, also under V8 instrumentation.
it('keeps locked fixed income unsellable in the actual order ticket', () => {
  const state = gameFixture();
  buyFixture(state, 'CDBPRE', 10);
  expect(saveGame(state).ok).toBe(true);
  open('/trade?asset=CDBPRE');
  fireEvent.click(screen.getByRole('button', { name: 'VENDER' }));
  expect(screen.getByRole('button', { name: 'MAX' })).toBeDisabled();
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Quantidade' }), { target: { value: '1' } });
  expect(screen.getByRole('button', { name: 'Vender 1×' })).toBeDisabled();
  expect(loadGame()!.portfolio.CDBPRE.quantity).toBe(10);
});
it('reserves an IPO and updates MAX from unreserved cash', () => {
  const state = gameFixture();
  ipoFixture(state, 'TESTIPO', 0, 7);
  expect(saveGame(state).ok).toBe(true);
  open('/trade?asset=CDB100');
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Quantidade de reserva para TESTIPO' }), { target: { value: '40' } });
  fireEvent.click(screen.getByRole('button', { name: 'Reservar' }));
  expect(loadGame()!.ipoPipeline[0].playerReservation).toBe(40);
  fireEvent.click(screen.getByRole('button', { name: 'MAX' }));
  expect(screen.getByRole('spinbutton', { name: 'Quantidade' })).toHaveValue(10);
});
it.each([[5000], [5000, 0, 0]].map(equity => ({ equity })))('renders unavailable statistics safely for %j', ({ equity }) => {
  const state = gameFixture();
  state.cash = equity[equity.length - 1];
  state.history.equity = equity;
  state.history.drawdown = equity.map(v => v === 0 ? 1 : 0);
  state.history.cdiAccumulated = equity.map((_, i) => 5000 + i);
  expect(saveGame(state).ok).toBe(true);
  const view = open('/history');
  fireEvent.click(screen.getByRole('button', { name: 'Estatísticas' }));
  expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  expect(view.container.textContent).not.toMatch(/NaN|Infinity/);
  if (equity.length > 1) expect(screen.getAllByText('-100.00%').length).toBeGreaterThanOrEqual(3);
});
it('displays macro and event history after real day advances', () => {
  expect(saveGame(gameFixture()).ok).toBe(true);
  open('/history');
  advance();
  advance();
  fireEvent.click(screen.getByRole('button', { name: 'Macro' }));
  expect(screen.getByText('Juros & Inflação')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Eventos' }));
  expect(screen.getByText('Timeline de Eventos')).toBeInTheDocument();
  expect(loadGame()!.dayIndex).toBe(2);
});

it('uses real dashboard keyboard commands and displays the fast-forward summary in English', () => {
  expect(saveGame(gameFixture()).ok).toBe(true);
  localStorage.setItem('patrimonio_locale', 'en');
  open('/');
  fireEvent.keyDown(window, { key: 'f' });
  expect(loadGame()!.dayIndex).toBe(7);
  expect(screen.getByText('Days 0–7')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Close summary' }));
  expect(screen.queryByText('Days 0–7')).not.toBeInTheDocument();
  fireEvent.keyDown(window, { key: 'n' });
  expect(loadGame()!.dayIndex).toBe(8);
  expect(screen.getByText('Day 8')).toBeInTheDocument();
}, 15_000);
it('shows no invalid return when advancing a day after total loss', () => {
  const state = gameFixture();
  state.cash = 0;
  state.history.equity = [5000, 0, 0];
  state.history.drawdown = [0, 1, 1];
  expect(saveGame(state).ok).toBe(true);
  const view = open('/');
  fireEvent.keyDown(window, { key: 'n' });
  expect(loadGame()!.cash).toBe(0);
  expect(view.container.textContent).not.toMatch(/NaN|Infinity/);
});
it('treats absent legacy drawdown history as unavailable', () => {
  const state = gameFixture();
  state.history.drawdown = [];
  expect(saveGame(state).ok).toBe(true);
  const view = open('/history');
  fireEvent.click(screen.getByRole('button', { name: 'Estatísticas' }));
  expect(screen.getByText('Max DD').parentElement).toHaveTextContent('—');
  expect(view.container.textContent).not.toMatch(/NaN|Infinity/);
});

it('refreshes dividend notification language when the locale changes after mounting', () => {
  const state = gameFixture();
  const fii = Object.values(state.assetCatalog).find(asset => asset.class === 'FII')!.id;
  buyFixture(state, fii, 5);
  // Make both command invocations pay a dividend so each language is observable.
  state.assets[fii].nextDividendDay = 0;
  state.assetCatalog[fii].dividendPeriodDays = 1;
  expect(saveGame(state).ok).toBe(true);
  const success = vi.spyOn(toast, 'success');
  try {
    open('/');
    fireEvent.click(screen.getAllByRole('button', { name: 'EN' })[0]);
    fireEvent.keyDown(window, { key: 'n' });
    expect(success).toHaveBeenCalledWith(expect.stringMatching(/\(5 shares\)$/), { duration: 4000 });
    success.mockClear();
    fireEvent.click(screen.getAllByRole('button', { name: 'PT' })[0]);
    fireEvent.keyDown(window, { key: 'n' });
    expect(success).toHaveBeenCalledWith(expect.stringMatching(/\(5 cotas\)$/), { duration: 4000 });
    expect(loadGame()!.dayIndex).toBe(2);
  } finally {
    success.mockRestore();
  }
});
