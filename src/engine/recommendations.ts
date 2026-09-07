import type { GameState, AssetClass } from './types';

export interface Recommendation {
  icon: string;
  pt: string;
  en: string;
  priority: number; // 1 (highest) - 5
  actionType: 'buy' | 'sell' | 'rebalance' | 'info';
  targetAssets?: string[];
}

const CLASS_GROUPS: Record<string, AssetClass[]> = {
  RF: ['RF_POS', 'RF_PRE', 'RF_IPCA', 'DEBENTURE'],
  STOCKS: ['STOCK', 'ETF'],
  FII: ['FII'],
  CRYPTO: ['CRYPTO_MAJOR', 'CRYPTO_ALT'],
};

function classGroupOf(ac: AssetClass): string {
  for (const [group, classes] of Object.entries(CLASS_GROUPS)) {
    if ((classes as string[]).includes(ac)) return group;
  }
  return 'OTHER';
}

function getAllocationPcts(state: GameState, equity: number) {
  const alloc: Record<string, number> = { RF: 0, STOCKS: 0, FII: 0, CRYPTO: 0, CASH: 0 };
  if (equity <= 0) return alloc;
  alloc.CASH = state.cash / equity;

  for (const [id, pos] of Object.entries(state.portfolio)) {
    if (pos.quantity <= 0) continue;
    const cat = state.assetCatalog[id];
    if (!cat) continue;
    const val = pos.quantity * (state.assets[id]?.price ?? 0);
    const group = classGroupOf(cat.class);
    if (group in alloc) alloc[group] += val / equity;
  }
  return alloc;
}

