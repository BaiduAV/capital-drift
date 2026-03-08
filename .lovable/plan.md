

## Pipeline de 3 Fases para IPOs

### Arquitetura

```text
D-5: ANNOUNCED ──► D-2: BOOKBUILDING ──► D0: LISTED
     (notícia)       (reserva cotas)       (IPO pop + vol extra)
```

### 1. Novos tipos em `src/engine/types.ts`

- Adicionar `'IPO'` ao `EventType`.
- Criar `IPOPipelineEntry`:
```typescript
interface IPOPipelineEntry {
  ticker: string;
  displayName: string;
  sector: Sector;
  assetClass: 'STOCK' | 'FII';
  offerPrice: number;
  announcedDay: number;
  listingDay: number;         // announcedDay + 5
  status: 'announced' | 'bookbuilding' | 'listed';
  demand: number;             // 0–1, calculado no bookbuilding
  playerReservation: number;  // qtd reservada pelo jogador
  catalogEntry: AssetDefinition; // pré-computado no anúncio
}
```
- Adicionar `ipoPipeline: IPOPipelineEntry[]` ao `GameState`.
- Adicionar `ipoVolatilityUntilDay?: number` ao `AssetState` (para aplicar vol extra pós-listagem).

### 2. Constantes em `src/engine/params.ts`

```typescript
export const IPO = {
  leadDays: 5,              // dias entre anúncio e listagem
  bookbuildingStart: 3,     // D-3 inicia bookbuilding (announcedDay + 2)
  volatilityMultiplier: 1.5,
  volatilityDays: 5,        // dias pós-listagem com vol extra
  popRange: { low: -0.05, high: 0.20 }, // range do IPO pop baseado em demand
};
```

### 3. Refatorar IPO em `src/engine/simulateDay.ts`

Substituir o bloco atual (linhas 96–157) por lógica de 3 fases:

**Fase 1 — Anúncio**: Quando `ipoHeat > 0.6` e probabilidade atinge, criar `IPOPipelineEntry` com `status: 'announced'`, `listingDay = dayIndex + 5`, `offerPrice` baseado na média do setor. Gerar evento `IPO` com título "IPO Anunciado: {company}".

**Fase 2 — Bookbuilding**: Iterar no pipeline; quando `dayIndex >= announcedDay + 2` e `status === 'announced'`, mudar para `'bookbuilding'`. Calcular `demand` baseado em regime (BULL/EUPHORIA = alta), `ipoHeat`, e `riskIndex`. Gerar evento informativo.

**Fase 3 — Listagem**: Quando `dayIndex >= listingDay` e `status === 'bookbuilding'`:
- Adicionar ativo ao `assetCatalog` e `assets` com `ipoVolatilityUntilDay = dayIndex + 5`.
- Calcular `popFactor = lerp(IPO.popRange.low, IPO.popRange.high, demand)`.
- Preço de abertura = `offerPrice * (1 + popFactor)`.
- Creditar cotas reservadas pelo jogador ao preço de oferta (deduzir cash).
- Marcar `status: 'listed'` e remover do pipeline.
- Gerar evento "IPO Listado: {company} — pop de X%".

### 4. Volatilidade extra em `src/engine/pricing.ts`

Em `generateReturns`, após calcular `vol`, checar:
```typescript
if (asset.ipoVolatilityUntilDay && state.dayIndex < asset.ipoVolatilityUntilDay) {
  vol *= IPO.volatilityMultiplier;
}
```

### 5. Reserva de IPO no `GameContext` e `Trade.tsx`

- Adicionar `reserveIPO(ticker: string, qty: number)` ao `GameContext` que modifica `ipoPipeline[i].playerReservation`.
- No `Trade.tsx`, mostrar seção "IPOs em Bookbuilding" acima do catálogo com botão de reserva e info do preço de oferta.

### 6. UI no NewsFeed

- Adicionar meta para `'IPO'` no `eventMeta`: `{ icon: '🏦', colorClass: 'text-terminal-amber' }`.
- Traduções: `event.ipo.announced.title`, `event.ipo.bookbuilding.title`, `event.ipo.listed.title` com variáveis `{company}`, `{ticker}`, `{pop}`.

### 7. Inicialização

- Em `init.ts`, inicializar `ipoPipeline: []` no `GameState`.

### Arquivos a modificar:
- **`src/engine/types.ts`** — IPOPipelineEntry, ipoVolatilityUntilDay, EventType 'IPO'
- **`src/engine/params.ts`** — constantes IPO
- **`src/engine/simulateDay.ts`** — substituir bloco IPO por pipeline 3 fases
- **`src/engine/pricing.ts`** — aplicar vol multiplier pós-IPO
- **`src/engine/init.ts`** — inicializar ipoPipeline
- **`src/engine/i18n.ts`** — traduções IPO announced/bookbuilding/listed
- **`src/context/GameContext.tsx`** — reserveIPO action
- **`src/pages/Trade.tsx`** — seção IPOs em bookbuilding com reserva
- **`src/components/game/NewsFeed.tsx`** — meta para tipo IPO

