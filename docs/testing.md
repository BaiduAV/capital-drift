# Testes e cobertura

Use Node 22 e `npm ci`. O CI usa `package-lock.json`; o lock antigo do Bun não é a referência desse fluxo.

```sh
npm run test:engine   # regras puras, em Node
npm run test:ui       # React, contexto e rotas reais, em jsdom
npm test             # ambos os projetos
npm run test:coverage
npm run typecheck
npm run lint
npm run build
```

O workflow `CI / validate` executa instalação pelo lock, TypeScript, lint, testes com cobertura e build em PRs e pushes para `main`/`release`. O relatório HTML fica em `coverage/index.html`, disponível também como artefato do workflow por 14 dias. A configuração de checks obrigatórios na proteção de branch é independente do arquivo de workflow.

## Organização

- `src/engine/__tests__`: simulação, calendário, taxas, contabilidade, preços, contratos, estatísticas e indicadores. O adaptador de Storage em memória permite testar persistência no ambiente Node; erros reais de Storage e recuperação de saves ficam nos testes de contexto em jsdom.
- `src/context/__tests__`: comandos reais do provider, atomicidade dos lotes de operações, conquistas, salvamento e equivalência entre avanço rápido e diário.
- `src/components/game/__tests__`: comportamento dos controles, estratégias, rebalanceamento e contratos exibidos.
- `src/hooks/__tests__`: atalhos, composição de texto, repetição de teclas, foco e diálogos.
- `src/pages/__tests__`: navegação, ordens confirmadas, reserva de IPO, venda bloqueada, carteira, recarga e estatísticas. Usam App, provider e engine reais. Somente a medição de tamanho dos gráficos é substituída, pois jsdom não calcula layout.

## Regras para novos testes

Use `gameFixture` e `buyFixture` de `src/test/factories/game.ts` para iniciar cenários com o catálogo, contratos, curvas e schema atuais. Uma compra de preparação que não executa deve falhar imediatamente. Objetos simplificados ainda são úteis para regras locais e compatibilidade de saves antigos; identifique explicitamente esse propósito.

Todo teste precisa executar uma asserção: os setups usam `expect.hasAssertions()`. Não use apenas logs, nem esconda a verificação em um `if (quote.canExecute)`. Testes de erro devem verificar também o estado e o save, não apenas uma mensagem.

Para aleatoriedade, fixe a seed e mantenha as condições sob controle. Teste propriedades do modelo, como correlação em crise e sensibilidades setoriais, sem impor um retorno final arbitrário de uma única trajetória. Testes probabilísticos de falência usam sorteios controlados. As suítes não constituem calibração estatística do modelo contra dados de mercado.

Casos de regressão incluem limite de isenção e venda parcial em margin call, downgrade de debêntures, lotes de CDB com taxas distintas, vencimentos, IR/IOF, liquidação pendente, save indisponível, estratégias sem execução, IPO efetivamente alocado e estatísticas após perda total.

## Limites de cobertura

O V8 inclui arquivos de produção que nenhum teste importou. Exclui testes, fixtures, declarações de tipos e os componentes de UI base em `src/components/ui`; estes continuam sendo exercitados pelos fluxos, mas não entram no percentual. Páginas e componentes de jogo entram normalmente.

Além do piso global, há pisos específicos para negociação, renda fixa, margin call, política monetária, curvas, estatísticas e GameContext. Os valores exatos ficam em `vitest.config.ts`. Não reduza os pisos para acomodar uma regressão. Ao comparar relatórios, mantenha os mesmos filtros: o percentual global não é comparável a auditorias que incluam os componentes de UI base.

Os testes em jsdom verificam estado e interações, mas não substituem validação em navegador de layout responsivo, gestos reais, áudio, instalação PWA, service worker e atualização offline. Essas continuam sendo verificações de release.
