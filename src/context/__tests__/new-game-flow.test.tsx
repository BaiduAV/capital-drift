import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { toast } from 'sonner';
import { GameProvider } from '../GameContext';
import AppLayout from '../../components/game/AppLayout';
import Welcome from '../../pages/Welcome';
import { TooltipProvider } from '../../components/ui/tooltip';
import { createGameState } from '../../engine/init';
import { loadGame, saveGame } from '../../engine/persistence';

afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

function exhaustStorage() {
  return vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Full', 'QuotaExceededError');
  });
}

describe('new-game callers', () => {
  it('keeps the layout dialog open without a success toast until a reset is saved', () => {
    saveGame(createGameState(7));
    localStorage.setItem('patrimonio_tutorial_done', '1');
    const success = vi.spyOn(toast, 'success');
    const error = vi.spyOn(toast, 'error');
    render(<MemoryRouter><TooltipProvider><GameProvider><AppLayout /></GameProvider></TooltipProvider></MemoryRouter>);
    fireEvent.click(screen.getAllByRole('button', { name: 'Novo Jogo' })[0]);
    fireEvent.change(screen.getByLabelText('Seed (opcional)'), { target: { value: '42' } });
    const storage = exhaustStorage();
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Seed (opcional)')).toHaveValue(42);
    expect(success).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(expect.stringContaining('A partida atual foi mantida'));
    expect(loadGame()!.seed).toBe(7);
    storage.mockRestore();
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(success).toHaveBeenCalledWith('Novo jogo iniciado!');
    expect(loadGame()!.seed).toBe(42);
  });

  it('stays on Welcome after a storage failure and navigates only on successful retry', () => {
    saveGame(createGameState(7));
    const error = vi.spyOn(toast, 'error');
    render(<MemoryRouter initialEntries={['/welcome']}><GameProvider><Routes>
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/" element={<p>Dashboard reached</p>} />
    </Routes></GameProvider></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Seed (opcional)'), { target: { value: '42' } });
    const storage = exhaustStorage();
    fireEvent.click(screen.getByRole('button', { name: 'Novo Jogo' }));
    expect(screen.queryByText('Dashboard reached')).toBeNull();
    expect(screen.getByLabelText('Seed (opcional)')).toHaveValue(42);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('A partida atual foi mantida'));
    expect(loadGame()!.seed).toBe(7);
    storage.mockRestore();
    fireEvent.click(screen.getByRole('button', { name: 'Novo Jogo' }));
    expect(screen.getByText('Dashboard reached')).toBeInTheDocument();
    expect(loadGame()!.seed).toBe(42);
  });
});
