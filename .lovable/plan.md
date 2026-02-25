

# Patrimônio — Análise de Status e Caminho para o MVP

## O que já está implementado

### Engine (Phase 1) — Completo
| Componente | Status | Observações |
|---|---|---|
| Types & Data Structures | Done | 32 assets, all core types |
| Seeded RNG (mulberry32) | Done | Deterministic, tested |
| Parameters (params.ts) | Done | All drift/vol/regime/cost tables |
| Asset Catalog | Done | 8 RF, 12 stocks, 4 ETFs, 4 FIIs, 4 crypto |
| Regime Transitions | Done | 5 regimes with transition matrix |
| Macro Updates | Done | SELIC + IPCA random walk |
| Pricing & Correlation | Done | Factor model with crisis cross-link |
| Events System | Done | 10 event types, weighted by regime |
| Credit Watch & Default | Done | Watch window + default mechanics |
| Dividends | Done | FII monthly, stocks quarterly |
| simulateDay | Done | Full orchestration |
| simulatePeriod | Done | Fast-forward with summary |
| Trading (buy/sell) | Done | Fees, spreads, halts |
| Invariants | Done | Price/cash/equity checks |
| i18n | Done | PT-BR + EN, translation keys |
| Persistence | Done | localStorage save/load |
| Unit Tests | Done | 15 core tests |

### UI (Phase 2) — Funcional mas básico
| Tela | Status | Observações |
|---|---|---|
| AppLayout + Sidebar | Done | Collapsible, mobile hamburger |
| Dashboard | Done | Day/FF controls, stats, results |
| Market | Done | Tabbed by class, prices, change |
| Portfolio | Done | Positions, P&L, weight |
| Trade | Done | Buy/sell with quote preview |
| History | Done | Recharts equity/drawdown + event log |

---

## O que falta para um MVP jogável

### 1. Problemas de UX que impedem uso real

**a) Sem onboarding / tela inicial**
Não existe tela de boas-vindas ou tutorial. O jogador cai direto no Dashboard sem entender o que fazer. Para MVP, precisa de pelo menos uma tela inicial com "Novo Jogo" / "Continuar" e uma explicação mínima.

**b) Sem feedback de dividendos recebidos**
Dividendos caem silenciosamente no caixa. O jogador nunca sabe quando recebeu dividendos ou quanto. Precisa de notificação/toast ou entry no event log.

**c) Sem indicador de regime change**
Quando o regime muda (ex: Calm → Crisis), não há destaque visual. É a mecânica central do jogo e passa despercebida.

**d) Trade page não linka ao Market**
Não dá para clicar num ativo no Market e ir direto para comprá-lo. Fluxo quebrado.

**e) Sem "game over" ou objetivo**
Não há condição de vitória, meta, ou sequer um benchmark para o jogador comparar. O GDD menciona que o objetivo é superar o CDI acumulado.

### 2. Funcionalidades do GDD ainda não implementadas

**a) Benchmark CDI acumulado**
O GDD define que o jogador deve "superar o CDI". Não existe tracking do CDI acumulado para comparação. É essencial como meta do jogo.

**b) Notificações/toasts para eventos importantes**
Eventos de mercado, dividendos recebidos, credit watch, e mudanças de regime devem gerar notificações visíveis.

**c) Detalhamento de asset no Market**
Clicar num ativo deveria mostrar: mini-chart de preço, histórico de dividendos, setor, correlações. Hoje só tem a tabela.

**d) Relatório de período após fast-forward**
O relatório existe mas é efêmero (some ao navegar). Deveria ser persistido ou ter uma seção dedicada.

---

## Plano: Incrementos para MVP

Quatro blocos de trabalho incrementais, em ordem de prioridade:

### Bloco 1 — Game Loop Completo
Tornar o jogo jogável com objetivo claro.

1. **CDI Benchmark tracking**: Acumular CDI diário no GameState (baseRate/252 por dia). Mostrar no Dashboard e History como linha de referência.
2. **Regime change notification**: Toast + destaque visual quando o regime muda.
3. **Dividend notifications**: Toast quando dividendos são creditados, com valor recebido.
4. **Credit watch alerts**: Toast quando debênture entra em watch ou dá default.

### Bloco 2 — Fluxo de Navegação
Conectar as telas para um fluxo natural.

1. **Market → Trade link**: Botão "Comprar" em cada ativo no Market que navega para Trade com o ativo pré-selecionado.
2. **Dashboard quick-buy**: Botões rápidos nos top movers.
3. **Welcome/start screen**: Tela inicial com "Novo Jogo" (com seed opcional), "Continuar", e mini-tutorial (3 frases explicando o objetivo).

### Bloco 3 — Visualização
Dar profundidade à análise.

1. **Asset detail modal/page**: Clicar num ativo abre modal com mini-chart de preço (últimos 30 dias de lastReturn acumulado), setor, dividendo yield, e posição atual.
2. **CDI line no equity chart**: Adicionar linha do CDI acumulado no gráfico de History.
3. **Portfolio allocation pie chart**: Gráfico de alocação por classe no Portfolio.

### Bloco 4 — Polish
1. **Keyboard shortcuts**: N=next day, F=fast-forward 7d, B/S=buy/sell.
2. **Sound effects** (opcional): Tick no advance, alert em eventos.
3. **Performance stats**: Sharpe ratio, volatility, win rate.

---

## Detalhe técnico dos blocos

### Bloco 1 — Mudanças necessárias

**GameState** precisa de novo campo:
```text
GameState.history.cdiAccumulated: number[]  // CDI acumulado desde day 0
```

**simulateDay** precisa acumular CDI:
```text
const dailyCDI = state.macro.baseRateAnnual / 252;
const lastCDI = state.history.cdiAccumulated[state.history.cdiAccumulated.length - 1];
state.history.cdiAccumulated.push(lastCDI * (1 + dailyCDI));
```

**GameContext.advanceDay** retorna DayResult que já contém events e regime. Adicionar lógica de toast no contexto ou no Dashboard.

**dividends.ts** precisa retornar o valor pago para que o caller possa notificar.

### Bloco 2 — Mudanças necessárias

**Market page**: Adicionar coluna com botão "Buy" que navega via `useNavigate('/trade?asset=XXX')`.

**Trade page**: Ler `searchParams` para pré-selecionar ativo.

**Welcome screen**: Nova rota `/start` ou modal condicional no Dashboard (if dayIndex === 0 && no save).

### Bloco 3 — Mudanças necessárias

**Asset history**: Precisaria armazenar price history por asset no GameState, ou recalcular dos returns. Para MVP, guardar apenas os últimos 30 preços por ativo seria suficiente. Alternativa mais leve: guardar no AssetState um array `priceHistory: number[]` (cap 90 entries).

---

## Recomendação

Implementar **Bloco 1 + Bloco 2** primeiro. Isso transforma o projeto de "demo técnica" em "jogo jogável com objetivo". Blocos 3 e 4 são refinamento.

Estimativa: Bloco 1 + 2 = ~2 iterações de implementação.

