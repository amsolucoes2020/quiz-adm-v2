# Banco equilibrado — 9 de outubro de 2026

Cada categoria tem 60 múltiplas escolhas, 40 verdadeiro/falso e 40 múltiplas respostas: 1.680 questões ativas. A distribuição de dificuldade em cada formato é 50% Fácil, 30% Médio e 20% Difícil.

Os arquivos numerados são o currículo editorial. `[MC]` e `[VF]` têm linhas `conceito|definição`, agrupadas em conjuntos de cinco conceitos próximos. `[MR]` tem `tema|+descrição correta|+descrição correta|-descrição incorreta~correção|-descrição incorreta~correção`; são quatro descrições e de duas a quatro corretas. O sinal é um marcador de autoria; ele não aparece ao aluno.

Execute `npm run bank:build` para gerar [balancedQuestions.json](../../src/data/balancedQuestions.json) e `npm run bank:audit` para localizar repetição, proximidade de enunciados, generalizações e assimetria de tamanho. A auditoria aponta indícios; não substitui leitura pedagógica. Os dois pares próximos aprovados distinguem direção dos fluxos de comunicação e dado pessoal versus dado sensível — conceitos diferentes, não reformulações do mesmo gabarito.

As múltiplas escolhas contrastam definições da mesma família. O quiz prioriza famílias diferentes antes de repetir uma família, mantendo a prioridade de questões ainda não respondidas. As alternativas são embaralhadas durante a partida. Verdadeiro/falso tem 20 verdadeiras e 20 falsas por categoria, sem repetir uma definição para criar uma dupla invertida. Múltiplas respostas varia a quantidade de corretas e explica cada opção.

As descrições de múltiplas respostas usam estilo comum para corretas e distractores. O feedback conserva condições e ressalvas das afirmações completas. Conceitos semelhantes em formatos distintos só permanecem quando examinam uma característica diferente; por exemplo, definição de risco versus tratamento de um risco específico. Informações econômicas são conceitos para interpretar notícias, sem taxas, dirigentes ou previsões que possam vencer rapidamente.

## Referências para conferência

- [Microsoft: funções por categoria](https://support.microsoft.com/pt-br/excel/excel-functions-by-category), [validação de dados](https://support.microsoft.com/pt-br/excel/get-started/apply-data-validation-to-cells) e [proteção de planilha](https://support.microsoft.com/pt-br/excel/protect-a-worksheet).
- [Banco Central: política monetária](https://www.bcb.gov.br/controleinflacao/indexcontroleinflacao), [IBGE: indicadores](https://www.ibge.gov.br/indicadores) e [metadados do IPCA](https://www.ibge.gov.br/estatisticas/economicas/precos-e-custos/9256-.html).
- [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm), [CDC](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm) e [Constituição Federal](https://www.planalto.gov.br/ccivil_03/constituicao/constituicaocompilado.htm).
- [Scrum Guide oficial](https://scrumguides.org/scrum-guide.html), [FMI e Banco Mundial](https://www.imf.org/en/about/factsheets/sheets/2022/imf-world-bank-new) e [OMC: tarifas](https://www.wto.org/ENGLISH/tratop_e/tariffs_e/tariffs_e.htm).

As questões anteriores permanecem como registros históricos. `retiredQuestionKeys.json` identifica os enunciados aposentados, inclusive cópias importadas. O filtro também respeita `ativo: false`. O balanceamento não escreve perfis, ranking, XP ou conquistas. Novas questões manuais do professor continuam permitidas e devem passar por conferência de conteúdo; adicioná-las altera a contagem planejada.
