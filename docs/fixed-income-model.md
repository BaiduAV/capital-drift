# Renda fixa: contratos e convenções do simulador

A versão 2 dos saves substitui o retorno aleatório genérico dos oito produtos de renda fixa por contratos com remuneração, prazo, liquidez, emissor e tributação. Os preços e as ofertas são simulados; não representam ofertas disponíveis de bancos reais. As regras foram conferidas em setembro de 2026.

## Produtos

| Produto | Remuneração bruta | Prazo | Saída antes do vencimento |
|---|---|---|---|
| CDB100 | 100% do DI diário | 504 dias úteis por aplicação | Liquidez diária |
| CDB110 | 110% do DI diário | 504 dias úteis por aplicação | Liquidez diária após 30 dias corridos por aplicação |
| CDBPRE | Taxa nominal da oferta na compra, fixa por aplicação | 252 dias úteis por aplicação | Não permitida |
| TSELIC | Selic efetiva simulada e ágio/deságio de mercado | Série de 756 dias úteis | D+0 na janela considerada pelo simulador |
| TPRE | Taxa de mercado na aquisição; fluxo nominal fixo | Série de 504 dias úteis | Preço de mercado, D+0 |
| TIPCA | Inflação acumulada e remuneração real | Série de 1.260 dias úteis | Preço de mercado, D+0 |
| DEBAA / DEBBBB | DI + spread composto de 2% / 4% a.a. | Série de 756 dias úteis | Comprador sujeito a condições de mercado, D+1 |

Todos são produtos com pagamento único no vencimento, sem cupons. O nominal inicial de R$100 representa uma unidade didática. Compra de Tesouro liquida em D+1; os prazos tributários começam na liquidação. As ofertas de Tesouro e debêntures vencidas são substituídas por novas séries ao par. O patrimônio vencido é creditado em caixa, sem reinvestimento automático. CDBs têm vencimentos separados por aplicação.

## Remuneração e marcação a mercado

Uma taxa anual efetiva `r` vira taxa diária por `(1+r)^(1/252)-1`. O CDB110 multiplica a taxa DI diária por 1,10 antes da capitalização. A aproximação macro para o DI é `max(0, Selic - 0,001)`: DI e Selic são índices distintos; essa diferença fixa é uma hipótese do cenário, não uma identidade de mercado.

Prefixados do Tesouro são avaliados como valor presente do fluxo no vencimento. IPCA+ atualiza o nominal pelo índice de inflação e desconta o fluxo pela taxa real. Alta da taxa de desconto reduz o preço; o evento macro não aplica um segundo choque ao título. Não existe desconto diário arbitrário pelo nível de risco. CDB prefixado acumula a taxa contratada e não recebe oscilações de títulos negociados em mercado secundário.

O save v4 mantém curvas nominal, real e de ágio/deságio da Selic com vértices de 21, 126, 252, 504, 1.260 e 2.520 dias úteis. A interpolação é linear no logaritmo dos fatores de desconto; fora dos vértices, a taxa zero do extremo é constante. O desconto usa o prazo **remanescente**, de modo que o preço converge para o pagamento contratado no vencimento. Em uma curva inclinada, o encurtamento do prazo também muda a taxa aplicável.

A curva nominal responde à Selic esperada, inflação esperada, atividade e risco com sensibilidades diferentes por prazo. A curva real tem nível e sensibilidades próprios: não é obtida dividindo a taxa nominal pela inflação corrente ou esperada. Portanto, aumentar a inflação esperada não obriga a taxa real longa a cair nem valoriza automaticamente o IPCA+. Anúncios afetam as curvas antes da vigência da nova Selic; a mudança já antecipada não é aplicada novamente na data de vigência.

