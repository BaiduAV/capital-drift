// ── Social Feed Engine: Twitter-like post generation from market events ──

import type { EventCard, EventType, GameState, DayResult } from './types';

export interface SocialPost {
  id: string;
  accountType: 'media' | 'influencer' | 'corporate';
  handle: string;
  displayName: string;
  avatarEmoji: string;
  verified: boolean;
  text: string;
  dayIndex: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  engagement: { likes: number; reposts: number; replies: number };
  relatedEvent: EventType;
}

// ── Media Channels ──

interface MediaChannel {
  handle: string;
  displayName: string;
  avatarEmoji: string;
  coverage: EventType[];
}

const MEDIA_CHANNELS: MediaChannel[] = [
  {
    handle: 'InfoMoneyBR',
    displayName: 'InfoMoney',
    avatarEmoji: '📰',
    coverage: ['RATE_HIKE', 'RATE_CUT', 'INFLATION_UP', 'INFLATION_DOWN', 'FISCAL_STRESS'],
  },
  {
    handle: 'BloombergBR',
    displayName: 'Bloomberg Línea',
    avatarEmoji: '🟦',
    coverage: ['FX_SHOCK', 'COMMODITY_BOOM', 'RATE_HIKE', 'RATE_CUT'],
  },
  {
    handle: 'ValorInveste',
    displayName: 'Valor Econômico',
    avatarEmoji: '📊',
    coverage: ['SECTOR_BOOM', 'SECTOR_BUST', 'SECTOR_CRASH', 'IPO_ANNOUNCED', 'IPO_BOOKBUILDING', 'IPO_LISTED'],
  },
  {
    handle: 'CoinDeskBR',
    displayName: 'CoinDesk Brasil',
    avatarEmoji: '₿',
    coverage: ['CRYPTO_HACK', 'CRYPTO_EUPHORIA_EVENT', 'CRYPTO_RUG_PULL'],
  },
  {
    handle: 'ExameBiz',
    displayName: 'Exame Invest',
    avatarEmoji: '💼',
    coverage: ['CREDIT_DOWNGRADE', 'FISCAL_STRESS', 'INFLATION_UP', 'COMMODITY_BOOM'],
  },
];

// ── Influencers ──

interface Influencer {
  handle: string;
  displayName: string;
  avatarEmoji: string;
  specialty: EventType[];
  tone: 'optimistic' | 'cautious' | 'hype' | 'conservative' | 'technical';
}

const INFLUENCERS: Influencer[] = [
  {
    handle: 'thiagofinancas',
    displayName: 'Thiago Nigro',
    avatarEmoji: '🧑‍💼',
    specialty: ['SECTOR_BOOM', 'SECTOR_BUST', 'SECTOR_CRASH', 'RATE_HIKE', 'RATE_CUT'],
    tone: 'optimistic',
  },
  {
    handle: 'naborges',
    displayName: 'Nathalia Arcuri',
    avatarEmoji: '👩‍💻',
    specialty: ['RATE_HIKE', 'RATE_CUT', 'INFLATION_UP', 'INFLATION_DOWN', 'CREDIT_DOWNGRADE'],
    tone: 'cautious',
  },
  {
    handle: 'felipecripto',
    displayName: 'Felipe Crypto',
    avatarEmoji: '🚀',
    specialty: ['CRYPTO_HACK', 'CRYPTO_EUPHORIA_EVENT', 'CRYPTO_RUG_PULL'],
    tone: 'hype',
  },
  {
    handle: 'luizbarsi',
    displayName: 'Luiz Barsi Jr.',
    avatarEmoji: '🎩',
    specialty: ['SECTOR_BOOM', 'SECTOR_BUST', 'SECTOR_CRASH', 'COMMODITY_BOOM'],
    tone: 'conservative',
  },
  {
    handle: 'analistamacro',
    displayName: 'Ana Macro',
    avatarEmoji: '📈',
    specialty: ['RATE_HIKE', 'RATE_CUT', 'INFLATION_UP', 'INFLATION_DOWN', 'FX_SHOCK', 'FISCAL_STRESS'],
    tone: 'technical',
  },
];

// ── Post Templates ──

type TemplateSet = {
  media: string[];
  reactions: Record<string, string[]>; // influencer handle → templates
  corporate?: string[];
  sentiment: 'bullish' | 'bearish' | 'neutral';
};

