import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGameState } from '@/engine/init';
import { executeBuy, quoteBuy } from '@/engine/trading';
import FixedIncomeDetails from '../FixedIncomeDetails';

let state = createGameState(1);
let locale: 'pt-BR' | 'en' = 'pt-BR';
vi.mock('@/context/game-context', () => ({ useGame: () => ({ state, locale }) }));
afterEach(() => { cleanup(); state = createGameState(1); locale = 'pt-BR'; });

describe('fixed income contract disclosure', () => {
  it.each(['pt-BR', 'en'] as const)('distinguishes current offers from contracted rates and balances in %s', language => {
    locale = language;
    executeBuy(state, quoteBuy(state, 'CDBPRE', 1));
    state.yieldCurves!.nominal.forEach(p => { p.annualRate += .02; });
    executeBuy(state, quoteBuy(state, 'CDBPRE', 2));
    state.portfolio.CDBPRE.fixedIncomeLots![0].bookUnitValue = 112;
    render(<FixedIncomeDetails assetId="CDBPRE" />);
    const lots = screen.getByLabelText(language === 'pt-BR' ? 'Aplicações por lote' : 'Investment lots');
    expect(lots.textContent).toContain('12.00%');
    expect(lots.textContent).toContain('14.00%');
    const money = (v: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL' }).format(v);
    expect(lots.textContent).toContain(money(112));
    expect(lots.textContent).toContain(money(200));
    expect(screen.getByText(language === 'pt-BR' ? /Remuneração bruta/ : /Gross remuneration/).textContent).toContain('14.00%');
  });

  it('discloses Selic discount risk and updated nominal separately', () => {
    render(<FixedIncomeDetails assetId="TSELIC" />);
    expect(screen.getByText(/Taxa de ágio\/deságio/)).toBeInTheDocument();
    expect(screen.getByText(/Valor nominal atualizado por unidade/)).toBeInTheDocument();
    expect(screen.getByText(/A venda antecipada pode ter perda/)).toBeInTheDocument();
  });
});
