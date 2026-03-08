import type { GameState, AssetClass } from './types';

export interface HealthScoreBreakdown {
  cash: number;        // 0-20
  assetDiv: number;    // 0-20
  classDiv: number;    // 0-20
  drawdown: number;    // 0-20
  performance: number; // 0-20
}

export interface HealthScoreResult {
  total: number;
  breakdown: HealthScoreBreakdown;
  tips: { key: string; pt: string; en: string }[];
}

const CLASS_GROUPS: Record<string, AssetClass[]> = {
  RF: ['RF_POS', 'RF_PRE', 'RF_IPCA', 'DEBENTURE'],
  STOCKS: ['STOCK', 'ETF'],
  FII: ['FII'],
  CRYPTO: ['CRYPTO_MAJOR', 'CRYPTO_ALT'],
  FX: ['FX'],
};

function classGroupOf(ac: AssetClass): string {
  for (const [group, classes] of Object.entries(CLASS_GROUPS)) {
    if ((classes as string[]).includes(ac)) return group;
  }
  return 'OTHER';
}

export function computeHealthScore(
  state: GameState,
  equity: number,
): HealthScoreResult {
  const tips: HealthScoreResult['tips'] = [];

  // ── 1. Cash Reserve (0-20) ──
  let cashScore = 0;
  if (equity > 0) {
    const cashPct = state.cash / equity;
    if (cashPct >= 0.10 && cashPct <= 0.30) {
      cashScore = 20;
    } else if (cashPct >= 0.05 && cashPct < 0.10) {
      cashScore = (cashPct / 0.10) * 20;
    } else if (cashPct > 0.30 && cashPct <= 0.60) {
      cashScore = 20 - ((cashPct - 0.30) / 0.30) * 15;
    } else if (cashPct > 0.60) {
      cashScore = 5;
    } else {
      // < 5%
      cashScore = (cashPct / 0.05) * 10;
    }
  }
  cashScore = Math.max(0, Math.min(20, Math.round(cashScore)));

  if (equity > 0 && state.cash / equity < 0.05) {
    tips.push({ key: 'low_cash', pt: 'Aumente sua reserva de caixa para pelo menos 10% do patrimônio.', en: 'Increase your cash reserve to at least 10% of equity.' });
  } else if (equity > 0 && state.cash / equity > 0.50) {
    tips.push({ key: 'high_cash', pt: 'Você tem muito caixa parado. Considere investir parte dele.', en: 'You have too much idle cash. Consider investing some of it.' });
  }

  // ── 2. Asset Diversification HHI (0-20) ──
  const positions = Object.entries(state.portfolio).filter(([, p]) => p.quantity > 0);
  let assetDivScore = 0;
  if (positions.length > 0 && equity > 0) {
    const values = positions.map(([id, p]) => p.quantity * (state.assets[id]?.price ?? 0));
    const total = values.reduce((a, b) => a + b, 0);
    if (total > 0) {
      let hhi = 0;
      for (const v of values) hhi += (v / total) ** 2;
      // HHI of 1 asset = 1.0, many equally distributed → 1/n
      // Normalized: (1 - HHI) ranges from 0 to ~1
      assetDivScore = Math.round(Math.min(20, (1 - hhi) * 25));
    }
  }

  if (positions.length <= 1 && positions.length > 0) {
    tips.push({ key: 'single_asset', pt: 'Diversifique: você está concentrado em poucos ativos.', en: 'Diversify: you\'re concentrated in too few assets.' });
  }

  // ── 3. Class Diversification (0-20) ──
  let classDivScore = 0;
  if (positions.length > 0 && equity > 0) {
    const classValues: Record<string, number> = {};
    let totalInvested = 0;
    for (const [id, p] of positions) {
      const ac = state.assetCatalog[id]?.class;
      if (!ac) continue;
      const val = p.quantity * (state.assets[id]?.price ?? 0);
      const group = classGroupOf(ac);
      classValues[group] = (classValues[group] ?? 0) + val;
      totalInvested += val;
    }
    const distinctClasses = Object.keys(classValues).length;
    // Points for number of classes: 1→4, 2→8, 3→14, 4+→18-20
    const classCountScore = Math.min(12, distinctClasses * 4);

    // Points for balance: penalty if any class > 50%
    let balanceScore = 8;
    if (totalInvested > 0) {
      const maxPct = Math.max(...Object.values(classValues)) / totalInvested;
      if (maxPct > 0.70) balanceScore = 2;
      else if (maxPct > 0.50) balanceScore = 5;
    }
    classDivScore = Math.min(20, classCountScore + balanceScore);

    if (distinctClasses <= 1) {
      tips.push({ key: 'one_class', pt: 'Diversifique entre classes: RF, Ações, FIIs, Crypto.', en: 'Diversify across classes: Fixed Income, Stocks, REITs, Crypto.' });
    }
  }

  // ── 4. Rolling Drawdown 30d (0-20) ──
  let ddScore = 20;
  const eqHist = state.history.equity;
  if (eqHist.length > 1) {
    const window = eqHist.slice(-30);
    const peak = Math.max(...window);
    const dd = peak > 0 ? (peak - equity) / peak : 0;
    if (dd < 0.03) ddScore = 20;
    else if (dd < 0.05) ddScore = 16;
    else if (dd < 0.10) ddScore = 12;
    else if (dd < 0.15) ddScore = 8;
    else if (dd < 0.20) ddScore = 4;
    else ddScore = 0;

    if (dd >= 0.10) {
      tips.push({ key: 'high_dd', pt: 'Seu drawdown recente está alto. Considere reduzir exposição a risco.', en: 'Your recent drawdown is high. Consider reducing risk exposure.' });
    }
  }

  // ── 5. Performance vs CDI (0-20) ──
  let perfScore = 10; // default neutral
  const cdiHist = state.history.cdiAccumulated;
  if (eqHist.length > 1 && cdiHist.length > 0) {
    const initialEquity = eqHist[0];
    if (initialEquity > 0) {
      const totalReturn = (equity - initialEquity) / initialEquity;
      const cdiReturn = cdiHist[cdiHist.length - 1] - 1; // cdiAccumulated starts at 1
      const diff = totalReturn - cdiReturn;
      if (diff >= 0.02) perfScore = 20;
      else if (diff >= 0) perfScore = 16;
      else if (diff >= -0.03) perfScore = 10;
      else if (diff >= -0.08) perfScore = 5;
      else perfScore = 0;

      if (diff < -0.03) {
        tips.push({ key: 'below_cdi', pt: 'Seu retorno está abaixo do CDI. Revise sua estratégia.', en: 'Your return is below CDI. Review your strategy.' });
      }
    }
  }

  const total = cashScore + assetDivScore + classDivScore + ddScore + perfScore;

  return {
    total,
    breakdown: {
      cash: cashScore,
      assetDiv: assetDivScore,
      classDiv: classDivScore,
      drawdown: ddScore,
      performance: perfScore,
    },
    tips: tips.slice(0, 3),
  };
}