const TEMPLATES_PT: Record<EventType, TemplateSet> = {
  RATE_HIKE: {
    media: [
      '🔴 URGENTE: Banco Central eleva a Selic. Mercado reage com cautela.',
      '🔴 BREAKING: Copom decide por nova alta na taxa básica de juros.',
      '🔴 BC sobe juros novamente. Renda fixa ganha tração entre investidores.',
    ],
    reactions: {
      analistamacro: [
        'Decisão era esperada pelo mercado. Com a inflação pressionada, não havia alternativa. Renda fixa segue como porto seguro.',
        'Alta de juros dentro do esperado. O ciclo de aperto monetário deve continuar nos próximos trimestres.',
      ],
      thiagofinancas: [
        'Calma, galera! Juros altos = oportunidade pra quem pensa no longo prazo. Ações de qualidade ficam baratas. 📉➡️📈',
        'Subiu de novo? Hora de montar posição em boas empresas. O mercado sempre volta! 💪',
      ],
      naborges: [
        'Juros subindo? Hora de revisar a carteira. CDBs e Tesouro Selic ficam mais atrativos agora.',
        'Pra quem tem reserva de emergência, é hora de aproveitar os rendimentos maiores da renda fixa.',
      ],
    },
    sentiment: 'bearish',
  },
  RATE_CUT: {
    media: [
      '🟢 URGENTE: Banco Central reduz a Selic. Bolsa reage em alta.',
      '🟢 BREAKING: Copom corta taxa de juros. Mercado comemora.',
      '🟢 BC inicia ciclo de cortes. Expectativa de migração para renda variável.',
    ],
    reactions: {
      analistamacro: [
        'Corte veio em linha com o esperado. Isso deve aquecer o mercado de ações nos próximos meses.',
        'Início do afrouxamento monetário. Olho nos setores cíclicos que tendem a se beneficiar.',
      ],
      thiagofinancas: [
        'JUROS CAINDO! 🎉 Hora de olhar pra bolsa com carinho. Empresas boas, preço justo, dividendos gordos!',
        'O momento é AGORA pra quem quer renda variável. Não esperem o fundo, ele já pode ter passado! 🚀',
      ],
      naborges: [
        'Juros caindo é bom, mas cuidado: não saia da renda fixa toda de uma vez. Diversificação é chave.',
        'Com juros menores, a renda fixa rende menos. Bom momento pra estudar FIIs e ações de dividendos.',
      ],
    },
    sentiment: 'bullish',
  },
  INFLATION_UP: {
    media: [
      '🔥 Inflação acelera e preocupa o mercado. Custo de vida pressiona famílias.',
      '🔥 IPCA sobe acima das expectativas. Analistas revisam projeções.',
      '🔥 Inflação em alta: alimentos e combustíveis lideram os aumentos.',
    ],
    reactions: {
      analistamacro: [
        'Inflação acima do esperado pressiona o BC a manter juros altos por mais tempo. Cenário desafiador.',
        'Dados de inflação preocupantes. Títulos IPCA+ ficam mais atrativos nesse cenário.',
      ],
      naborges: [
        'Inflação alta come o seu dinheiro parado. NUNCA deixe na poupança. Tesouro IPCA+ é o mínimo!',
        'Preços subindo de novo... Hora de proteger seu patrimônio com ativos indexados à inflação.',
      ],
    },
    sentiment: 'bearish',
  },
  INFLATION_DOWN: {
    media: [
      '❄️ Inflação desacelera e alivia pressão sobre o BC.',
      '❄️ IPCA vem abaixo do esperado. Mercado celebra dados positivos.',
      '❄️ Arrefecimento da inflação abre espaço para cortes de juros.',
    ],
    reactions: {
      analistamacro: [
        'Inflação cedendo é o cenário ideal para início de cortes. Mercado deve precificar isso rapidamente.',
        'Dados positivos de inflação. Curva de juros deve fechar, beneficiando prefixados.',
      ],
      thiagofinancas: [
        'Inflação caindo! A maré tá mudando, pessoal. Quem se posicionar agora colhe lá na frente! 🌊',
      ],
    },
    sentiment: 'bullish',
  },
  SECTOR_BOOM: {
    media: [
      '🚀 {sector} em alta: ações do segmento disparam na sessão de hoje.',
      '🚀 Rally em {sector}: analistas apontam fundamentos sólidos para a alta.',
      '🚀 Boom em {sector}! Empresas do setor registram máximas históricas.',
    ],
    reactions: {
      thiagofinancas: [
        'Olha {sector} voando! 🚀 Quem montou posição meses atrás tá sorrindo agora. Paciência paga!',
        'Rally forte em {sector}! Mas cuidado pra não entrar no topo. Quem tá dentro, segura. Quem tá fora, estuda antes.',
      ],
      luizbarsi: [
        '{sector} em alta expressiva. Mas lembrem: o que sobe rápido, pode cair rápido. Foquem em fundamentos.',
        'Setores cíclicos têm dessas altas. O importante é estar posicionado antes, não durante a euforia.',
      ],
    },
    sentiment: 'bullish',
  },
  SECTOR_BUST: {
    media: [
      '📉 {sector} em queda: ações recuam forte com deterioração do cenário.',
      '📉 Pressão vendedora atinge {sector}. Investidores buscam proteção.',
      '📉 Queda acentuada em {sector}: analistas recomendam cautela.',
    ],
    reactions: {
      thiagofinancas: [
        '{sector} caiu? OPORTUNIDADE! As melhores empresas sobrevivem às crises e saem mais fortes. 💎',
        'Todo mundo com medo de {sector}? É quando eu começo a ficar de olho. Medo dos outros = desconto pra gente.',
      ],
      luizbarsi: [
        'Quedas em {sector} são normais no mercado. Quem tem bons ativos e paciência, não precisa se preocupar.',
        'Boas empresas de {sector} baratas. É nessas horas que se constrói patrimônio de verdade.',
      ],
    },
    sentiment: 'bearish',
  },
  SECTOR_CRASH: {
    media: [
      '💥 CRASH em {sector}: setor desaba em pregão histórico. Circuit breaker acionado.',
      '💥 ALERTA: Queda abrupta em {sector} provoca pânico no mercado.',
      '💥 Crash em {sector}: bilhões em valor de mercado evaporam em horas.',
    ],
    reactions: {
      thiagofinancas: [
        '😱 Dia difícil pra {sector}. Mas lembrem: quem vendeu na crise de 2008 se arrependeu. HOLD! 💪',
      ],
      luizbarsi: [
        'Crashes em {sector} acontecem. Eles separam quem investe de quem especula. Mantenham a calma.',
      ],
      analistamacro: [
        'Crash em {sector} com volume recorde. Possível contágio para outros setores. Atenção redobrada.',
      ],
    },
    sentiment: 'bearish',
  },
  CRYPTO_HACK: {
    media: [
      '⚠️ BREAKING: Exchange sofre ataque hacker. Criptomoedas em forte queda.',
      '⚠️ Hack bilionário abala mercado cripto. Investidores sacam em massa.',
      '⚠️ Segurança cripto em xeque: novo ataque levanta questões sobre custódia.',
    ],
    reactions: {
      felipecripto: [
        'Mais um hack... por isso eu sempre digo: NOT YOUR KEYS, NOT YOUR COINS. Quem segura na cold wallet tá safe. 💎🙌',
        'Ruim pro mercado no curto prazo, mas Bitcoin continua descentralizado e seguro. Isso vai passar. 🔒',
      ],
    },
    sentiment: 'bearish',
  },
  CRYPTO_EUPHORIA_EVENT: {
    media: [
      '🎉 Mercado cripto em êxtase: Bitcoin e altcoins disparam com volume recorde.',
      '🎉 Euforia cripto: capitalização total atinge novos patamares históricos.',
      '🎉 Rally cripto: influencers e institucionais impulsionam nova onda de alta.',
    ],
    reactions: {
      felipecripto: [
        'TO THE MOON! 🌕🚀 Quem comprou quando todo mundo tinha medo tá rindo agora! HODL galera!',
        'EU AVISEI! 🔥 Quem tá comigo desde o bear market sabe. Isso é só o começo! LFG! 🚀🚀🚀',
      ],
    },
    sentiment: 'bullish',
  },
  CRYPTO_RUG_PULL: {
    media: [
      '💀 ALERTA: Projeto cripto colapsa em suposto rug pull. Investidores perdem tudo.',
      '💀 Golpe cripto: token desaba 99% após desenvolvedores desaparecerem.',
      '💀 Rug pull confirmado: comunidade cripto exige regulamentação.',
    ],
    reactions: {
      felipecripto: [
        'Triste, mas previsível. DYOR, galera! Nunca coloquem tudo em um token só. Diversifiquem! 🧠',
        'Mais um rug pull... É por isso que eu só recomendo BTC e ETH pra quem tá começando. O resto é cassino. 🎰',
      ],
    },
    sentiment: 'bearish',
  },
  CREDIT_DOWNGRADE: {
    media: [
      '⚠️ Agência rebaixa nota de crédito de emissor. Debêntures sob pressão.',
      '⚠️ Downgrade de crédito: spread de risco amplia para títulos corporativos.',
      '⚠️ Rebaixamento de rating gera sell-off em papéis de crédito privado.',
    ],
    reactions: {
      naborges: [
        'Downgrade de crédito é sinal vermelho. Revisem suas debêntures e CDBs de bancos menores!',
        'É por isso que eu sempre digo: não vá atrás de rentabilidade alta sem olhar o risco. Qualidade primeiro!',
      ],
      analistamacro: [
        'Rebaixamento era questão de tempo dado os fundamentos. Cuidado com exposição a crédito privado.',
      ],
    },
    sentiment: 'bearish',
  },
  FX_SHOCK: {
    media: [
      '💵 URGENTE: Dólar dispara e pressiona mercado brasileiro.',
      '💵 Câmbio em choque: Real sofre forte desvalorização.',
      '💵 Dólar salta com fuga de capital estrangeiro. BC pode intervir.',
    ],
    reactions: {
      analistamacro: [
        'Choque cambial reflete deterioração das contas externas. Pressão inflacionária à vista.',
        'Movimento brusco no câmbio. Esperem intervenção do BC via swaps nos próximos dias.',
      ],
      luizbarsi: [
        'Dólar subindo favorece exportadoras. Quem tem Vale, Suzano e companhia, pode comemorar.',
      ],
    },
    sentiment: 'bearish',
  },
  FISCAL_STRESS: {
    media: [
      '🏛️ Risco fiscal escala: mercado cobra prêmio maior em juros longos.',
      '🏛️ URGENTE: Governo sinaliza dificuldade em cumprir meta fiscal.',
      '🏛️ Estresse fiscal: CDS Brasil sobe e investidores reduzem exposição.',
    ],
    reactions: {
      analistamacro: [
        'Risco fiscal é o maior fantasma do mercado brasileiro. Curva de juros abrindo forte.',
        'Fiscal deteriorando. Isso contamina câmbio, juros e bolsa. Cenário de aversão a risco.',
      ],
      naborges: [
        'Quando o governo gasta demais, quem paga é o investidor via inflação. Protejam-se com IPCA+!',
      ],
    },
    sentiment: 'bearish',
  },
  COMMODITY_BOOM: {
    media: [
      '🛢️ Commodities em alta: minério e petróleo impulsionam bolsa brasileira.',
      '🛢️ Boom de commodities: Brasil se beneficia como grande exportador.',
      '🛢️ Preços de commodities em forte alta. Ações ligadas ao setor disparam.',
    ],
    reactions: {
      luizbarsi: [
        'Brasil é terra de commodity. Quando o ciclo favorece, nossas empresas voam. Posicionem-se!',
        'Commodities em alta = dividendos gordos de Petrobras, Vale e afins. Eu já estou posicionado.',
      ],
      thiagofinancas: [
        'Boom de commodities! 🛢️ Brasil se beneficia direto. Hora de olhar pra mineração e agro! 📈',
      ],
    },
    sentiment: 'bullish',
  },
  IPO_ANNOUNCED: {
    media: [
      '📋 NOVO IPO: Empresa anuncia intenção de abrir capital na B3.',
      '📋 Mercado aquece: mais uma empresa prepara IPO para as próximas semanas.',
    ],
    reactions: {
      thiagofinancas: [
        'Novo IPO chegando! 👀 Vou analisar os fundamentos e trago minha opinião em breve.',
      ],
    },
    corporate: [
      'Temos o prazer de anunciar nossa intenção de listar na B3. Um novo capítulo começa. #IPO',
    ],
    sentiment: 'neutral',
  },
  IPO_BOOKBUILDING: {
    media: [
      '📊 Bookbuilding aberto: investidores podem reservar ações do IPO.',
      '📊 Demanda forte no bookbuilding: IPO pode sair acima da faixa indicativa.',
    ],
    reactions: {
      thiagofinancas: [
        'Reservas abertas! Vou entrar nesse IPO? Depende do valuation. Analisando agora... 🔍',
      ],
    },
    corporate: [
      'Período de reserva aberto. Confiamos no interesse dos investidores. Detalhes no prospecto.',
    ],
    sentiment: 'neutral',
  },
  IPO_LISTED: {
    media: [
      '🔔 IPO concluído! Ações estreiam na B3 com forte movimentação.',
      '🔔 Listagem realizada: novo ativo disponível para negociação na B3.',
    ],
    reactions: {
      thiagofinancas: [
        'Listou! 🎉 Agora é acompanhar os primeiros resultados e ver se a tese se confirma.',
      ],
      luizbarsi: [
        'IPOs são sempre uma aposta. Prefiro esperar o primeiro balanço antes de entrar.',
      ],
    },
    corporate: [
      'Hoje marcamos o início de uma nova fase. Obrigado pela confiança dos investidores. #IPO',
    ],
    sentiment: 'bullish',
  },
};

