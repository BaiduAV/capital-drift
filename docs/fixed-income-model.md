# Renda fixa: contratos e convenções do simulador

A versão 2 dos saves substitui o retorno aleatório genérico dos oito produtos de renda fixa por contratos com remuneração, prazo, liquidez, emissor e tributação. Os preços e as ofertas são simulados; não representam ofertas disponíveis de bancos reais. As regras foram conferidas em setembro de 2026.

## Produtos

| Produto | Remuneração bruta | Prazo | Saída antes do vencimento |
|---|---|---|---|
| CDB100 | 100% do DI diário | 504 dias úteis por aplicação | Liquidez diária |
| CDB110 | 110% do DI diário | 504 dias úteis por aplicação | Liquidez diária após 30 dias corridos por aplicação |
| CDBPRE | 12% efetivos ao ano | 252 dias úteis por aplicação | Não permitida |
| TSELIC | Selic efetiva simulada | Série de 756 dias úteis | D+0 na janela considerada pelo simulador |
| TPRE | Taxa de mercado na aquisição; fluxo nominal fixo | Série de 504 dias úteis | Preço de mercado, D+0 |
| TIPCA | Inflação acumulada e remuneração real | Série de 1.260 dias úteis | Preço de mercado, D+0 |
| DEBAA / DEBBBB | DI + spread composto de 2% / 4% a.a. | Série de 756 dias úteis | Comprador sujeito a condições de mercado, D+1 |

Todos são produtos com pagamento único no vencimento, sem cupons. O nominal inicial de R$100 representa uma unidade didática. Compra de Tesouro liquida em D+1; os prazos tributários começam na liquidação. As ofertas de Tesouro e debêntures vencidas são substituídas por novas séries ao par. O patrimônio vencido é creditado em caixa, sem reinvestimento automático. CDBs têm vencimentos separados por aplicação.

## Remuneração e marcação a mercado

Uma taxa anual efetiva `r` vira taxa diária por `(1+r)^(1/252)-1`. O CDB110 multiplica a taxa DI diária por 1,10 antes da capitalização. A aproximação macro para o DI é `max(0, Selic - 0,001)`: DI e Selic são índices distintos; essa diferença fixa é uma hipótese do cenário, não uma identidade de mercado.

Prefixados do Tesouro são avaliados como valor presente do fluxo no vencimento. IPCA+ atualiza o nominal pelo índice de inflação e desconta o fluxo pela taxa real. Alta da taxa de desconto reduz o preço; o evento macro não aplica um segundo choque ao título. Não existe desconto diário arbitrário pelo nível de risco. CDB prefixado acumula a taxa contratada e não recebe oscilações de títulos negociados em mercado secundário.

A curva nominal é aproximada pela Selic mais prêmio de prazo e risco; a real usa a relação de Fisher mais prêmio. Não há curva de juros observada, previsão de Copom, convexidade aproximada por choque ou importação de cotações. A precificação usa diretamente o desconto composto do fluxo. A inflação simulada acumula em base de dias corridos/365, sem a defasagem e o calendário de divulgação do VNA oficial. Esses detalhes são aproximações explícitas; a relação entre preço, juros e pagamento contratado é preservada.

## Calendário e impostos

Um avanço corresponde a um dia útil. O calendário começa em 02/01/2026 e considera fins de semana, feriados nacionais e fechamentos recorrentes da B3, incluindo Carnaval, Sexta-feira Santa e Corpus Christi. Não há simulação intradiária ou previsão de fechamentos extraordinários. Os anos futuros reutilizam essas convenções recorrentes. O mês tributário acompanha a data civil. CDI usa base 252; inflação e custódia usam dias corridos.

Cada aplicação registra quantidade, custo unitário, data de liquidação, vencimento e custódia. Resgates consomem lotes elegíveis por PEPS; a quantidade MAX respeita carências e liquidez. IR e IOF são calculados separadamente por aplicação, sem compensar lucro de um lote de renda fixa com perda de outro. A base de IR considera o ganho após IOF. Debêntures disponíveis são ordinárias tributadas; o contrato tem campo para isenção, sem presumir que todas as emissões sejam incentivadas.