Os níveis iniciais, prêmios e sensibilidades em `yieldCurves.ts` são hipóteses didáticas, sem calibração empírica ou importação de cotações. Não se reproduz o ajuste estatístico da curva ANBIMA. A precificação por valor presente em base dias úteis/252 segue a convenção descrita na [metodologia de estrutura a termo da ANBIMA](https://www.anbima.com.br/data/files/9A/F4/E3/1F/4805B710B0F024B7882BA2A8/est-termo_metodologia_v2021.pdf).

### Tesouro Selic

O valor nominal atualizado (VNA didático) acumula a Selic efetiva; o preço de mercado é `VNA / (1 + deságio)^(dias úteis restantes/252)`. Deságio positivo implica preço abaixo do VNA; taxa negativa representa ágio. O spread pode variar com o risco, inclusive causar perda em venda antecipada, mas desaparece do desconto no vencimento. A nova série começa com preço R$100 e VNA compatível com o spread inicial. A fórmula segue o [material de cálculo do Tesouro Selic](https://www.tesourodireto.com.br/documents/d/guest/tesouro_selic); o spread e sua dinâmica são simulados.

### CDB prefixado por aplicação

A nova oferta usa a curva nominal no prazo do contrato mais prêmio bancário de 0,50 ponto percentual e ajuste pelo risco, arredondada ao ponto-base. Na condição inicial isso resulta em 12% a.a.; ofertas futuras podem ter taxas diferentes. Cada compra fixa `fixedAnnualRate`, `bookUnitValue` e `valuationDay` no lote. O saldo bruto capitaliza exclusivamente essa taxa até o vencimento; mudar a oferta não reavalia aplicações antigas. A cotação de compra é a denominação do depósito, sem juros de aplicações anteriores incorporados ao preço.

Patrimônio, P&L, alocação, resgate, IR/IOF e cobertura do FGC usam os saldos individuais. Uma cotação cuja taxa mudou antes da execução é rejeitada, mesmo se o desembolso for idêntico. A interface distingue a taxa para nova aplicação das taxas e saldos dos lotes existentes.

A inflação simulada acumula em base de dias corridos/365, com fechamento mensal e expectativa separados, sem a defasagem e o calendário de divulgação do VNA oficial. A dinâmica de juros e inflação permanece descrita no [modelo monetário](monetary-policy-model.md). Esses detalhes continuam aproximações explícitas.

## Calendário e impostos

Um avanço corresponde a um dia útil. O calendário começa em 02/01/2026 e considera fins de semana, feriados nacionais e fechamentos recorrentes da B3, incluindo Carnaval, Sexta-feira Santa e Corpus Christi. Não há simulação intradiária ou previsão de fechamentos extraordinários. Os anos futuros reutilizam essas convenções recorrentes. O mês tributário acompanha a data civil. CDI usa base 252; inflação e custódia usam dias corridos.

Cada aplicação registra quantidade, custo unitário, data de liquidação, vencimento e custódia. Resgates consomem lotes elegíveis por PEPS; a quantidade MAX respeita carências e liquidez. IR e IOF são calculados separadamente por aplicação, sem compensar lucro de um lote de renda fixa com perda de outro. A base de IR considera o ganho após IOF. Debêntures disponíveis são ordinárias tributadas; o contrato tem campo para isenção, sem presumir que todas as emissões sejam incentivadas.

A custódia de Tesouro é provisionada a 0,20% a.a. sobre o saldo, com franquia de R$10 mil para Tesouro Selic. A provisão reduz o patrimônio líquido e é retida proporcionalmente no resgate/vencimento. Como os produtos oferecidos não têm cupons, a provisão é retida na venda ou no vencimento, conforme as regras atuais do Tesouro Direto. A taxa adicional da instituição financeira é assumida como zero.

## Crédito e liquidez

CDB100 e CDBPRE compartilham o mesmo conglomerado fictício; CDB110 pertence a outro. A cobertura agrega principal e juros elegíveis até R$250 mil por conglomerado e consome o teto global de R$1 milhão no período de quatro anos iniciado na primeira intervenção elegível. Após o período, o limite global é restabelecido. Tesouro e debêntures não usam FGC.

A inadimplência é persistente: impede novas operações, encerra a remuneração e converte a posição em recebíveis de recuperação. Os cenários usam recuperação de 40% para crédito bancário excedente à garantia, 50% para debênture AA e 25% para BBB. O pagamento da garantia é projetado para 60 dias úteis e a recuperação não garantida para 126 dias úteis. **Esses percentuais, probabilidades e prazos são parâmetros didáticos, não garantias legais nem estimativas calibradas do FGC.** O caixa só recebe os valores na liquidação. A apuração tributária dos recebíveis é provisionada na criação, com idade do investimento congelada na intervenção.

Debêntures deixam de ter resgate universal D7. O mercado secundário pode ficar indisponível em estresse; a profundidade diária é limitada e compartilhada entre ordens, com spread de compra/venda. O modelo usa risco macro e estado de crédito como aproximação da disponibilidade de comprador. Uma venda efetivamente executada liquida em D+1; o recebível continua no patrimônio até lá. A liquidação automática para recompor caixa não usa ativos com liquidação futura ou posições bloqueadas.

O evento de rebaixamento aplica a queda anunciada ao preço de mercado da debênture e converte esse impacto em prêmio adicional de crédito. Esse prêmio persiste no save e na precificação dos próximos pregões, sem reaplicar o choque nem restaurar artificialmente o preço quando o evento expira. O valor contratual acumulado e o pagamento no vencimento permanecem preservados, salvo inadimplência.

## Migração

Saves v1 e sem versão são lidos antes de migrar. Preços, quantidades, custos, caixa, impostos pagos, recebíveis D7 já existentes e histórico de patrimônio são preservados. A categoria tributária do mês corrente é transportada para a data civil de migração para não reiniciar a isenção inadvertidamente.

O save antigo não contém os lotes reais nem contratos de vencimento. Cada posição antiga gera um lote usando a idade média disponível, com novo prazo a partir da migração e aviso visível. Não se recalculam rendimentos passados nem se inventam datas exatas. Novas compras registram lotes completos. O schema valida os contratos, as datas e a igualdade entre quantidade/custo dos lotes e a posição agregada. Versões antigas do aplicativo não devem sobrescrever saves de versões posteriores.

Na migração de v2/v3 para v4, os lotes existentes de CDB prefixado mantêm a taxa anterior de 12% e recebem o saldo unitário que já tinham no dia da migração, sem recalcular o passado. Preços e fluxos prometidos de Tesouro também são preservados: um deslocamento constante na taxa da série liga a nova curva ao preço já registrado, sem mudar o pagamento final. Esse deslocamento não é um novo ganho ou uma perda na migração e é removido ao emitir a série seguinte. O schema v4 exige curvas válidas e contrato/saldo por lote de CDB prefixado.

A mesma seed continua determinística dentro desta versão; o motor novo altera as trajetórias em relação à versão anterior. Os parâmetros de renda variável e seus pagamentos periódicos não são recalibrados nesta mudança.

## Fontes oficiais e validação

- [B3 — metodologia do DI](https://www.b3.com.br/pt_br/market-data-e-indices/indices/indices-de-segmentos-e-setoriais/di/metodologia-de-calculo-do-indice-di/)
- [Tesouro Direto — regras, liquidação, PEPS, custódia e impostos](https://www.tesourodireto.com.br/sobre-o-tesouro/regras-e-regulamento)
- [Tesouro IPCA+](https://www.tesourodireto.com.br/produtos/titulos/ipca-mais)
- [B3 — CDB e condições contratuais](https://www.b3.com.br/pt_br/produtos-e-servicos/registro/renda-fixa-e-valores-mobiliarios/certificado-de-deposito-bancario.htm)
- [FGC — limites e período de quatro anos](https://www.fgc.org.br/sobre-garantia-fgc)
- [B3 — calendário de 2026](https://www.b3.com.br/pt_br/noticias/calendario-de-negociacao-da-b3-confira-o-funcionamento-da-bolsa-em-2026.htm)

Os testes verificam resultados financeiros contra fórmulas independentes, limites tributários, PEPS, carências, vencimento sem duplicação, custódia, profundidade de mercado, FGC agregado, migração e integração com o fechamento diário. Não pressupõem que o comportamento antigo, identificado como incorreto, seja o resultado esperado.
