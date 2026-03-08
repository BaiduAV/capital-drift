// ── Asset Catalog: ~33 assets, dynamically named ──

import type { AssetDefinition } from './types';
import { DIVIDENDS } from './params';
import { createRNG } from './rng';
import { generateStockIdentity, generateFIIIdentity, generateCryptoIdentity } from './naming';

function randInRange(min: number, max: number, rng: ReturnType<typeof createRNG>): number {
  return min + rng.next() * (max - min);
}

export function buildAssetCatalog(seed: number): Record<string, AssetDefinition> {
  const rng = createRNG(seed);
  const usedTickers = new Set<string>();

  const assets: AssetDefinition[] = [
    // ── Fixed Income (8) — static IDs, well-known product names ──
    { id: 'TSELIC', nameKey: 'asset.tselic', class: 'RF_POS', sector: 'NONE', corrGroup: 'FIXED_INCOME', liquidityRule: 'D0', initialPrice: 100 },
    { id: 'CDB100', nameKey: 'asset.cdb100', class: 'RF_POS', sector: 'NONE', corrGroup: 'FIXED_INCOME', liquidityRule: 'D0', initialPrice: 100 },
    { id: 'CDB110', nameKey: 'asset.cdb110', class: 'RF_POS', sector: 'NONE', corrGroup: 'FIXED_INCOME', liquidityRule: 'D30_OR_PENALTY', initialPrice: 100 },
    { id: 'CDBPRE', nameKey: 'asset.cdbpre', class: 'RF_PRE', sector: 'NONE', corrGroup: 'FIXED_INCOME', liquidityRule: 'D0', initialPrice: 100 },
    { id: 'TPRE', nameKey: 'asset.tpre', class: 'RF_PRE', sector: 'NONE', corrGroup: 'FIXED_INCOME', liquidityRule: 'D0', initialPrice: 100 },
    { id: 'TIPCA', nameKey: 'asset.tipca', class: 'RF_IPCA', sector: 'NONE', corrGroup: 'FIXED_INCOME', liquidityRule: 'D0', initialPrice: 100 },
    { id: 'DEBAA', nameKey: 'asset.debaa', class: 'DEBENTURE', sector: 'NONE', corrGroup: 'FIXED_INCOME', liquidityRule: 'D7', creditRating: 'AA', initialPrice: 100 },
    { id: 'DEBBBB', nameKey: 'asset.debbbb', class: 'DEBENTURE', sector: 'NONE', corrGroup: 'FIXED_INCOME', liquidityRule: 'D7', creditRating: 'BBB', initialPrice: 100 },
  ];

  // Mark fixed income tickers as used
  for (const a of assets) usedTickers.add(a.id);

  // ── Stocks (12) — dynamically generated ──
  const stockSectors: { sector: 'BANCOS' | 'ENERGIA' | 'VAREJO' | 'TECH'; count: number; basePrice: number; priceStep: number }[] = [
    { sector: 'BANCOS', count: 3, basePrice: 25, priceStep: 5 },
    { sector: 'ENERGIA', count: 3, basePrice: 20, priceStep: 4 },
    { sector: 'VAREJO', count: 3, basePrice: 15, priceStep: 3 },
    { sector: 'TECH', count: 3, basePrice: 30, priceStep: 10 },
  ];

  for (const { sector, count, basePrice, priceStep } of stockSectors) {
    for (let i = 0; i < count; i++) {
      const { ticker, displayName } = generateStockIdentity(rng, sector, usedTickers);
      assets.push({
        id: ticker,
        nameKey: `asset.${ticker.toLowerCase()}`,
        displayName,
        class: 'STOCK',
        sector,
        corrGroup: 'EQUITY',
        liquidityRule: 'D0',
        dividendYieldAnnual: 0,
        dividendPeriodDays: DIVIDENDS.stockPeriodDays,
        initialPrice: basePrice + i * priceStep,
      });
    }
  }

  // ── ETFs (4) — real index names ──
  assets.push(
    { id: 'BOVA11', nameKey: 'asset.bova11', class: 'ETF', sector: 'TOTAL_MARKET', corrGroup: 'EQUITY', liquidityRule: 'D0', initialPrice: 50 },
    { id: 'DIVO11', nameKey: 'asset.divo11', class: 'ETF', sector: 'DIVIDENDS', corrGroup: 'EQUITY', liquidityRule: 'D0', initialPrice: 45 },
    { id: 'TECK11', nameKey: 'asset.teck11', class: 'ETF', sector: 'TECH', corrGroup: 'EQUITY', liquidityRule: 'D0', initialPrice: 55 },
    { id: 'SMAL11', nameKey: 'asset.smal11', class: 'ETF', sector: 'SMALL_CAPS', corrGroup: 'EQUITY', liquidityRule: 'D0', initialPrice: 35 },
  );
  ['BOVA11', 'DIVO11', 'TECK11', 'SMAL11'].forEach(id => usedTickers.add(id));

  // ── FIIs (4) — dynamically generated ──
  const fiiSectors: { sector: 'BRICK' | 'PAPER' | 'LOGISTICA' | 'HYBRID'; price: number }[] = [
    { sector: 'BRICK', price: 80 },
    { sector: 'PAPER', price: 90 },
    { sector: 'LOGISTICA', price: 75 },
    { sector: 'HYBRID', price: 85 },
  ];

  for (const { sector, price } of fiiSectors) {
    const { ticker, displayName } = generateFIIIdentity(rng, sector, usedTickers);
    assets.push({
      id: ticker,
      nameKey: `asset.${ticker.toLowerCase()}`,
      displayName,
      class: 'FII',
      sector,
      corrGroup: 'EQUITY',
      liquidityRule: 'D0',
      dividendYieldAnnual: 0,
      dividendPeriodDays: DIVIDENDS.fiiPeriodDays,
      initialPrice: price,
    });
  }

  // ── Crypto (4) — dynamically generated ──
  const cryptoSpecs: { isMajor: boolean; class: 'CRYPTO_MAJOR' | 'CRYPTO_ALT'; price: number }[] = [
    { isMajor: true, class: 'CRYPTO_MAJOR', price: 150 },
    { isMajor: true, class: 'CRYPTO_MAJOR', price: 80 },
    { isMajor: false, class: 'CRYPTO_ALT', price: 10 },
    { isMajor: false, class: 'CRYPTO_ALT', price: 2 },
  ];

  for (const spec of cryptoSpecs) {
    const { ticker, displayName } = generateCryptoIdentity(rng, spec.isMajor, usedTickers);
    assets.push({
      id: ticker,
      nameKey: `asset.${ticker.toLowerCase()}`,
      displayName,
      class: spec.class,
      sector: 'NONE',
      corrGroup: 'CRYPTO',
      liquidityRule: 'D0',
      initialPrice: spec.price,
    });
  }

  // ── FX Hedge (1) — real index ──
  assets.push(
    { id: 'IVVB11', nameKey: 'asset.ivvb11', class: 'ETF', sector: 'NONE', corrGroup: 'EQUITY', liquidityRule: 'D0', initialPrice: 50 },
  );
  usedTickers.add('IVVB11');

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