const TEMPLATES_EN: Record<EventType, TemplateSet> = {
  RATE_HIKE: {
    media: [
      '🔴 BREAKING: Central Bank raises interest rates. Markets react with caution.',
      '🔴 URGENT: Monetary policy committee announces another rate hike.',
      '🔴 Rates up again. Fixed income gains traction among investors.',
    ],
    reactions: {
      analistamacro: [
        'Decision was expected by the market. With inflation pressured, there was no alternative. Fixed income remains the safe haven.',
        'Rate hike in line with expectations. The tightening cycle should continue in coming quarters.',
      ],
      thiagofinancas: [
        'Stay calm, folks! High rates = opportunity for long-term thinkers. Quality stocks get cheap. 📉➡️📈',
        'Rates up again? Time to build positions in great companies. The market always comes back! 💪',
      ],
      naborges: [
        'Rates rising? Time to review your portfolio. CDs and money market funds become more attractive now.',
        'If you have an emergency fund, it\'s time to take advantage of higher fixed income yields.',
      ],
    },
    sentiment: 'bearish',
  },
  RATE_CUT: {
    media: [
      '🟢 BREAKING: Central Bank cuts interest rates. Stock market rallies.',
      '🟢 URGENT: Rate cut announced. Markets celebrate the decision.',
      '🟢 Easing cycle begins. Expectations of capital rotation into equities.',
    ],
    reactions: {
      analistamacro: [
        'Cut was in line with expectations. This should boost the equity market in coming months.',
        'Start of monetary easing. Watch cyclical sectors that tend to benefit.',
      ],
      thiagofinancas: [
        'RATES FALLING! 🎉 Time to look at stocks with love. Good companies, fair prices, fat dividends!',
        'The moment is NOW for equities. Don\'t wait for the bottom, it may have already passed! 🚀',
      ],
      naborges: [
        'Rate cuts are good, but be careful: don\'t exit fixed income all at once. Diversification is key.',
        'With lower rates, fixed income yields less. Good time to study REITs and dividend stocks.',
      ],
    },
    sentiment: 'bullish',
  },
  INFLATION_UP: {
    media: [
      '🔥 Inflation accelerates, worrying the market. Cost of living pressures households.',
      '🔥 CPI rises above expectations. Analysts revise projections upward.',
      '🔥 Inflation on the rise: food and fuel lead the increases.',
    ],
    reactions: {
      analistamacro: [
        'Inflation above expectations pressures the Central Bank to keep rates high longer. Challenging outlook.',
        'Worrying inflation data. Inflation-linked bonds become more attractive in this scenario.',
      ],
      naborges: [
        'High inflation eats your idle money. NEVER leave it in savings. Inflation-linked bonds are the minimum!',
        'Prices rising again... Time to protect your wealth with inflation-indexed assets.',
      ],
    },
    sentiment: 'bearish',
  },
  INFLATION_DOWN: {
    media: [
      '❄️ Inflation decelerates, easing pressure on the Central Bank.',
      '❄️ CPI comes in below expectations. Markets celebrate positive data.',
      '❄️ Cooling inflation opens room for rate cuts.',
    ],
    reactions: {
      analistamacro: [
        'Falling inflation is the ideal scenario for rate cuts. Market should price this in quickly.',
        'Positive inflation data. Yield curve should flatten, benefiting fixed-rate bonds.',
      ],
      thiagofinancas: [
        'Inflation falling! The tide is turning, folks. Position now and reap the rewards later! 🌊',
      ],
    },
    sentiment: 'bullish',
  },
  SECTOR_BOOM: {
    media: [
      '🚀 {sector} rallying: stocks in the segment surge in today\'s session.',
      '🚀 {sector} rally: analysts point to solid fundamentals behind the rise.',
      '🚀 {sector} boom! Companies hit all-time highs.',
    ],
    reactions: {
      thiagofinancas: [
        'Look at {sector} flying! 🚀 Those who built positions months ago are smiling now. Patience pays!',
        'Strong rally in {sector}! But be careful not to buy at the top. If you\'re in, hold. If you\'re out, study first.',
      ],
      luizbarsi: [
        '{sector} rally is impressive. But remember: what goes up fast can come down fast. Focus on fundamentals.',
        'Cyclical sectors have these rallies. The key is being positioned before, not during the euphoria.',
      ],
    },
    sentiment: 'bullish',
  },
  SECTOR_BUST: {
    media: [
      '📉 {sector} declining: stocks fall sharply as outlook deteriorates.',
      '📉 Selling pressure hits {sector}. Investors seek protection.',
      '📉 Sharp decline in {sector}: analysts recommend caution.',
    ],
    reactions: {
      thiagofinancas: [
        '{sector} dropped? OPPORTUNITY! The best companies survive crises and come out stronger. 💎',
        'Everyone scared of {sector}? That\'s when I start paying attention. Others\' fear = our discount.',
      ],
      luizbarsi: [
        'Drops in {sector} are normal in the market. Those with good assets and patience don\'t need to worry.',
        'Good {sector} companies at cheap prices. This is when real wealth is built.',
      ],
    },
    sentiment: 'bearish',
  },
  SECTOR_CRASH: {
    media: [
      '💥 {sector} CRASH: sector collapses in historic session. Circuit breaker triggered.',
      '💥 ALERT: Abrupt decline in {sector} triggers market panic.',
      '💥 {sector} crash: billions in market cap evaporate in hours.',
    ],
    reactions: {
      thiagofinancas: [
        '😱 Tough day for {sector}. But remember: those who sold during the 2008 crisis regretted it. HOLD! 💪',
      ],
      luizbarsi: [
        'Crashes in {sector} happen. They separate investors from speculators. Stay calm and stick to your strategy.',
      ],
      analistamacro: [
        '{sector} crash with record volume. Possible contagion to other sectors. Stay vigilant.',
      ],
    },
    sentiment: 'bearish',
  },
  CRYPTO_HACK: {
    media: [
      '⚠️ BREAKING: Exchange suffers hacker attack. Cryptocurrencies in steep decline.',
      '⚠️ Billion-dollar hack shakes crypto market. Investors rush to withdraw.',
      '⚠️ Crypto security questioned: new attack raises custody concerns.',
    ],
    reactions: {
      felipecripto: [
        'Another hack... that\'s why I always say: NOT YOUR KEYS, NOT YOUR COINS. Cold wallet holders stay safe. 💎🙌',
        'Bad for the market short-term, but Bitcoin remains decentralized and secure. This will pass. 🔒',
      ],
    },
    sentiment: 'bearish',
  },
  CRYPTO_EUPHORIA_EVENT: {
    media: [
      '🎉 Crypto market in ecstasy: Bitcoin and altcoins surge with record volume.',
      '🎉 Crypto euphoria: total market cap reaches new all-time highs.',
      '🎉 Crypto rally: influencers and institutions drive new wave of buying.',
    ],
    reactions: {
      felipecripto: [
        'TO THE MOON! 🌕🚀 Those who bought when everyone was scared are laughing now! HODL folks!',
        'I TOLD YOU! 🔥 Those who\'ve been with me since the bear market know. This is just the beginning! LFG! 🚀🚀🚀',
      ],
    },
    sentiment: 'bullish',
  },
  CRYPTO_RUG_PULL: {
    media: [
      '💀 ALERT: Crypto project collapses in suspected rug pull. Investors lose everything.',
      '💀 Crypto scam: token crashes 99% after developers vanish.',
      '💀 Rug pull confirmed: crypto community demands regulation.',
    ],
    reactions: {
      felipecripto: [
        'Sad but predictable. DYOR, folks! Never put everything in one token. Diversify! 🧠',
        'Another rug pull... That\'s why I only recommend BTC and ETH for beginners. The rest is a casino. 🎰',
      ],
    },
    sentiment: 'bearish',
  },
  CREDIT_DOWNGRADE: {
    media: [
      '⚠️ Rating agency downgrades credit issuer. Corporate bonds under pressure.',
      '⚠️ Credit downgrade: risk spreads widen for corporate debt.',
      '⚠️ Rating downgrade triggers sell-off in private credit instruments.',
    ],
    reactions: {
      naborges: [
        'Credit downgrade is a red flag. Review your corporate bonds and smaller bank CDs!',
        'This is why I always say: don\'t chase high yields without examining the risk. Quality first!',
      ],
      analistamacro: [
        'Downgrade was a matter of time given the fundamentals. Watch your credit exposure.',
      ],
    },
    sentiment: 'bearish',
  },
  FX_SHOCK: {
    media: [
      '💵 URGENT: Dollar surges, pressuring emerging markets.',
      '💵 FX shock: Local currency suffers sharp devaluation.',
      '💵 Dollar jumps amid foreign capital flight. Central Bank may intervene.',
    ],
    reactions: {
      analistamacro: [
        'FX shock reflects deterioration of external accounts. Inflationary pressure ahead.',
        'Sharp currency move. Expect Central Bank intervention via swaps in coming days.',
      ],
      luizbarsi: [
        'Rising dollar favors exporters. Those holding commodity stocks can celebrate.',
      ],
    },
    sentiment: 'bearish',
  },
  FISCAL_STRESS: {
    media: [
      '🏛️ Fiscal risk escalates: market demands higher premium on long-term bonds.',
      '🏛️ URGENT: Government signals difficulty meeting fiscal targets.',
      '🏛️ Fiscal stress: sovereign CDS rises as investors reduce exposure.',
    ],
    reactions: {
      analistamacro: [
        'Fiscal risk is the biggest ghost in emerging markets. Yield curve steepening sharply.',
        'Fiscal deterioration. This contaminates FX, rates, and equities. Risk-off scenario.',
      ],
      naborges: [
        'When the government overspends, investors pay via inflation. Protect yourself with inflation-linked bonds!',
      ],
    },
    sentiment: 'bearish',
  },
  COMMODITY_BOOM: {
    media: [
      '🛢️ Commodities rally: iron ore and oil boost stock market.',
      '🛢️ Commodity boom: exporter nations benefit from the surge.',
      '🛢️ Commodity prices surge. Related stocks skyrocket.',
    ],
    reactions: {
      luizbarsi: [
        'Commodity cycles favor resource-rich economies. Position yourselves!',
        'Commodities up = fat dividends from major producers. I\'m already positioned.',
      ],
      thiagofinancas: [
        'Commodity boom! 🛢️ Resource exporters benefit directly. Time to look at mining and agriculture! 📈',
      ],
    },
    sentiment: 'bullish',
  },
  IPO_ANNOUNCED: {
    media: [
      '📋 NEW IPO: Company announces intention to go public.',
      '📋 Market heats up: another company prepares IPO for the coming weeks.',
    ],
    reactions: {
      thiagofinancas: [
        'New IPO incoming! 👀 I\'ll analyze the fundamentals and share my take soon.',
      ],
    },
    corporate: [
      'We are pleased to announce our intention to list. A new chapter begins. #IPO',
    ],
    sentiment: 'neutral',
  },
  IPO_BOOKBUILDING: {
    media: [
      '📊 Bookbuilding open: investors can reserve shares for the IPO.',
      '📊 Strong demand in bookbuilding: IPO may price above indicative range.',
    ],
    reactions: {
      thiagofinancas: [
        'Reservations open! Am I joining this IPO? Depends on valuation. Analyzing now... 🔍',
      ],
    },
    corporate: [
      'Reservation period is open. We trust in investor interest. Details in the prospectus.',
    ],
    sentiment: 'neutral',
  },
  IPO_LISTED: {
    media: [
      '🔔 IPO completed! Shares debut on the exchange with strong activity.',
      '🔔 Listing done: new asset available for trading.',
    ],
    reactions: {
      thiagofinancas: [
        'Listed! 🎉 Now let\'s follow the first earnings and see if the thesis holds.',
      ],
      luizbarsi: [
        'IPOs are always a bet. I prefer to wait for the first earnings report before entering.',
      ],
    },
    corporate: [
      'Today marks the beginning of a new chapter. Thank you for your trust, investors. #IPO',
    ],
    sentiment: 'bullish',
  },
};

