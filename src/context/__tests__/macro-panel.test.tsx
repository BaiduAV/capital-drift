import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { GameProvider } from '../GameContext';
import MacroPanel from '../../components/game/MacroPanel';
import { createGameState } from '../../engine/init';
import { saveGame } from '../../engine/persistence';

afterEach(() => { cleanup(); localStorage.clear(); });
it('separates target, monthly, trailing and expected inflation and discloses pending policy', () => {
  const s = createGameState(1);
  s.macro.dynamics!.pendingPolicy = { rate: .12, effectiveDate: '2026-01-29' };
  expect(saveGame(s).ok).toBe(true);
  render(<GameProvider><MacroPanel /></GameProvider>);
  for (const label of ['Selic meta', 'IPCA 12m', 'IPCA mês', 'Inflação esperada']) expect(screen.getByText(label)).toBeInTheDocument();
  expect(screen.getByText('11.00% a.a.')).toBeInTheDocument();
  expect(screen.getByText(/Selic anunciada: 12.00%, vigente em 2026-01-29/)).toBeInTheDocument();
  expect(screen.getByText(/Histórico inicial estimado: 12 meses/)).toBeInTheDocument();
});
it('also distinguishes the indicators in English', () => {
  localStorage.setItem('patrimonio_locale', 'en');
  render(<GameProvider><MacroPanel /></GameProvider>);
  for (const label of ['Selic target', 'IPCA 12m', 'IPCA month', 'Expected inflation']) expect(screen.getByText(label)).toBeInTheDocument();
});