export function generateRecommendations(
  state: GameState,
  equity: number,
): Recommendation[] {
  const recs: Recommendation[] = [];
  const alloc = getAllocationPcts(state, equity);
  const positions = Object.entries(state.portfolio).filter(([, p]) => p.quantity > 0);

  // ── Regime-based ──
  if (state.regime === 'CRISIS') {
    recs.push({
      icon: '🛡️', priority: 1, actionType: 'sell',
      pt: 'Crise ativa! Reduza exposição a renda variável e crypto.',
      en: 'Crisis active! Reduce equity and crypto exposure.',
    });
  } else if (state.regime === 'BEAR') {
    recs.push({
      icon: '🐻', priority: 2, actionType: 'rebalance',
      pt: 'Mercado em queda. Aumente posição em renda fixa para proteger capital.',
      en: 'Bear market. Increase fixed income to protect capital.',
    });
  } else if (state.regime === 'BULL') {
    recs.push({
      icon: '🐂', priority: 3, actionType: 'buy',
      pt: 'Bull market! Considere aumentar posições em ações e ETFs.',
      en: 'Bull market! Consider increasing stock and ETF positions.',
    });
  } else if (state.regime === 'CRYPTO_EUPHORIA') {
    recs.push({
      icon: '🚀', priority: 2, actionType: 'info',
      pt: 'Euforia cripto! Cuidado: bolhas estouram. Considere realizar lucros.',
      en: 'Crypto euphoria! Caution: bubbles burst. Consider taking profits.',
    });
  }

  // ── Macro-based ──
  if (state.macro.baseRateAnnual > 0.12) {
    recs.push({
      icon: '📈', priority: 2, actionType: 'buy',
      pt: `Selic a ${(state.macro.baseRateAnnual * 100).toFixed(1)}%. RF pós-fixada se beneficia.`,
      en: `Selic at ${(state.macro.baseRateAnnual * 100).toFixed(1)}%. Post-fixed income benefits.`,
      targetAssets: ['TSELIC', 'CDB100', 'CDB110'],
    });
  } else if (state.macro.baseRateAnnual < 0.08) {
    recs.push({
      icon: '📉', priority: 3, actionType: 'buy',
      pt: `Selic baixa (${(state.macro.baseRateAnnual * 100).toFixed(1)}%). Ações e FIIs ficam mais atraentes.`,
      en: `Low Selic (${(state.macro.baseRateAnnual * 100).toFixed(1)}%). Stocks and REITs become more attractive.`,
    });
  }

  if (state.macro.inflationAnnual > 0.06) {
    recs.push({
      icon: '🔥', priority: 2, actionType: 'buy',
      pt: `Inflação alta (${(state.macro.inflationAnnual * 100).toFixed(1)}%). IPCA+ protege seu capital.`,
      en: `High inflation (${(state.macro.inflationAnnual * 100).toFixed(1)}%). IPCA+ protects your capital.`,
      targetAssets: ['TIPCA'],
    });
  }

  if (state.macro.riskIndex > 0.7) {
    recs.push({
      icon: '⚠️', priority: 1, actionType: 'sell',
      pt: 'Risco-país elevado. Reduza exposição e aumente caixa.',
      en: 'High country risk. Reduce exposure and increase cash.',
    });
  }

  // ── Portfolio-based ──
  if (alloc.CRYPTO > 0.30) {
    recs.push({
      icon: '⚡', priority: 1, actionType: 'sell',
      pt: `Crypto representa ${(alloc.CRYPTO * 100).toFixed(0)}% do portfólio. Considere diversificar.`,
      en: `Crypto is ${(alloc.CRYPTO * 100).toFixed(0)}% of portfolio. Consider diversifying.`,
    });
  }

  if (alloc.RF === 0 && positions.length > 0) {
    recs.push({
      icon: '🏦', priority: 2, actionType: 'buy',
      pt: 'Sem renda fixa na carteira. Adicione como âncora de estabilidade.',
      en: 'No fixed income. Add as a stability anchor.',
      targetAssets: ['TSELIC', 'CDB100'],
    });
  }

  if (alloc.STOCKS === 0 && alloc.FII === 0 && positions.length > 0) {
    recs.push({
      icon: '📊', priority: 3, actionType: 'buy',
      pt: 'Sem ações ou FIIs. Considere exposição a renda variável.',
      en: 'No stocks or REITs. Consider equity exposure.',
    });
  }

  if (alloc.CASH < 0.05 && equity > 0) {
    recs.push({
      icon: '💵', priority: 1, actionType: 'sell',
      pt: 'Caixa muito baixo! Venda algo para manter liquidez de emergência.',
      en: 'Cash too low! Sell something to maintain emergency liquidity.',
    });
  } else if (alloc.CASH > 0.50 && equity > 0) {
    recs.push({
      icon: '💤', priority: 3, actionType: 'buy',
      pt: `${(alloc.CASH * 100).toFixed(0)}% em caixa parado. Invista para não perder para a inflação.`,
      en: `${(alloc.CASH * 100).toFixed(0)}% idle cash. Invest to avoid losing to inflation.`,
    });
  }

  // ── Drawdown-based ──
  const eqHist = state.history.equity;
  if (eqHist.length > 1) {
    const window = eqHist.slice(-30);
    const peak = Math.max(...window);
    const dd = peak > 0 ? (peak - equity) / peak : 0;
    if (dd > 0.15) {
      recs.push({
        icon: '🩸', priority: 1, actionType: 'sell',
        pt: `Drawdown de ${(dd * 100).toFixed(1)}%. Considere stop-loss em posições perdedoras.`,
        en: `${(dd * 100).toFixed(1)}% drawdown. Consider stop-loss on losing positions.`,
      });
    } else if (dd > 0.10) {
      recs.push({
        icon: '📉', priority: 2, actionType: 'info',
        pt: `Drawdown de ${(dd * 100).toFixed(1)}%. Monitore de perto e avalie reduzir risco.`,
        en: `${(dd * 100).toFixed(1)}% drawdown. Monitor closely and consider reducing risk.`,
      });
    }
  }

  // ── Event-based ──
  for (const ev of state.events.active) {
    if (ev.card.type === 'SECTOR_CRASH' && ev.card.vars?.sector) {
      const sector = ev.card.vars.sector;
      const sectorAssets = Object.keys(state.assetCatalog).filter(
        id => state.assetCatalog[id].sector === sector
      );
      recs.push({
        icon: '🎯', priority: 3, actionType: 'buy',
        pt: `Crash em ${sector}. Oportunidade de compra a preços baixos?`,
        en: `${sector} crash. Buying opportunity at low prices?`,
        targetAssets: sectorAssets,
      });
    }
    if (ev.card.type === 'SECTOR_BOOM' && ev.card.vars?.sector) {
      recs.push({
        icon: '🚀', priority: 4, actionType: 'info',
        pt: `Setor ${ev.card.vars.sector} em alta. Considere realizar lucros parciais.`,
        en: `${ev.card.vars.sector} sector booming. Consider partial profit-taking.`,
      });
    }
  }

  // IPO available
  for (const ipo of state.ipoPipeline) {
    if (ipo.status === 'bookbuilding' && ipo.playerReservation === 0) {
      recs.push({
        icon: '🔔', priority: 3, actionType: 'buy',
        pt: `IPO de ${ipo.displayName} aberto. Avalie reservar cotas.`,
        en: `${ipo.displayName} IPO open. Consider reserving shares.`,
      });
    }
  }

  // ── Concentration in single asset ──
  if (equity > 0 && positions.length > 0) {
    for (const [id, pos] of positions) {
      const val = pos.quantity * (state.assets[id]?.price ?? 0);
      if (val / equity > 0.40) {
        recs.push({
          icon: '⚖️', priority: 2, actionType: 'sell',
          pt: `${id} representa ${((val / equity) * 100).toFixed(0)}% da carteira. Considere reduzir concentração.`,
          en: `${id} is ${((val / equity) * 100).toFixed(0)}% of portfolio. Consider reducing concentration.`,
        });
      }
    }
  }

  // Sort by priority and limit
  recs.sort((a, b) => a.priority - b.priority);
  return recs.slice(0, 5);
}
