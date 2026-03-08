

## Análise do Cálculo Atual

O score de **Saúde do Portfólio** (0–100) é composto por 3 sub-scores:

| Componente | Peso Máx | Como Calcula | Problemas |
|---|---|---|---|
| **Liquidez** | 40 pts | `cash / (equity/6)` — meses de "burn" | Fórmula estranha: divide equity por 6 como "burn mensal", o que não faz sentido financeiro. Penaliza quem está investido. |
| **Diversificação** | 30 pts | `(1 - HHI) * 40`, cap 30 | HHI é bom, mas ignora diversificação entre *classes* de ativos (só conta posições individuais). |
| **Drawdown** | 30 pts | Faixas fixas: <5%=30, <10%=20, <20%=10, else 0 | Razoável, mas usa drawdown desde o início do jogo (nunca "reseta"), penalizando permanentemente. |

**Problemas principais:**
1. **Liquidez mal definida** — "monthly burn = equity/6" é arbitrário e sem significado financeiro real.
2. **Sem diversificação por classe** — ter 10 ações diferentes dá score alto, mas é tudo renda variável.
3. **Sem componente de performance** — o score ignora se o jogador está ganhando ou perdendo dinheiro.
4. **Sem feedback educativo** — o usuário vê um número mas não sabe *o que melhorar*.
5. **UI minimalista demais** — só mostra score e barra, sem breakdown.

---

## Plano de Melhoria

### 1. Reformular o cálculo (engine + componente)

Novo score com **5 componentes** (total = 100):

| Componente | Peso | Lógica |
|---|---|---|
| **Reserva de Caixa** (20 pts) | 20 | % do patrimônio em caixa: ideal 10-30%. Abaixo de 5% = 0, acima de 30% perde pontos (dinheiro parado). |
| **Diversificação por Ativo** (20 pts) | 20 | `(1 - HHI)` normalizado. Mantém a lógica atual mas com peso ajustado. |
| **Diversificação por Classe** (20 pts) | 20 | Conta quantas classes distintas estão representadas (RF, Ações, FII, Crypto). Ideal >= 3 classes, nenhuma > 50%. |
| **Drawdown** (20 pts) | 20 | Drawdown dos últimos 30 dias (rolling), não desde o início. Faixas mais granulares. |
| **Performance vs CDI** (20 pts) | 20 | Retorno acumulado vs CDI. Batendo CDI = 20 pts. Perdendo < 5% = 10 pts. Perdendo mais = 0. |

### 2. Extrair lógica para `src/engine/healthScore.ts`

Mover o cálculo para o engine como função pura testável, retornando o score total **e o breakdown** de cada componente.

```text
healthScore(state, equity, cdiAccumulated) → {
  total: number,
  breakdown: { cash: number, assetDiv: number, classDiv: number, drawdown: number, performance: number },
  tips: string[]   // dicas educativas localizadas
}
```

### 3. Gerar dicas educativas automáticas

Baseado nos sub-scores mais baixos, gerar 1-3 dicas contextuais:
- "Aumente sua reserva de caixa para pelo menos 10%"
- "Diversifique entre classes: você só tem ações"
- "Seu drawdown recente está alto, considere reduzir risco"

### 4. Melhorar a UI do componente

- Mostrar o **breakdown visual** com mini-barras por componente (5 barrinhas empilhadas ou em grid).
- Exibir as **dicas** como texto abaixo do score.
- Tooltip em cada componente explicando o que significa.
- Manter o design compacto atual mas expansível (collapsible details).

### Arquivos a modificar:
- **Criar** `src/engine/healthScore.ts` — lógica pura do novo cálculo
- **Editar** `src/components/game/PortfolioHealth.tsx` — nova UI com breakdown e dicas
- **Editar** `src/engine/types.ts` — tipo `HealthScoreResult` (se necessário)