A custódia de Tesouro é provisionada a 0,20% a.a. sobre o saldo, com franquia de R$10 mil para Tesouro Selic. A provisão reduz o patrimônio líquido e é retida proporcionalmente no resgate/vencimento. Como os produtos oferecidos não têm cupons, a provisão é retida na venda ou no vencimento, conforme as regras atuais do Tesouro Direto. A taxa adicional da instituição financeira é assumida como zero.

## Crédito e liquidez

CDB100 e CDBPRE compartilham o mesmo conglomerado fictício; CDB110 pertence a outro. A cobertura agrega principal e juros elegíveis até R$250 mil por conglomerado e consome o teto global de R$1 milhão no período de quatro anos iniciado na primeira intervenção elegível. Após o período, o limite global é restabelecido. Tesouro e debêntures não usam FGC.

A inadimplência é persistente: impede novas operações, encerra a remuneração e converte a posição em recebíveis de recuperação. Os cenários usam recuperação de 40% para crédito bancário excedente à garantia, 50% para debênture AA e 25% para BBB. O pagamento da garantia é projetado para 60 dias úteis e a recuperação não garantida para 126 dias úteis. **Esses percentuais, probabilidades e prazos são parâmetros didáticos, não garantias legais nem estimativas calibradas do FGC.** O caixa só recebe os valores na liquidação. A apuração tributária dos recebíveis é provisionada na criação, com idade do investimento congelada na intervenção.

Debêntures deixam de ter resgate universal D7. O mercado secundário pode ficar indisponível em estresse; a profundidade diária é limitada e compartilhada entre ordens, com spread de compra/venda. O modelo usa risco macro e estado de crédito como aproximação da disponibilidade de comprador. Uma venda efetivamente executada liquida em D+1; o recebível continua no patrimônio até lá. A liquidação automática para recompor caixa não usa ativos com liquidação futura ou posições bloqueadas.

## Migração

Saves v1 e sem versão são lidos antes de migrar. Preços, quantidades, custos, caixa, impostos pagos, recebíveis D7 já existentes e histórico de patrimônio são preservados. A categoria tributária do mês corrente é transportada para a data civil de migração para não reiniciar a isenção inadvertidamente.

O save antigo não contém os lotes reais nem contratos de vencimento. Cada posição antiga gera um lote usando a idade média disponível, com novo prazo a partir da migração e aviso visível. Não se recalculam rendimentos passados nem se inventam datas exatas. Novas compras registram lotes completos. O schema valida os contratos, as datas e a igualdade entre quantidade/custo dos lotes e a posição agregada. A versão antiga do aplicativo não deve sobrescrever saves v2.

A mesma seed continua determinística dentro desta versão; o motor novo altera as trajetórias em relação à versão anterior. Os parâmetros de renda variável e seus pagamentos periódicos não são recalibrados nesta mudança.

## Fontes oficiais e validação

- [B3 — metodologia do DI](https://www.b3.com.br/pt_br/market-data-e-indices/indices/indices-de-segmentos-e-setoriais/di/metodologia-de-calculo-do-indice-di/)
- [Tesouro Direto — regras, liquidação, PEPS, custódia e impostos](https://www.tesourodireto.com.br/sobre-o-tesouro/regras-e-regulamento)
- [Tesouro IPCA+](https://www.tesourodireto.com.br/produtos/titulos/ipca-mais)
- [B3 — CDB e condições contratuais](https://www.b3.com.br/pt_br/produtos-e-servicos/registro/renda-fixa-e-valores-mobiliarios/certificado-de-deposito-bancario.htm)
- [FGC — limites e período de quatro anos](https://www.fgc.org.br/sobre-garantia-fgc)
- [B3 — calendário de 2026](https://www.b3.com.br/pt_br/noticias/calendario-de-negociacao-da-b3-confira-o-funcionamento-da-bolsa-em-2026.htm)

Os testes verificam resultados financeiros contra fórmulas independentes, limites tributários, PEPS, carências, vencimento sem duplicação, custódia, profundidade de mercado, FGC agregado, migração e integração com o fechamento diário. Não pressupõem que o comportamento antigo, identificado como incorreto, seja o resultado esperado.
