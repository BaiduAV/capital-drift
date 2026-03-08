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
      '🚀 Setor em alta: ações do segmento disparam na sessão de hoje.',
      '🚀 Rally setorial: analistas apontam fundamentos sólidos para a alta.',
      '🚀 Boom no setor! Empresas registram máximas históricas.',
    ],
    reactions: {
      thiagofinancas: [
        'Olha esse setor voando! 🚀 Quem montou posição meses atrás tá sorrindo agora. Paciência paga!',
        'Rally forte! Mas cuidado pra não entrar no topo. Quem tá dentro, segura. Quem tá fora, estuda antes.',
      ],
      luizbarsi: [
        'Setores cíclicos têm dessas altas. O importante é estar posicionado antes, não durante a euforia.',
        'Alta expressiva. Mas lembrem: o que sobe rápido, pode cair rápido. Foquem em fundamentos.',
      ],
    },
    sentiment: 'bullish',
  },
  SECTOR_BUST: {
    media: [
      '📉 Setor em queda: ações recuam forte com deterioração do cenário.',
      '📉 Pressão vendedora atinge setor. Investidores buscam proteção.',
      '📉 Queda setorial acentuada: analistas recomendam cautela.',
    ],
    reactions: {
      thiagofinancas: [
        'Caiu? OPORTUNIDADE! As melhores empresas sobrevivem às crises e saem mais fortes. 💎',
        'Todo mundo com medo? É quando eu começo a ficar de olho. Medo dos outros = desconto pra gente.',
      ],
      luizbarsi: [
        'Quedas assim são normais no mercado. Quem tem bons ativos e paciência, não precisa se preocupar.',
        'Boas empresas baratas. É nessas horas que se constrói patrimônio de verdade.',
      ],
    },
    sentiment: 'bearish',
  },
  SECTOR_CRASH: {
    media: [
      '💥 CRASH: Setor desaba em pregão histórico. Circuit breaker acionado.',
      '💥 ALERTA: Queda abrupta em setor provoca pânico no mercado.',
      '💥 Crash setorial: bilhões em valor de mercado evaporam em horas.',
    ],
    reactions: {
      thiagofinancas: [
        '😱 Dia difícil. Mas lembrem: quem vendeu na crise de 2008 se arrependeu. HOLD! 💪',
      ],
      luizbarsi: [
        'Crashes acontecem. Eles separam quem investe de quem especula. Mantenham a calma e a estratégia.',
      ],
      analistamacro: [
        'Crash com volume recorde. Possível contágio para outros setores. Atenção redobrada.',
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

// ── Helpers ──

function pickTemplate(templates: string[], dayIndex: number, salt: number): string {
  return templates[(dayIndex + salt) % templates.length];
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
): SocialPost[] {
  const posts: SocialPost[] = [];
  let postId = 0;

  for (let i = dayResults.length - 1; i >= 0 && posts.length < maxPosts; i--) {
    const dr = dayResults[i];
    for (const event of dr.events) {
      if (posts.length >= maxPosts) break;

      const templates = TEMPLATES_PT[event.type];
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
      // Pick 1-2 influencers
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
          // Try to find a relevant company
          const sectorAssets = Object.values(state.assetCatalog).filter(
            a => event.vars?.sector ? a.sector === event.vars.sector : (a.class === 'STOCK' || a.class === 'FII')
          );
          const corp = sectorAssets.length > 0
            ? sectorAssets[dr.dayIndex % sectorAssets.length]
            : null;

          if (corp) {
            posts.push({
              id: `sp-${dr.dayIndex}-${event.type}-corp-${postId++}`,
              accountType: 'corporate',
              handle: corp.id,
              displayName: corp.displayName ?? corp.id,
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
