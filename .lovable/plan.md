

## Análise dos Setores — Problemas Encontrados

### 1. Bug crítico: `pickSector` usa nomes errados
Em `events.ts` linha 12, a função `pickSector` usa `['BANK', 'ENERGY', 'RETAIL', 'TECH']` — mas os setores reais são `'BANCOS', 'ENERGIA', 'VAREJO', 'TECH'`. Isso significa que **SECTOR_BOOM, SECTOR_BUST e SECTOR_CRASH nunca afetam nenhum ativo** (o filtro não encontra ativos nos setores inexistentes).

### 2. Setores de FIIs estão semanticamente errados
Os FIIs usam setores `BRICK`, `PAPER`, `HYBRID` que representam **tipos de FII**, não setores econômicos. Isso é correto para a classificação de FIIs no Brasil, mas:
- `BRICK` traduzido como "Construção" está errado — FII de tijolo é **imóvel físico** (lajes, shoppings, galpões), não construção civil.
- `PAPER` traduzido como "Papel" está correto em PT mas confuso em EN — deveria ser "Mortgage/CRI" ou simplesmente "Paper FII".
- Esses setores não têm betas em `SECTOR_BETAS` (correlation.ts), então FIIs não recebem impacto setorial via `computeSectorReturn`.

### 3. Setores definidos mas nunca usados no catálogo inicial
Os setores `AGRO`, `MINERACAO`, `SAUDE`, `INDUSTRIA`, `UTILITIES`, `IMOB`, `TELECOM` existem nos betas e nos pools de nomes, mas **nenhum ativo do catálogo inicial os usa**. Só aparecem via IPOs dinâmicos, que por sua vez também estão quebrados (usam os mesmos setores que não estão no catálogo).

### 4. ETFs sem betas setoriais
ETFs como `BOVA11` (TOTAL_MARKET), `DIVO11` (DIVIDENDS), `SMAL11` (SMALL_CAPS) têm setores que não existem em `SECTOR_BETAS`, então `computeSectorReturn` retorna beta zero para eles.

---

## Plano de Correção

### A. Corrigir `pickSector` (bug crítico)
- Mudar `['BANK', 'ENERGY', 'RETAIL', 'TECH']` para os setores reais que existem no catálogo do estado. Melhor ainda: **derivar dinamicamente** dos setores presentes no `assetCatalog` (filtrando `NONE` e setores de FII).

### B. Expandir o catálogo inicial de ações
Adicionar ações nos setores que já têm infraestrutura completa (betas, nomes) mas faltam no catálogo:
- **AGRO** (2 ações) — setor relevante no Brasil
- **MINERACAO** (2 ações) — Vale, CSN etc.
- **SAUDE** (1 ação)
- **INDUSTRIA** (1 ação)

Isso eleva de 12 para ~18 ações, cobrindo os setores com betas definidos.

### C. Corrigir traduções de setores de FII
- `BRICK` → "Tijolo" (PT) / "Brick & Mortar" (EN) — reflete o termo de mercado
- `PAPER` → "Papel" (PT) / "Paper (CRI/CRA)" (EN)

### D. Adicionar betas para setores de ETF e FII
Em `correlation.ts`, adicionar entradas em `SECTOR_BETAS` para:
- `TOTAL_MARKET`: beta próximo ao mercado (riskOn alto)
- `DIVIDENDS`: beta defensivo (selic positivo, riskOn moderado)
- `SMALL_CAPS`: beta agressivo (riskOn alto, selic negativo)
- `BRICK`: sensível a selic (negativo) e riskOn
- `PAPER`: sensível a selic (positivo, se beneficia de juros altos)
- `HYBRID`: mix dos dois

### E. Tornar IPOs dinâmicos mais realistas
O bloco de IPO em `simulateDay.ts` só gera `STOCK`. Permitir também FIIs quando o setor for `BRICK`/`PAPER`/`LOGISTICA`/`HYBRID`.

### Arquivos a modificar:
- **`src/engine/events.ts`** — corrigir `pickSector` para usar setores reais
- **`src/engine/assets.ts`** — adicionar ações de AGRO, MINERACAO, SAUDE, INDUSTRIA
- **`src/engine/correlation.ts`** — adicionar betas para TOTAL_MARKET, DIVIDENDS, SMALL_CAPS, BRICK, PAPER, HYBRID
- **`src/engine/i18n.ts`** — corrigir tradução de BRICK
- **`src/engine/simulateDay.ts`** — permitir IPOs de FII nos setores apropriados