function getTemplates(locale: string): Record<EventType, TemplateSet> {
  return locale === 'pt-BR' ? TEMPLATES_PT : TEMPLATES_EN;
}

// ── Helpers ──

function pickTemplate(templates: string[], dayIndex: number, salt: number, vars?: Record<string, string>): string {
  let text = templates[(dayIndex + salt) % templates.length];
  if (vars) {
    for (const [key, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${key}}`, value);
    }
  }
  return text;
}

function findMediaChannel(eventType: EventType): MediaChannel {
  const match = MEDIA_CHANNELS.find(ch => ch.coverage.includes(eventType));
  return match ?? MEDIA_CHANNELS[4]; // fallback to ExameBiz
}

function findInfluencers(eventType: EventType): Influencer[] {
  return INFLUENCERS.filter(inf => inf.specialty.includes(eventType));
}

function computeEngagement(magnitude: number, dayIndex: number, salt: number): SocialPost['engagement'] {
  const base = Math.floor(magnitude * 5000 + dayIndex * 3 + salt * 7);
  const likes = Math.max(12, base);
  return {
    likes,
    reposts: Math.floor(likes * 0.3),
    replies: Math.floor(likes * 0.15),
  };
}

function sentimentFromTone(tone: Influencer['tone'], eventSentiment: TemplateSet['sentiment']): SocialPost['sentiment'] {
  if (tone === 'optimistic' && eventSentiment === 'bearish') return 'neutral';
  if (tone === 'optimistic') return 'bullish';
  if (tone === 'cautious') return eventSentiment === 'bullish' ? 'neutral' : 'bearish';
  if (tone === 'hype') return eventSentiment;
  if (tone === 'conservative') return eventSentiment === 'bullish' ? 'neutral' : eventSentiment;
  return eventSentiment; // technical
}

// ── Main Generator ──

export function generateSocialPosts(
  dayResults: DayResult[],
  state: GameState,
  maxPosts: number = 20,
  locale: string = 'pt-BR',
  t?: (key: string) => string,
): SocialPost[] {
  const posts: SocialPost[] = [];
  let postId = 0;
  const allTemplates = getTemplates(locale);

  for (let i = dayResults.length - 1; i >= 0 && posts.length < maxPosts; i--) {
    const dr = dayResults[i];
    for (const event of dr.events) {
      if (posts.length >= maxPosts) break;

      const templates = allTemplates[event.type];
      if (!templates) continue;

      const channel = findMediaChannel(event.type);

      // 1. Media post
      posts.push({
        id: `sp-${dr.dayIndex}-${event.type}-media-${postId++}`,
        accountType: 'media',
        handle: channel.handle,
        displayName: channel.displayName,
        avatarEmoji: channel.avatarEmoji,
        verified: true,
        text: pickTemplate(templates.media, dr.dayIndex, postId),
        dayIndex: dr.dayIndex,
        sentiment: templates.sentiment,
        engagement: computeEngagement(event.magnitude, dr.dayIndex, 0),
        relatedEvent: event.type,
      });

      // 2. Influencer reactions
      const relevantInfluencers = findInfluencers(event.type);
      const picked = relevantInfluencers.slice(0, dr.dayIndex % 2 === 0 ? 2 : 1);
      for (const inf of picked) {
        const infTemplates = templates.reactions[inf.handle];
        if (!infTemplates || infTemplates.length === 0) continue;
        if (posts.length >= maxPosts) break;

        posts.push({
          id: `sp-${dr.dayIndex}-${event.type}-inf-${inf.handle}-${postId++}`,
          accountType: 'influencer',
          handle: inf.handle,
          displayName: inf.displayName,
          avatarEmoji: inf.avatarEmoji,
          verified: false,
          text: pickTemplate(infTemplates, dr.dayIndex, postId),
          dayIndex: dr.dayIndex,
          sentiment: sentimentFromTone(inf.tone, templates.sentiment),
          engagement: computeEngagement(event.magnitude * 0.6, dr.dayIndex, inf.handle.length),
          relatedEvent: event.type,
        });
      }

      // 3. Corporate post (for IPOs and sector events)
      if (templates.corporate && templates.corporate.length > 0) {
        if (posts.length < maxPosts) {
          const sectorAssets = Object.values(state.assetCatalog).filter(
            a => event.vars?.sector ? a.sector === event.vars.sector : (a.class === 'STOCK' || a.class === 'FII')
          );
          const corp = sectorAssets.length > 0
            ? sectorAssets[dr.dayIndex % sectorAssets.length]
            : null;

          if (corp) {
            // Resolve display name: prefer displayName, then i18n nameKey, then ticker
            const corpName = corp.displayName
              || (t ? t(corp.nameKey) : null)
              || corp.id;
            // Only use resolved name if it's not the raw key
            const resolvedName = corpName !== corp.nameKey ? corpName : corp.id;
            posts.push({
              id: `sp-${dr.dayIndex}-${event.type}-corp-${postId++}`,
              accountType: 'corporate',
              handle: corp.id,
              displayName: resolvedName,
              avatarEmoji: '🏢',
              verified: true,
              text: pickTemplate(templates.corporate, dr.dayIndex, postId),
              dayIndex: dr.dayIndex,
              sentiment: 'neutral',
              engagement: computeEngagement(event.magnitude * 0.4, dr.dayIndex, 99),
              relatedEvent: event.type,
            });
          }
        }
      }
    }
  }

  return posts;
}