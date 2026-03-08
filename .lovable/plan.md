

## Rebalanceamento de Carteira + Recomendações Inteligentes

### O que será construído

1. **Painel de Rebalanceamento** — Um novo componente que mostra a alocação atual vs. a alocação-alvo de uma estratégia, com botão de "Rebalancear" que executa as trades necessárias automaticamente.

2. **Recomendações Contextuais** — Substituir os tips genéricos do `healthScore` por recomendações acionáveis baseadas no estado atual do mercado (regime, macro, setor em alta/baixa) e na composição real do portfólio.

### Arquivos

**Criar:**
- `src/engine/recommendations.ts` — Motor de recomendações que analisa o estado do jogo e gera sugestões contextuais
- `src/components/game/RebalancePanel.tsx` — UI do painel de rebalanceamento com visualização de alocação atual vs. alvo

**Modificar:**
- `src/components/game/QuickActions.tsx` — Integrar o RebalancePanel como expansão dos quick actions
- `src/pages/Dashboard.tsx` — Adicionar o RebalancePanel ao layout do dashboard

### Motor de Recomendações (`recommendations.ts`)

Função `generateRecommendations(state, equity, locale)` que retorna uma lista de recomendações priorizadas:

- **Baseadas no regime**: Em CRISIS → "Reduza exposição a renda variável"; em BULL → "Considere aumentar posição em ações"
- **Baseadas no macro**: Selic subindo → "Renda fixa pós-fixada se beneficia"; Inflação alta → "IPCA+ protege contra inflação"
- **Baseadas no portfólio**: Crypto > 30% → "Alta concentração em crypto, considere diversificar"; Sem RF → "Adicione renda fixa como âncora"
- **Baseadas em eventos recentes**: Setor em crash → "Oportunidade de compra em {setor}?"; IPO disponível → "Avalie o IPO de {empresa}"
- **Baseadas no drawdown**: DD > 10% → "Stop-loss: considere reduzir posições perdedoras"

Cada recomendação terá: `icon`, `text` (pt/en), `priority` (1-5), `actionType` ('buy'|'sell'|'rebalance'|'info'), e opcionalmente `targetAssets[]`.

### Painel de Rebalanceamento (`RebalancePanel.tsx`)

Três perfis-alvo pré-definidos com alocações percentuais:

| Perfil | RF | Ações/ETF | FII | Crypto | Caixa |
|---|---|---|---|---|---|
| Conservador | 60% | 15% | 10% | 5% | 10% |
| Moderado | 30% | 30% | 15% | 10% | 15% |
| Agressivo | 10% | 35% | 10% | 35% | 10% |

**UI:**
- Selector de perfil (3 botões como os QuickActions atuais)
- Barras horizontais mostrando "Atual" vs "Alvo" por classe de ativo, com cor verde/vermelho indicando se precisa comprar/vender
- Preview das trades necessárias (lista de compras/vendas)
- Botão "Rebalancear" com confirmação de duplo clique (padrão existente)
- As recomendações contextuais aparecem abaixo como cards com ícones

### Integração

O `QuickActions` será expandido para incluir um botão "Rebalancear" que abre o `RebalancePanel` inline. As recomendações contextuais substituem os tips genéricos no `PortfolioHealth` e também aparecem no `RebalancePanel`.

A lógica de execução do rebalanceamento usará `batchTrades` do contexto (já existente) — vende posições acima do alvo, depois compra as abaixo do alvo, escolhendo ativos representativos de cada classe (ETF para ações, TSELIC para RF pós, etc.).

