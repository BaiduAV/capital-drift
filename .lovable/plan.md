

# UI Macroeconômica Imersiva — Plano de Implementação

## Escopo

7 tarefas que adicionam camada imersiva ao Dashboard sem alterar a engine. Tudo consome dados já existentes em `GameState` (macro, regime, events, history, portfolio).

## Dados disponíveis na engine (sem mudanças)

- `state.macro.baseRateAnnual` / `state.macro.inflationAnnual` — SELIC e IPCA
- `state.regime` — regime atual
- `state.history.equity[]` / `state.history.cdiAccumulated[]` / `state.history.drawdown[]`
- `dayResults[]` — array de DayResult com events, regime changes
- `state.portfolio` / `state.assets` / `state.cash` — posições

**Dados não existentes que precisam ser derivados (sem mudar engine):**
- USD/BRL: derivar de regime (simulado, não existe na engine). Alternativa: omitir ou criar valor cosmético baseado em regime.
- Risk Index: calcular no frontend a partir de regime + drawdown + volatility.
- Patrimônio real (ajustado inflação): calcular no frontend acumulando inflação diária do histórico.
- Narrativa: if/else puro no frontend.

## Arquivos a criar

| Arquivo | Tarefa |
|---|---|
| `src/components/game/MacroPanel.tsx` | T1 — Painel macro no topo |
| `src/components/game/NewsFeed.tsx` | T2 — Eventos como manchetes |
| `src/components/game/PortfolioHealth.tsx` | T4 — Score de saúde |
| `src/components/game/QuickActions.tsx` | T6 — Botões de estratégia |
| `src/utils/generateNarrative.ts` | T5 — Gerador de narrativa |

## Arquivos a editar

| Arquivo | Mudança |
|---|---|
| `src/pages/Dashboard.tsx` | T7 — Novo layout integrando MacroPanel, Narrative, NewsFeed, PortfolioHealth, QuickActions + T3 gráfico melhorado |
| `src/context/GameContext.tsx` | Expor `previousDayMacro` para comparação de setas ↑↓ no MacroPanel |
| `src/index.css` | Adicionar classes de animação fade-in para NewsFeed |

## Implementação por tarefa

### T1 — MacroPanel.tsx
- Grid responsivo: 6 colunas desktop, 3 mobile
- Itens: SELIC, CDI (= SELIC/252 diário), IPCA, Regime, Drawdown atual, vs CDI
- Cada item: valor + seta comparando `state.macro` atual vs valor do dia anterior (armazenar `prevMacro` no GameContext ao avançar dia)
- Regime badge com cores já definidas no CSS (`.regime-CALM`, `.regime-BULL`, etc.)
- Omitir USD/BRL (não existe na engine). Substituir por "Risk Index" = f(regime, drawdown, vol) calculado inline

### T2 — NewsFeed.tsx
- Input: `dayResults` (últimos 10)
- Mapear `EventCard.type` para ícone + headline amigável + cor
- Mapeamento hardcoded: `RATE_HIKE → 📈 "BC sobe juros"`, etc.
- Card list vertical, max 8 items, com `animate-fadeIn` CSS
- Mostrar dia do evento + regime badge

### T3 — Gráfico patrimônio melhorado (dentro do Dashboard)
- Adicionar linha "Patrimônio Real" = equity[i] / (inflação acumulada desde dia 0)
- Calcular inflação acumulada: produto de (1 + inflDiária) — derivar de `state.macro.inflationAnnual / 252` por dia. Problema: não temos histórico de inflação diária. Alternativa pragmática: usar inflação atual para ajustar todo o histórico (simplificação aceitável para MVP).
- Colorir área do gráfico: verde acima do pico, vermelho abaixo
- Label "Drawdown atual: -X%"
- Usar recharts ComposedChart existente, adicionar mais uma Line

### T4 — PortfolioHealth.tsx
- Liquidez: `state.cash / (equity / 6)` → meses de reserva
- Diversificação: contar classes distintas, Herfindahl index
- Drawdown: penalizar drawdown > 10%
- Score 0-100 com barra colorida (Progress component)
- Labels: 70+ Saudável, 40-69 Moderado, <40 Arriscado

### T5 — generateNarrative.ts
- If/else baseado em: regime, último evento, drawdown, inflação, SELIC
- Retorna string PT-BR ou EN dependendo do locale passado
- ~15 templates cobrindo combinações principais
- Ex: regime=CRISIS + drawdown>10% → "A crise aprofunda as perdas. Considere ativos defensivos."

### T6 — QuickActions.tsx
- 3 botões: Defensivo / Balanceado / Agressivo
- Cada botão executa trades automáticos:
  - Defensivo: vende stocks/crypto, compra RF_POS
  - Balanceado: distribui igualmente entre classes
  - Agressivo: vende RF, compra stocks/crypto
- Usa `buy`/`sell` do GameContext
- Confirma antes de executar
- Mostra resumo após execução

### T7 — Layout do Dashboard
Reestruturar o Dashboard:
```text
┌──────────────────────────────────┐
│         MacroPanel (6 cols)       │
├──────────────────────────────────┤
│     Narrative (1-2 frases)       │
├────────────────────┬─────────────┤
│  Equity Chart      │  NewsFeed   │
│  (nominal + real)  │  (últimos)  │
│  + drawdown label  │             │
├────────────────────┴─────────────┤
│  Action Bar (play/FF buttons)    │
├──────────────┬───────────────────┤
│ PortfolioHealth │  QuickActions  │
├──────────────┴───────────────────┤
│  Day/Period Result (existing)    │
│  Recent History ticker           │
└──────────────────────────────────┘
```
Mobile: tudo em coluna única, NewsFeed abaixo do gráfico.

### GameContext changes
- Adicionar `prevMacro: MacroState | null` ao state tracking
- No `advanceDay`, salvar macro antes de simular: `setPrevMacro({...state.macro})`
- Expor `prevMacro` no context para MacroPanel comparar valores

