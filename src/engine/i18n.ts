// ── Lightweight i18n ──

type Locale = 'pt-BR' | 'en';

const translations: Record<Locale, Record<string, string>> = {
  'pt-BR': {
    // Assets - Fixed Income
    'asset.tselic': 'Tesouro Selic',
    'asset.cdb100': 'CDB 100% CDI',
    'asset.cdb110': 'CDB 110% CDI',
    'asset.cdbpre': 'CDB Pré 12%',
    'asset.tpre': 'Tesouro Pré',
    'asset.tipca': 'Tesouro IPCA+',
    'asset.debaa': 'Debênture AA',
    'asset.debbbb': 'Debênture BBB',
    // Assets - ETFs (real index names)
    'asset.bova11': 'ETF Ibovespa', 'asset.divo11': 'ETF Dividendos',
    'asset.teck11': 'ETF Tech Brasil', 'asset.smal11': 'ETF Small Caps',
    'asset.usd': 'Dólar (USD/BRL)',
    // Events
    'event.rate_hike.title': 'Juros Sobem',
    'event.rate_hike.desc': 'Banco Central eleva taxa base. Renda fixa se beneficia, bolsa pressiona.',
    'event.rate_cut.title': 'Juros Caem',
    'event.rate_cut.desc': 'Banco Central reduz taxa base. Ações e FIIs ganham fôlego.',
    'event.inflation_up.title': 'Inflação Acelera',
    'event.inflation_up.desc': 'IPCA acima das expectativas. Varejo sofre, IPCA+ protege.',
    'event.inflation_down.title': 'Inflação Arrefece',
    'event.inflation_down.desc': 'IPCA surpreende para baixo. Alívio generalizado no mercado.',
    'event.sector_boom.title': 'Setor em Alta',
    'event.sector_boom.desc': 'Resultados positivos impulsionam o setor.',
    'event.sector_bust.title': 'Setor em Queda',
    'event.sector_bust.desc': 'Notícias negativas pressionam o setor.',
    'event.crypto_hack.title': 'Hack em Exchange',
    'event.crypto_hack.desc': 'Exchange sofre ataque hacker. Cripto despenca.',
    'event.crypto_euphoria.title': 'Euforia Cripto',
    'event.crypto_euphoria.desc': 'Redes sociais impulsionam alts. Volatilidade explode.',
    'event.crypto_rug_pull.title': 'Rug Pull!',
    'event.crypto_rug_pull.desc': 'Projeto colapsa. Cripto alt perde valor catastroficamente.',
    'event.credit_downgrade.title': 'Rebaixamento de Crédito',
    'event.credit_downgrade.desc': 'Agência rebaixa rating de debênture. Preço cai.',
    'event.fx_shock.title': 'Choque Cambial',
    'event.fx_shock.desc': 'Dólar dispara com saída de capitais. Risco-país sobe.',
    'event.fiscal_stress.title': 'Risco Fiscal',
    'event.fiscal_stress.desc': 'Deterioração fiscal eleva juros futuros e pressiona bolsa.',
    'event.commodity_boom.title': 'Boom de Commodities',
    'event.commodity_boom.desc': 'Alta global de commodities beneficia exportadores e atividade.',
    'event.sector_crash.title': 'Crash Setorial',
    'event.sector_crash.desc': 'Bolha estoura e setor sofre colapso severo.',
    'event.ipo.title': 'IPO: {company}',
    'event.ipo.desc': '{company} ({ticker}) estreia na bolsa no setor {sector}.',
    // Sectors
    'sector.BANCOS': 'Bancos', 'sector.ENERGIA': 'Energia', 'sector.VAREJO': 'Varejo',
    'sector.AGRO': 'Agronegócio', 'sector.TECH': 'Tecnologia', 'sector.MINERACAO': 'Mineração',
    'sector.SAUDE': 'Saúde', 'sector.INDUSTRIA': 'Indústria', 'sector.UTILITIES': 'Utilidades',
    'sector.IMOB': 'Imobiliário', 'sector.TELECOM': 'Telecom', 'sector.LOGISTICA': 'Logística',
    'sector.TOTAL_MARKET': 'Mercado Total', 'sector.DIVIDENDS': 'Dividendos',
    'sector.SMALL_CAPS': 'Small Caps', 'sector.BRICK': 'Construção', 'sector.PAPER': 'Papel',
    'sector.HYBRID': 'Híbrido', 'sector.NONE': 'N/A',
    // CorrGroups
    'group.EQUITY': 'Renda Variável', 'group.CRYPTO': 'Criptomoedas', 'group.FIXED_INCOME': 'Renda Fixa',
    // Asset Classes
    'class.RF_POS': 'RF Pós', 'class.RF_PRE': 'RF Pré', 'class.RF_IPCA': 'RF IPCA+',
    'class.DEBENTURE': 'Debênture', 'class.STOCK': 'Ação', 'class.ETF': 'ETF',
    'class.FII': 'FII', 'class.CRYPTO_MAJOR': 'Cripto Major', 'class.CRYPTO_ALT': 'Cripto Alt',
    // Regimes
    'regime.CALM': 'Calmo', 'regime.BULL': 'Bull', 'regime.BEAR': 'Bear',
    'regime.CRISIS': 'Crise', 'regime.CRYPTO_EUPHORIA': 'Euforia Cripto',
    // Misc
    'missed.drawdown': 'Drawdown significativo ocorreu durante o avanço rápido.',
    'trade.halted': 'Ativo suspenso para negociação.',
    'trade.invalid_quantity': 'Quantidade inválida.',
    'trade.insufficient_cash': 'Caixa insuficiente.',
    'trade.no_position': 'Posição insuficiente.',
    'credit.watch': 'Sinais de stress no crédito de {asset}.',
    'credit.default': '{asset} deu default! Perda de {loss}% do principal.',
  },
  'en': {
    'asset.tselic': 'Treasury Selic', 'asset.cdb100': 'CDB 100% CDI', 'asset.cdb110': 'CDB 110% CDI',
    'asset.cdbpre': 'CDB Pre 12%', 'asset.tpre': 'Treasury Pre', 'asset.tipca': 'Treasury IPCA+',
    'asset.debaa': 'Debenture AA', 'asset.debbbb': 'Debenture BBB',
    // ETFs
    'asset.bova11': 'Ibovespa ETF', 'asset.divo11': 'Dividend ETF',
    'asset.teck11': 'Brazil Tech ETF', 'asset.smal11': 'Small Cap ETF',
    'asset.ivvb11': 'S&P 500 ETF (Dollar)',
    // Events
    'event.rate_hike.title': 'Rate Hike',
    'event.rate_hike.desc': 'Central bank raises base rate. Fixed income benefits, equities pressured.',
    'event.rate_cut.title': 'Rate Cut',
    'event.rate_cut.desc': 'Central bank cuts base rate. Stocks and REITs rally.',
    'event.inflation_up.title': 'Inflation Rises',
    'event.inflation_up.desc': 'CPI above expectations. Retail suffers, IPCA+ protects.',
    'event.inflation_down.title': 'Inflation Cools',
    'event.inflation_down.desc': 'CPI surprises to the downside. Broad market relief.',
    'event.sector_boom.title': 'Sector Boom',
    'event.sector_boom.desc': 'Positive earnings boost the sector.',
    'event.sector_bust.title': 'Sector Bust',
    'event.sector_bust.desc': 'Negative news pressures the sector.',
    'event.crypto_hack.title': 'Exchange Hack',
    'event.crypto_hack.desc': 'Exchange suffers hack. Crypto plunges.',
    'event.crypto_euphoria.title': 'Crypto Euphoria',
    'event.crypto_euphoria.desc': 'Social media drives alts. Volatility explodes.',
    'event.crypto_rug_pull.title': 'Rug Pull!',
    'event.crypto_rug_pull.desc': 'Project collapses. Alt crypto loses value catastrophically.',
    'event.credit_downgrade.title': 'Credit Downgrade',
    'event.credit_downgrade.desc': 'Agency downgrades debenture rating. Price drops.',
    'event.fx_shock.title': 'FX Shock',
    'event.fx_shock.desc': 'Dollar surges on capital outflows. Country risk rises.',
    'event.fiscal_stress.title': 'Fiscal Stress',
    'event.fiscal_stress.desc': 'Fiscal deterioration raises future rates and pressures equities.',
    'event.commodity_boom.title': 'Commodity Boom',
    'event.commodity_boom.desc': 'Global commodity surge benefits exporters and economic activity.',
    'event.sector_crash.title': 'Sector Crash',
    'event.sector_crash.desc': 'Bubble bursts and sector suffers severe collapse.',
    'event.ipo.title': 'IPO: {company}',
    'event.ipo.desc': '{company} ({ticker}) listed on the exchange in {sector} sector.',
    // Sectors
    'sector.BANCOS': 'Banks', 'sector.ENERGIA': 'Energy', 'sector.VAREJO': 'Retail',
    'sector.AGRO': 'Agriculture', 'sector.TECH': 'Technology', 'sector.MINERACAO': 'Mining',
    'sector.SAUDE': 'Healthcare', 'sector.INDUSTRIA': 'Industry', 'sector.UTILITIES': 'Utilities',
    'sector.IMOB': 'Real Estate', 'sector.TELECOM': 'Telecom', 'sector.LOGISTICA': 'Logistics',
    'sector.TOTAL_MARKET': 'Total Market', 'sector.DIVIDENDS': 'Dividends',
    'sector.SMALL_CAPS': 'Small Caps', 'sector.BRICK': 'Brick', 'sector.PAPER': 'Paper',
    'sector.HYBRID': 'Hybrid', 'sector.NONE': 'N/A',
    // CorrGroups
    'group.EQUITY': 'Equities', 'group.CRYPTO': 'Crypto', 'group.FIXED_INCOME': 'Fixed Income',
    // Asset Classes
    'class.RF_POS': 'Post-fixed', 'class.RF_PRE': 'Pre-fixed', 'class.RF_IPCA': 'Inflation-linked',
    'class.DEBENTURE': 'Debenture', 'class.STOCK': 'Stock', 'class.ETF': 'ETF',
    'class.FII': 'REIT', 'class.CRYPTO_MAJOR': 'Crypto Major', 'class.CRYPTO_ALT': 'Crypto Alt',
    // Regimes
    'regime.CALM': 'Calm', 'regime.BULL': 'Bull', 'regime.BEAR': 'Bear',
    'regime.CRISIS': 'Crisis', 'regime.CRYPTO_EUPHORIA': 'Crypto Euphoria',
    'missed.drawdown': 'Significant drawdown occurred during fast-forward.',
    'trade.halted': 'Asset halted for trading.',
    'trade.invalid_quantity': 'Invalid quantity.',
    'trade.insufficient_cash': 'Insufficient cash.',
    'trade.no_position': 'Insufficient position.',
    'credit.watch': 'Credit stress signals for {asset}.',
    'credit.default': '{asset} defaulted! Loss of {loss}% of principal.',
  },
};

let currentLocale: Locale = 'pt-BR';

export function setLocale(locale: Locale) { currentLocale = locale; }
export function getLocale(): Locale { return currentLocale; }

export function t(key: string, vars?: Record<string, string | number>): string {
  let text = translations[currentLocale]?.[key] ?? translations['en']?.[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return text;
}

/** Resolve asset display name: use displayName if available, otherwise i18n lookup */
export function assetName(def: { nameKey: string; displayName?: string }): string {
  if (def.displayName) return def.displayName;
  return t(def.nameKey);
}
