

# Plano de Melhoria de UX — Capital Drift

## Diagnóstico Atual

A aplicação já possui uma base sólida: design system consistente, layout responsivo, sidebar colapsável, atalhos de teclado, tema dark/light, tooltips, e feedback sonoro. Após análise das 7 páginas e da sessão do usuário (mobile, 384px), identifiquei as seguintes áreas de melhoria:

## Melhorias Propostas

### 1. Onboarding Contextual por Página
Atualmente o tutorial é genérico. Adicionar **dicas contextuais inline** (pequenos tooltips ou banners dismissíveis) na primeira visita a cada página:
- Dashboard: "Pressione N para avançar um dia"
- Market: "Clique em um ativo para ver detalhes"
- Trade: "Use os botões % para definir quantidade rapidamente"
- Armazenar quais dicas já foram vistas em `localStorage`.

### 2. Feedback Visual de Trades (Flash + Toast Melhorado)
- Na lista de ativos do Trade, após executar uma ordem, o ativo já recebe um flash mas ele é sutil. Melhorar com uma **animação de pulse** mais visível e um **confetti micro** no botão de execução para trades de sucesso.
- No toast de confirmação, incluir o **impacto no patrimônio** (ex: "Compra executada! Patrimônio: R$ 5.230").

### 3. Empty States Informativos
Várias telas mostram estados vazios genéricos. Melhorar:
- **Portfolio vazio**: ilustração + CTA "Ir para o Mercado" (já existe parcialmente no Dashboard, mas não no Portfolio).
- **Histórico sem dados**: explicar que é preciso avançar dias.
- **Conquistas**: mostrar progresso para a próxima conquista mais próxima.

### 4. Navegação Mobile Aprimorada
O usuário está em mobile (384px). Melhorias:
- **Bottom navigation bar** fixa com os 4 itens principais (Dashboard, Mercado, Negociar, Carteira) em vez de depender do hamburger menu.
- Manter o sidebar para itens secundários (Histórico, Conquistas, Config).
- Botão flutuante "Avançar Dia" acessível em qualquer página mobile.

### 5. Transições e Micro-animações
- Adicionar **transitions suaves** entre tabs (fade-in já existe, mas sem slide).
- **Skeleton loaders** no chart enquanto dados são calculados (perceptível em FF 30d).
- Animação de **contagem** nos StatCards ao mudar valor (count-up effect).

### 6. Acessibilidade e Legibilidade
- Aumentar contraste dos textos `text-muted-foreground` em tema light (alguns ficam pouco legíveis).
- Adicionar `aria-label` nos botões de ação que só têm ícone (vários botões no Trade).
- Focus ring visível para navegação por teclado nos cards clicáveis.

### 7. Resumo Pós Fast-Forward
Quando o jogador avança 30 dias, o `PeriodResultCard` mostra dados mas some ao próximo clique. Melhorar:
- Manter o resultado visível até ser explicitamente dispensado (botão X).
- Adicionar **mini-narrativa** no resultado do período (reutilizar `generateNarrative`).
- Highlight dos eventos mais impactantes com ícones.

## Arquivos Impactados

| Arquivo | Mudança |
|---|---|
| `src/components/game/BottomNav.tsx` | **Novo** — Bottom navigation para mobile |
| `src/components/game/ContextualTip.tsx` | **Novo** — Componente de dica contextual dismissível |
| `src/components/game/AppLayout.tsx` | Integrar BottomNav no mobile, ajustar padding do main |
| `src/pages/Dashboard.tsx` | PeriodResult persistente, dica contextual, animação de contagem nos stats |
| `src/pages/Trade.tsx` | Feedback visual melhorado, aria-labels, dica contextual |
| `src/pages/Portfolio.tsx` | Empty state com CTA, dica contextual |
| `src/pages/Achievements.tsx` | Mostrar progresso para próxima conquista |
| `src/index.css` | Novas animações (pulse-success, count-up), ajustes de contraste light mode |
| `src/engine/persistence.ts` | Salvar/carregar dicas vistas |

## Prioridade de Implementação

1. **Bottom Nav mobile** — maior impacto na navegação mobile
2. **Feedback visual de trades** — melhora o loop principal do jogo
3. **Resumo pós FF persistente** — evita perda de informação
4. **Empty states** — melhora primeira impressão
5. **Dicas contextuais** — reduz curva de aprendizado
6. **Micro-animações** — polish
7. **Acessibilidade** — contraste e aria-labels

