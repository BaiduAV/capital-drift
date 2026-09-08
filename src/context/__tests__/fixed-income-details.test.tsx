import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { GameProvider } from '../GameContext';
import FixedIncomeDetails from '../../components/game/FixedIncomeDetails';
import { createGameState } from '../../engine/init';
import { executeBuy, quoteBuy } from '../../engine/trading';
import { saveGame } from '../../engine/persistence';

afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });
it('shows the actual contract and locked lots for a CDB110 purchase', () => {
  const state = createGameState(1);
  executeBuy(state, quoteBuy(state, 'CDB110', 2));
  expect(saveGame(state).ok).toBe(true);
  render(<GameProvider><FixedIncomeDetails assetId="CDB110" /></GameProvider>);
  expect(screen.getByRole('region', { name: 'Contrato de renda fixa' })).toHaveTextContent('110.00% CDI');
  expect(screen.getByText(/Diária após 30 dias corridos/)).toBeInTheDocument();
  expect(screen.getByText(/Quantidade disponível para venda hoje/)).toHaveTextContent(': 0');
  expect(screen.getByLabelText('Aplicações por lote')).toHaveTextContent('02/01/2026');
  expect(screen.getByText(/FGC:/)).toHaveTextContent('250 mil');
});
it('explains secondary-market and settlement restrictions in English', () => {
  localStorage.setItem('patrimonio_locale', 'en');
  render(<GameProvider><FixedIncomeDetails assetId="DEBAA" /></GameProvider>);
  expect(screen.getByRole('region', { name: 'Fixed income contract' })).toHaveTextContent('subject to a buyer. T+1 settlement');
  expect(screen.getByText('No FGC coverage.')).toBeInTheDocument();
});
