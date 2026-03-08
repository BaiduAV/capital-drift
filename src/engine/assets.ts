// ── Asset Catalog: 33 assets ──

import type { AssetDefinition } from './types';
import { DIVIDENDS } from './params';
import { createRNG } from './rng';

function randInRange(min: number, max: number, rng: ReturnType<typeof createRNG>): number {
  return min + rng.next() * (max - min);
}

export function buildAssetCatalog(seed: number): Record<string, AssetDefinition> {
  const rng = createRNG(seed);
  const assets: AssetDefinition[] = [
    // ── Fixed Income (8) ──
    { id: 'TSELIC', nameKey: 'asset.tselic', class: 'RF_POS', sector: 'NONE', corrGroup: 'FIXED_INCOME', liquidityRule: 'D0', initialPrice: 100 },
    { id: 'CDB100', nameKey: 'asset.cdb100', class: 'RF_POS', sector: 'NONE', corrGroup: 'FIXED_INCOME', liquidityRule: 'D0', initialPrice: 100 },
    { id: 'CDB110', nameKey: 'asset.cdb110', class: 'RF_POS', sector: 'NONE', corrGroup: 'FIXED_INCOME', liquidityRule: 'D30_OR_PENALTY', initialPrice: 100 },
    { id: 'CDBPRE', nameKey: 'asset.cdbpre', class: 'RF_PRE', sector: 'NONE', corrGroup: 'FIXED_INCOME', liquidityRule: 'D0', initialPrice: 100 },
    { id: 'TPRE', nameKey: 'asset.tpre', class: 'RF_PRE', sector: 'NONE', corrGroup: 'FIXED_INCOME', liquidityRule: 'D0', initialPrice: 100 },
    { id: 'TIPCA', nameKey: 'asset.tipca', class: 'RF_IPCA', sector: 'NONE', corrGroup: 'FIXED_INCOME', liquidityRule: 'D0', initialPrice: 100 },
    { id: 'DEBAA', nameKey: 'asset.debaa', class: 'DEBENTURE', sector: 'NONE', corrGroup: 'FIXED_INCOME', liquidityRule: 'D7', creditRating: 'AA', initialPrice: 100 },
    { id: 'DEBBBB', nameKey: 'asset.debbbb', class: 'DEBENTURE', sector: 'NONE', corrGroup: 'FIXED_INCOME', liquidityRule: 'D7', creditRating: 'BBB', initialPrice: 100 },

    // ── Stocks (12) ──
    ...(['ITUB3', 'BBDC4', 'SANB3'] as const).map((id, i) => ({
      id, nameKey: `asset.${id.toLowerCase()}`, class: 'STOCK' as const, sector: 'BANCOS' as const, corrGroup: 'EQUITY' as const, liquidityRule: 'D0' as const,
      dividendYieldAnnual: 0, dividendPeriodDays: DIVIDENDS.stockPeriodDays, initialPrice: 25 + i * 5,
    })),
    ...(['ELET3', 'ENGI4', 'CPFE3'] as const).map((id, i) => ({
      id, nameKey: `asset.${id.toLowerCase()}`, class: 'STOCK' as const, sector: 'ENERGIA' as const, corrGroup: 'EQUITY' as const, liquidityRule: 'D0' as const,
      dividendYieldAnnual: 0, dividendPeriodDays: DIVIDENDS.stockPeriodDays, initialPrice: 20 + i * 4,
    })),
    ...(['MGLU3', 'LREN3', 'AMER3'] as const).map((id, i) => ({
      id, nameKey: `asset.${id.toLowerCase()}`, class: 'STOCK' as const, sector: 'VAREJO' as const, corrGroup: 'EQUITY' as const, liquidityRule: 'D0' as const,
      dividendYieldAnnual: 0, dividendPeriodDays: DIVIDENDS.stockPeriodDays, initialPrice: 15 + i * 3,
    })),
    ...(['TOTS3', 'LWSA3', 'CASH3'] as const).map((id, i) => ({
      id, nameKey: `asset.${id.toLowerCase()}`, class: 'STOCK' as const, sector: 'TECH' as const, corrGroup: 'EQUITY' as const, liquidityRule: 'D0' as const,
      dividendYieldAnnual: 0, dividendPeriodDays: DIVIDENDS.stockPeriodDays, initialPrice: 30 + i * 10,
    })),

    // ── ETFs (4) ──
    { id: 'BOVA11', nameKey: 'asset.bova11', class: 'ETF', sector: 'TOTAL_MARKET', corrGroup: 'EQUITY', liquidityRule: 'D0', initialPrice: 50 },
    { id: 'DIVO11', nameKey: 'asset.divo11', class: 'ETF', sector: 'DIVIDENDS', corrGroup: 'EQUITY', liquidityRule: 'D0', initialPrice: 45 },
    { id: 'TECK11', nameKey: 'asset.teck11', class: 'ETF', sector: 'TECH', corrGroup: 'EQUITY', liquidityRule: 'D0', initialPrice: 55 },
    { id: 'SMAL11', nameKey: 'asset.smal11', class: 'ETF', sector: 'SMALL_CAPS', corrGroup: 'EQUITY', liquidityRule: 'D0', initialPrice: 35 },

    // ── FIIs (4) ──
    { id: 'HGLG11', nameKey: 'asset.hglg11', class: 'FII', sector: 'BRICK', corrGroup: 'EQUITY', liquidityRule: 'D0', dividendYieldAnnual: 0, dividendPeriodDays: DIVIDENDS.fiiPeriodDays, initialPrice: 80 },
    { id: 'KNCR11', nameKey: 'asset.kncr11', class: 'FII', sector: 'PAPER', corrGroup: 'EQUITY', liquidityRule: 'D0', dividendYieldAnnual: 0, dividendPeriodDays: DIVIDENDS.fiiPeriodDays, initialPrice: 90 },
    { id: 'XPLG11', nameKey: 'asset.xplg11', class: 'FII', sector: 'LOGISTICA', corrGroup: 'EQUITY', liquidityRule: 'D0', dividendYieldAnnual: 0, dividendPeriodDays: DIVIDENDS.fiiPeriodDays, initialPrice: 75 },
    { id: 'MXRF11', nameKey: 'asset.mxrf11', class: 'FII', sector: 'HYBRID', corrGroup: 'EQUITY', liquidityRule: 'D0', dividendYieldAnnual: 0, dividendPeriodDays: DIVIDENDS.fiiPeriodDays, initialPrice: 85 },

    // ── Crypto (4) ──
    { id: 'BTC', nameKey: 'asset.btc', class: 'CRYPTO_MAJOR', sector: 'NONE', corrGroup: 'CRYPTO', liquidityRule: 'D0', initialPrice: 150 },
    { id: 'ETH', nameKey: 'asset.eth', class: 'CRYPTO_MAJOR', sector: 'NONE', corrGroup: 'CRYPTO', liquidityRule: 'D0', initialPrice: 80 },
    { id: 'SOL', nameKey: 'asset.sol', class: 'CRYPTO_ALT', sector: 'NONE', corrGroup: 'CRYPTO', liquidityRule: 'D0', initialPrice: 10 },
    { id: 'DOGE', nameKey: 'asset.doge', class: 'CRYPTO_ALT', sector: 'NONE', corrGroup: 'CRYPTO', liquidityRule: 'D0', initialPrice: 2 },

    // ── FX Hedge (1) ──
    { id: 'IVVB11', nameKey: 'asset.ivvb11', class: 'ETF', sector: 'NONE', corrGroup: 'EQUITY', liquidityRule: 'D0', initialPrice: 50 },
  ];

  // Assign random dividend yields for stocks and FIIs
  for (const a of assets) {
    if (a.class === 'STOCK' && a.dividendPeriodDays) {
      a.dividendYieldAnnual = randInRange(DIVIDENDS.stockYieldRange[0], DIVIDENDS.stockYieldRange[1], rng);
    }
    if (a.class === 'FII' && a.dividendPeriodDays) {
      a.dividendYieldAnnual = randInRange(DIVIDENDS.fiiYieldRange[0], DIVIDENDS.fiiYieldRange[1], rng);
    }
  }

  const catalog: Record<string, AssetDefinition> = {};
  for (const a of assets) {
    catalog[a.id] = a;
  }
  return catalog;
}
