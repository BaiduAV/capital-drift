# Capital Drift

Simulador de investimentos com ações, fundos imobiliários, criptoativos e renda fixa, evolução do cenário econômico e gestão de carteira. A aplicação usa React, TypeScript, Vite, Tailwind CSS e shadcn/ui, com suporte a PWA.

## Desenvolvimento local

Use Node.js 22, como no CI, e npm. O `package-lock.json` é o único lock de dependências do projeto.

```sh
git clone https://github.com/BaiduAV/capital-drift.git
cd capital-drift
npm ci
npm run dev
```

O servidor de desenvolvimento usa a porta 8080. O estado do jogo é salvo no `localStorage` do navegador.

## Validação

```sh
npm run typecheck
npm run lint
npm run test:coverage
npm run build
```

O TypeScript verifica a aplicação e as configurações de Vite, Vitest e Tailwind. O lint exige zero avisos. O CI executa esses mesmos comandos em pull requests e em pushes para `main` e `release`.

Para executar os testes sem cobertura, use `npm test`; para acompanhar alterações, `npm run test:watch`. Veja [Testes e cobertura](docs/testing.md) para ambientes, fixtures e limites de cobertura.

## Build e publicação

`npm run build` gera a aplicação estática em `dist/`, incluindo o manifesto PWA e o service worker. Use `npm run preview` para inspecionar o build localmente. A hospedagem deve servir `dist/` e encaminhar as rotas da aplicação para `index.html`.

## Configurações

- `vite.config.ts`: servidor, aliases, plugins e PWA.
- `vitest.config.ts`: ambientes Node/jsdom e limites de cobertura.
- `tsconfig.json`: referências dos projetos TypeScript e alias usado pelas ferramentas; as opções de compilação ficam em `tsconfig.app.json` e `tsconfig.node.json`.
- `tailwind.config.ts` e `postcss.config.js`: tema, busca de classes e processamento CSS.
- `components.json`: configuração para adicionar componentes pelo CLI do shadcn/ui.
- `eslint.config.js` e `.github/workflows/ci.yml`: regras de qualidade e validação automatizada.

A integração `lovable-tagger` permanece disponível no modo de desenvolvimento para edição no Lovable. Sua retirada deve acompanhar a descontinuação desse fluxo de edição.
