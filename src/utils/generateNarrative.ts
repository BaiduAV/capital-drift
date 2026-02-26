import type { RegimeId, EventCard } from '@/engine/types';

interface NarrativeInput {
  regime: RegimeId;
  lastEvents: EventCard[];
  drawdown: number; // current drawdown as fraction (0.1 = 10%)
  inflationAnnual: number;
  baseRateAnnual: number;
  locale: 'pt-BR' | 'en';
}

const narratives: Record<string, { pt: string; en: string }> = {
  crisis_deep: {
    pt: 'A crise aprofunda as perdas. Considere ativos defensivos como Tesouro Selic.',
    en: 'The crisis deepens losses. Consider defensive assets like Treasury Selic.',
  },
  crisis_mild: {
    pt: 'Mercados sob pressão. Volatilidade elevada exige cautela.',
    en: 'Markets under pressure. High volatility demands caution.',
  },
  bear_inflation: {
    pt: 'Inflação alta e mercado em queda pressionam seu portfólio. IPCA+ pode proteger.',
    en: 'High inflation and falling markets pressure your portfolio. IPCA+ may protect.',
  },
  bear_rates: {
    pt: 'Juros subindo em mercado de baixa. Renda fixa pós-fixada ganha atratividade.',
    en: 'Rising rates in a bear market. Post-fixed income gains appeal.',
  },
  bear_default: {
    pt: 'Cenário adverso para renda variável. Preserve capital em renda fixa.',
    en: 'Adverse scenario for equities. Preserve capital in fixed income.',
  },
  bull_strong: {
    pt: 'Mercado em alta! Momento favorável para ações e FIIs.',
    en: 'Bull market! Favorable moment for stocks and REITs.',
  },
  bull_inflation_low: {
    pt: 'Inflação controlada e mercado aquecido. Condições ideais para crescimento.',
    en: 'Controlled inflation and heated market. Ideal conditions for growth.',
  },
  calm_stable: {
    pt: 'Economia estável. Bom momento para diversificar e montar posições.',
    en: 'Stable economy. Good time to diversify and build positions.',
  },
  calm_high_rates: {
    pt: 'Juros elevados em cenário calmo. CDI e Selic rendem bem com baixo risco.',
    en: 'High rates in calm scenario. CDI and Selic yield well with low risk.',
  },
  crypto_euphoria: {
    pt: 'Euforia cripto! Altcoins disparam, mas cuidado com a volatilidade extrema.',
    en: 'Crypto euphoria! Altcoins soar, but beware extreme volatility.',
  },
  rate_hike_event: {
    pt: 'BC subiu juros. Títulos prefixados sofrem, pós-fixados se beneficiam.',
    en: 'Central bank raised rates. Pre-fixed bonds suffer, post-fixed benefit.',
  },
  rate_cut_event: {
    pt: 'BC cortou juros. Ações e FIIs ganham fôlego, renda fixa perde margem.',
    en: 'Central bank cut rates. Stocks and REITs rally, fixed income margins shrink.',
  },
  inflation_up_event: {
    pt: 'Inflação acelerou. Proteja-se com IPCA+ e ativos reais.',
    en: 'Inflation accelerated. Protect with IPCA+ and real assets.',
  },
  crypto_hack_event: {
    pt: 'Hack em exchange abalou o mercado cripto. Considere reduzir exposição.',
    en: 'Exchange hack shook the crypto market. Consider reducing exposure.',
  },
  drawdown_severe: {
    pt: 'Drawdown severo! Seu patrimônio caiu significativamente do pico.',
    en: 'Severe drawdown! Your equity dropped significantly from peak.',
  },
  fx_shock_event: {
    pt: 'Dólar disparou! Aumento do risco cambial pressiona ativos domésticos.',
    en: 'Dollar surged! FX risk increase pressures domestic assets.',
  },
  fiscal_stress_event: {
    pt: 'Risco fiscal elevado. Juros futuros sobem, bolsa e prefixados sofrem.',
    en: 'Elevated fiscal risk. Future rates rise, equities and pre-fixed bonds suffer.',
  },
  commodity_boom_event: {
    pt: 'Boom de commodities! Exportadores se beneficiam, real se fortalece.',
    en: 'Commodity boom! Exporters benefit, real strengthens.',
  },
};

export function generateNarrative(input: NarrativeInput): string {
  const { regime, lastEvents, drawdown, inflationAnnual, baseRateAnnual, locale } = input;
  const pick = (key: string) => locale === 'pt-BR' ? narratives[key].pt : narratives[key].en;

  // Check last event first for immediacy
  const lastEvent = lastEvents.length > 0 ? lastEvents[lastEvents.length - 1] : null;
  if (lastEvent) {
    if (lastEvent.type === 'RATE_HIKE') return pick('rate_hike_event');
    if (lastEvent.type === 'RATE_CUT') return pick('rate_cut_event');
    if (lastEvent.type === 'INFLATION_UP') return pick('inflation_up_event');
    if (lastEvent.type === 'CRYPTO_HACK') return pick('crypto_hack_event');
    if (lastEvent.type === 'FX_SHOCK') return pick('fx_shock_event');
    if (lastEvent.type === 'FISCAL_STRESS') return pick('fiscal_stress_event');
    if (lastEvent.type === 'COMMODITY_BOOM') return pick('commodity_boom_event');
  }

  // Severe drawdown overrides
  if (drawdown > 0.15) return pick('drawdown_severe');

  // Regime-based
  switch (regime) {
    case 'CRISIS':
      return drawdown > 0.10 ? pick('crisis_deep') : pick('crisis_mild');
    case 'BEAR':
      if (inflationAnnual > 0.07) return pick('bear_inflation');
      if (baseRateAnnual > 0.12) return pick('bear_rates');
      return pick('bear_default');
    case 'BULL':
      return inflationAnnual < 0.04 ? pick('bull_inflation_low') : pick('bull_strong');
    case 'CRYPTO_EUPHORIA':
      return pick('crypto_euphoria');
    case 'CALM':
    default:
      return baseRateAnnual > 0.10 ? pick('calm_high_rates') : pick('calm_stable');
  }
}
