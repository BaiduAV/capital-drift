

## Reconstrução do NewsFeed — Estilo "Twitter/X-like"

### Conceito

Substituir o feed linear de notícias por um timeline social com 3 tipos de "contas" que postam:

1. **Canais de mídia** (verificados, ícone de organização) — reportam eventos factuais
2. **Influencers/comentaristas** — reagem aos eventos com opinião e tom pessoal
3. **Contas corporativas** — empresas do catálogo informando resultados/IPOs

Cada post tem: avatar, nome, handle (@), badge verificado, texto do post, timestamp (D{n}), e opcionalmente métricas fake (likes/retweets).

### Dados: Personagens Mock

**Canais de mídia** (mapeados por tipo de evento):
| Handle | Nome | Cobertura |
|---|---|---|
| @InfoMoneyBR | InfoMoney | Macro, juros, inflação |
| @BloombergBR | Bloomberg Línea | FX, commodities, macro |
| @ValorInveste | Valor Econômico | Ações, setores, IPOs |
| @CoinDeskBR | CoinDesk Brasil | Crypto |
| @ExameBiz | Exame Invest | Geral, fiscal |

**Influencers/comentaristas** (reagem com opinião):
| Handle | Nome | Especialidade | Tom |
|---|---|---|---|
| @thiagofinancas | Thiago Nigro | Renda variável | Otimista/educativo |
| @naborges | Nathalia Arcuri | RF, diversificação | Cauteloso/didático |
| @felipecripto | Felipe Crypto | Crypto | Hype/ousado |
| @luizbarsi | Luiz Barsi Jr. | Dividendos/value | Conservador/value |
| @analistamacro | Ana Macro | Macro/juros | Técnico/analítico |

**Contas corporativas**: Derivadas dinamicamente do `assetCatalog` — quando um evento afeta um setor, a empresa mais relevante "posta".

### Arquitetura de Geração de Posts

Para cada `EventCard` no `dayResults`, gerar 2-3 posts:
1. **Post primário**: canal de mídia relevante reporta o fato (substitui o título/desc atual)
2. **Post de reação**: influencer relevante comenta com opinião (templates por tipo de evento + tom do personagem)
3. **Post corporativo** (opcional): se o evento envolve setor específico ou IPO, a empresa posta

Os templates serão definidos em `src/engine/socialFeed.ts` — um mapeamento `EventType → { mediaPost, reactions[] }` com variações randomizadas via `dayIndex % N` para variedade.

### Arquivos

**Criar:**
- `src/engine/socialFeed.ts` — Definições de personagens (canais, influencers) + função `generateSocialPosts(events, state, locale)` que transforma `EventCard[]` em `SocialPost[]`
- `src/components/game/SocialFeed.tsx` — Componente visual Twitter-like substituindo o NewsFeed

**Modificar:**
- `src/pages/Dashboard.tsx` — Trocar `<NewsFeed />` por `<SocialFeed />`
- `src/index.css` — Estilos do feed social (verified badge, timeline line)

### Estrutura do SocialPost

```typescript
interface SocialPost {
  id: string;
  accountType: 'media' | 'influencer' | 'corporate';
  handle: string;
  displayName: string;
  avatarEmoji: string;      // emoji como avatar (📰, 🧑‍💼, 🏢)
  verified: boolean;
  text: string;             // corpo do post, já traduzido
  dayIndex: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  engagement: { likes: number; reposts: number };  // números fake baseados em magnitude
  relatedEvent: EventType;
}
```

### UI do SocialFeed.tsx

- Timeline vertical com linha conectora à esquerda (como Twitter)
- Cada post: avatar (emoji em circle) → nome + handle + verified badge → texto → barra de engajamento (❤️ 🔄 números)
- Posts de influencer têm borda lateral colorida (verde/vermelho por sentiment)
- Posts corporativos têm badge "🏢" e tom institucional
- Animação `animate-news-slide-in` existente reutilizada
- Max 15 posts visíveis, scroll

### Templates de Posts (exemplos)

**RATE_HIKE:**
- @InfoMoneyBR: "🔴 URGENTE: Banco Central eleva Selic em {delta}pp. Nova taxa: {rate}%"
- @analistamacro: "Decisão era esperada. Com inflação em {ipca}%, não havia alternativa. Renda fixa segue atrativa."
- @thiagofinancas: "Calma, galera! Juros altos = oportunidade pra quem pensa no longo prazo. Ações de qualidade ficam baratas. 📉➡️📈"

**CRYPTO_HACK:**
- @CoinDeskBR: "⚠️ BREAKING: Exchange sofre ataque hacker. Criptomoedas em forte queda."
- @felipecripto: "Mais um hack... por isso eu sempre digo: NOT YOUR KEYS, NOT YOUR COINS. Quem segura na cold wallet tá safe. 💎🙌"

**IPO_LISTED:**
- @ValorInveste: "🔔 {company} ({ticker}) estreia na B3 com valorização de {pop}% no primeiro dia"
- Conta @{ticker}: "Hoje marcamos o início de uma nova fase. Obrigado pela confiança dos investidores. #IPO #{ticker}"

### Engagement Fake

`likes = Math.floor(magnitude * 5000 + dayIndex * 3)`, `reposts = Math.floor(likes * 0.3)` — apenas para ambientação.

