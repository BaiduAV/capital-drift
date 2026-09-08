# Selic e inflação no simulador

O save v3 substitui a variação aleatória diária da Selic meta e a inflação sem convergência. As taxas são cenários simulados, não cotações, projeções Focus ou uma reprodução da economia brasileira atual.

## Selic: decisão, anúncio e vigência

Os calendários de 2026 e 2027 usam as oito datas de decisão publicadas pelo Banco Central. Após 2027, o simulador reutiliza as datas de mês/dia de 2027, ajustadas ao próximo dia útil; a interface identifica esse calendário futuro como ilustrativo. Não são simuladas reuniões extraordinárias.

A decisão acontece no fechamento da data da reunião. A nova meta vale a partir do próximo dia útil; entre decisões a meta permanece constante. O modelo permite manutenção, alta ou corte, em passos de 0,25 ponto percentual, limitados a 1 ponto por reunião. Esses tamanhos são parâmetros do jogo, não restrições legais do Copom.

A regra de decisão usa juro real neutro ilustrativo de 4%, inflação esperada, desvio da meta de inflação de 3%, atividade e pressão de expectativas. O peso do desvio inflacionário é 1,5. A taxa de decisão continua limitada ao intervalo operacional do jogo, de 2% a 20%. Não há sorteio diário de decisões.

Notícias fiscais alteram um ajuste de expectativa limitado a ±3 pontos percentuais e com decaimento de 63 pregões. Afetam os juros usados na marcação a mercado, mas não alteram diretamente a Selic meta. Uma decisão anunciada também é incorporada à curva antes da vigência. O CDI permanece um índice aproximado pela meta menos 0,10 ponto percentual; a implementação não estima a Selic efetiva diária observada.

## Inflação: tendência, preços e divulgação

O motor separa três conceitos:

- **Inflação esperada:** tendência anualizada do cenário; pode variar diariamente. Não é uma previsão estatisticamente estimada para os próximos 12 meses.
- **IPCA mensal simulado:** variação do nível de preços durante um mês civil.
- **IPCA 12m simulado:** produto dos fatores das últimas 12 observações mensais, menos um. Fica constante entre apurações.

A tendência reverte gradualmente para uma referência baseada na meta de 3%, pressão de oferta por regime, atividade e juro real defasado. A persistência da inflação e a transmissão dos juros usam constantes de tempo de 126 pregões. O juro real usa a relação de Fisher. A pressão de oferta é 0 no regime calmo, 0,2 ponto no bull, 0,6 no bear, 2 na crise e 0,4 na euforia. São hipóteses didáticas, sem calibração econométrica. Juros restritivos ajudam a reduzir inflação ao longo do tempo; a mudança para calmaria não apaga instantaneamente os efeitos anteriores.

O ruído diário da tendência é de 0,005 ponto percentual de desvio-padrão. Notícias inflacionárias alteram essa tendência em 0,05–0,25 ponto; não reescrevem índices já apurados. A tendência admite deflação, com limites de -2% a 15% anualizados para estabilidade numérica do cenário.

O nível de preços acumula fatores em dias corridos, na base 365. A passagem de um fim de semana que cruza o mês divide corretamente a acumulação entre os dois meses. O mesmo fator diário alimenta a correção do principal do IPCA+ e a perda de poder de compra, evitando divergência entre as séries.

Por simplificação, o fechamento mensal é publicado no primeiro pregão do mês seguinte. **Isso não reproduz o calendário real de divulgação do IBGE, sua cesta, sazonalidade ou a defasagem do VNA dos títulos públicos.** O painel informa o mês de referência e distingue a expectativa dos indicadores realizados. Os gráficos usam degraus para Selic e IPCA 12m.

## Saves e validação

Saves anteriores migram sem alterar caixa, posições, preços, Selic, inflação exibida ou histórico patrimonial. Como não havia observações mensais, o valor anual antigo é decomposto em 12 taxas mensais equivalentes; a parte transcorrida do mês corrente também recebe uma estimativa inicial. O painel informa quantos meses estimados ainda compõem a série e o aviso desaparece após sua substituição por 12 apurações novas. Isso preserva a continuidade, sem apresentar uma reconstrução como histórico observado.

O save guarda a decisão pendente, vigência, calendário, expectativa, juro real defasado e acumulação mensal. O schema verifica que o IPCA 12m é consistente com as 12 taxas mensais e bloqueia dados inconsistentes. A versão 3 impede que a versão anterior do aplicativo sobrescreva o novo estado com a dinâmica antiga.

Testes cobrem datas oficiais, vigência no próximo pregão, oito decisões por ano, manutenção entre reuniões, reação a notícias, fechamento mensal, deflação, desinflação após crise, transmissão defasada, consistência com IPCA+ e patrimônio real, migração, persistência e indicadores em português/inglês.

Na verificação com seeds 1–20, em 504 pregões por seed (10.080 pregões no total), houve 320 decisões e 272 mudanças da meta, todas nas datas de vigência. O motor anterior alterava a Selic em 10.040 desses pregões. Nas trajetórias novas, nenhum dos 4.165 pregões classificados como calmos apresentou inflação de 12 meses acima de 8%; o teste anterior registrava 56. As taxas de inflação finais ficaram entre 2,56% e 3,78% nessa amostra. Mudanças no consumo de números aleatórios alteram outros eventos, portanto a comparação não isola um efeito causal de cada coeficiente.

No cenário controlado com inflação inicial de 12%, Selic inicial de 11%, regime calmo, atividade constante e sem ruído ou notícias, a inflação de 12 meses caiu para 7,27% após 252 pregões e 3,30% após 504 pregões. O modelo anterior mantinha a inflação em 12% nesse experimento. Esses resultados verificam a direção e a temporalidade da resposta; não validam uma previsão econômica nem garantem essas faixas em outras trajetórias.

## Referências oficiais

- [Banco Central — Copom e periodicidade](https://www.bcb.gov.br/en/monetarypolicy/committee)
- [Calendário de 2026](https://www.bcb.gov.br/detalhenoticia/20739/nota)
- [Calendário de 2027](https://www.bcb.gov.br/detalhenoticia/21173/nota)
- [Banco Central — meta contínua de inflação](https://www.bcb.gov.br/controleinflacao/metainflacao)
- [IBGE — inflação mensal e acumulada](https://www.ibge.gov.br/explica/inflacao.php)

As referências sustentam as convenções institucionais. Coeficientes de resposta, volatilidades, defasagens e limites de cenário são escolhas explícitas do simulador.
