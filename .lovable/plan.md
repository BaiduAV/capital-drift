

## Aprimoramento da UI de Negociação

### Problemas Atuais

1. **Lista de ativos sem filtros por classe** -- o jogador precisa rolar por 30+ ativos sem poder filtrar por STOCK, FII, ETF, RF, CRYPTO
2. **Sem mini-gráfico na lista** -- não há contexto visual de tendência ao escolher um ativo
3. **Sem indicador de P&L na posição** -- a lista mostra "pos: 10" mas não o lucro/prejuízo da posição
4. **Asset info no ticket é estática** -- não mostra gráfico de preços do ativo selecionado
5. **Sem confirmação antes de executar** -- ordens grandes são executadas com um clique, sem resumo final
6. **Layout mobile subótimo** -- o order ticket fica escondido abaixo da lista longa de ativos; deveria ser acessível rapidamente
7. **IPO bookbuilding pouco destacado** -- seção visualmente igual ao resto, sem countdown ou barra de demanda
8. **Sem feedback visual pós-trade** -- apenas um toast, sem animação ou destaque no ativo negociado

### Plano de Implementação

#### A. Tabs de filtro por classe de ativo
Adicionar tabs horizontais (ALL | Ações | FIIs | ETFs | RF | Crypto) acima da lista de ativos. Filtra `sortedAssets` por `def.class`. Usa `Tabs` do Radix já instalado.

#### B. Sparkline na lista de ativos
Adicionar um mini SVG sparkline (30px de altura, ~60px de largura) usando os últimos 20 pontos de `priceHistory` ao lado do preço. Cor verde/vermelha baseada na tendência. Componente `Sparkline` inline, sem dependência extra.

#### C. P&L inline na lista
Quando o jogador tem posição, mostrar o P&L absoluto e percentual em vez de apenas "pos: N". Colorido com `price-up`/`price-down`.

#### D. Mini-chart no Order Ticket
Quando um ativo é selecionado, exibir um `AreaChart` compacto (recharts, já instalado) de 80px de altura no cabeçalho do ticket, reutilizando lógica do `AssetDetailModal`.

#### E. Dialog de confirmação para ordens
Antes de executar, mostrar um `AlertDialog` resumindo: ativo, lado, quantidade, custo total, caixa após. Botão de confirmar com cor contextual (verde compra, vermelho venda).

#### F. Bottom sheet no mobile para Order Ticket
Em telas `< lg`, o order ticket vira um bottom sheet fixo (usando `vaul` Drawer, já instalado) que aparece ao selecionar um ativo. Botão flutuante "Ordem" quando nenhum ativo está selecionado.

#### G. IPO bookbuilding aprimorado
- Barra de progresso visual para `demand` (0-100%)
- Countdown "Lista em X dias" com badge colorido
- Chip de setor colorido

#### H. Animação pós-trade
Flash verde/vermelho no ativo negociado na lista (via CSS class temporária) + confetti sutil para trades grandes.

### Arquivos a modificar:
- **`src/pages/Trade.tsx`** — tabs de filtro, sparkline, P&L inline, mini-chart, confirmação, mobile drawer, IPO melhorado, animação pós-trade
- **`src/index.css`** — keyframe para flash de trade executado
- **`src/components/ui/Sparkline.tsx`** — novo componente SVG sparkline reutilizável

