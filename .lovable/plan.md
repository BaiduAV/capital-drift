

## Conquistas / Achievements Desbloqueáveis

### Arquitetura

Sistema de achievements avaliado após cada `advanceDay`/`fastForward`, com estado persistido no `GameState` e UI acessível via nova página `/achievements` + notificação toast ao desbloquear.

### Achievements (12 iniciais)

| ID | Nome PT | Condição |
|---|---|---|
| `first_trade` | Primeira Negociação | Executar qualquer compra ou venda |
| `first_dividend` | Primeiro Dividendo | Receber qualquer dividendo |
| `survived_crisis` | Sobreviveu à Crise | Passar por regime CRISIS sem falir |
| `beat_cdi_30` | Superou o CDI por 30 dias | equity > cdiAccumulated por 30 dias consecutivos |
| `ipo_participant` | Participou de um IPO | Reservar cotas em bookbuilding que foram listadas |
| `diversified` | Carteira Diversificada | Ter posição em 5+ classes de ativo diferentes |
| `diamond_hands` | Mãos de Diamante | Manter posição por 60+ dias durante drawdown > 10% |
| `ten_bagger` | 10x Bagger | Ter um ativo com retorno >= 900% sobre avgPrice |
| `day_100` | Centenário | Atingir dia 100 |
| `millionaire` | Milionário | Patrimônio >= R$ 1.000.000 |
| `crypto_survivor` | Sobreviveu ao Hack | Ter crypto durante evento CRYPTO_HACK |
| `bankruptcy_dodge` | Escapou da Falência | Ter ativo que faliu mas já ter vendido antes |

### Arquivos a criar/modificar

**1. `src/engine/achievements.ts`** (novo)
- Define `AchievementId` type e `ACHIEVEMENT_DEFS` com id, condição checker, i18n keys
- Função `checkAchievements(state, dayResult, prevState): AchievementId[]` — retorna IDs recém-desbloqueados
- Lógica pura, sem side effects

**2. `src/engine/types.ts`**
- Adicionar `achievements: Record<string, { unlockedAtDay: number }>` ao `GameState`

**3. `src/engine/init.ts`**
- Inicializar `achievements: {}`

**4. `src/engine/i18n.ts`**
- Adicionar traduções PT/EN para cada achievement (título + descrição)

**5. `src/context/GameContext.tsx`**
- Após `simulateDay`, chamar `checkAchievements` e mostrar toast para cada novo achievement
- Marcar achievements de trade (`first_trade`) dentro de `buy`/`sell`
- Marcar `ipo_participant` dentro de `reserveIPO` + listagem

**6. `src/pages/Achievements.tsx`** (novo)
- Grid de cards com ícone, título, descrição
- Desbloqueados: coloridos com dia de desbloqueio
- Bloqueados: cinza com "???" na descrição (ou dica sutil)
- Barra de progresso geral (X/12)

**7. `src/App.tsx`**
- Adicionar rota `/achievements`

**8. `src/components/game/AppLayout.tsx`**
- Adicionar item de nav com ícone Trophy

