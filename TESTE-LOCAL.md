# Prévia local — V1.1, V1.2 e V1.3

## Executar

Na pasta `adm_quiz/quiz-administracao`, execute:

```sh
npm run dev -- --host 127.0.0.1 --port 5173
```

Abra http://127.0.0.1:5173/. O perfil **Aluno de teste** entra automaticamente, com acesso ao painel administrativo fictício. Não informe credenciais reais. O botão Sair apenas recarrega a prévia; não há autenticação nesta simulação.

Os dados ficam na chave `adm-quiz-sandbox-v1.3` do localStorage deste navegador. O botão **Reiniciar teste** apaga somente essa chave. Cada navegador/origem tem seu próprio teste. Não há sincronização entre dispositivos, autenticação Firebase nem leitura/gravação em produção. O adaptador só permite localhost/127.0.0.1/loopback IPv6. O código de configuração Firebase original permanece fora da árvore de importações desta prévia.

## Rebalanceamento

- Acerto inédito no dia: Fácil 10, Médio 20, Difícil 30, Especialista 50 XP.
- Erro ou tempo esgotado: 0 XP. No V/F, há desconto de 3 XP a cada 10 segundos decorridos, limitado ao XP da questão. Múltipla escolha mantém XP fixo.
- Combos: 3 acertos seguidos +10 XP, 5 +20 XP e 10 +30 XP, cada marco uma única vez por partida. Um erro zera a sequência, mas preserva os marcos já premiados; uma nova partida reinicia os marcos. Revisões e repetições no dia não rendem combo e interrompem a sequência. Os três marcos podem somar até 60 XP numa partida perfeita, além do bônus de desempenho.
- Revisões e repetições no mesmo dia: sem XP e sem novos contadores de missões/acertos. A primeira tentativa define o aproveitamento do dia para aquela questão. No dia seguinte ela volta a contar.
- Partida elegível: 10 questões distintas, inéditas no dia e fora de revisão. O serviço confere as respostas registradas. Só essas partidas avançam contadores de partidas e recebem bônus de desempenho.
- Bônus exclusivo: 7–8 acertos +20; 9 +40; 10 +60. Não acumula faixas nem o antigo bônus fixo por finalizar.
- Conquistas permanentes anteriores continuam disponíveis e são concedidas uma vez. Portanto, o XP total de uma partida pode incluir pergunta, desempenho, missões, conquistas e sequência diária.

## Missões

O catálogo tem 38 missões. A cada dia ficam disponíveis 19: três diárias, oito semanais e oito mensais. As diárias alternam uma prática geral, um objetivo de aprendizagem e uma das 12 categorias em destaque. A seleção segue a data de São Paulo e recarregar não muda os objetivos.

- Diárias: prática, acertos por modo, uso dos dois modos, partida com 8 acertos, recuperação de erros e categoria em destaque. Recompensas de 30–40 XP.
- Semanais: volume, diversidade, precisão, três dias ativos, dois modos, dificuldade, qualidade e recuperação. Recompensas de 100–200 XP.
- Mensais: volume, todas as áreas, presença, partidas, dois modos, dificuldade, qualidade e recuperação. Recompensas de 200–700 XP.

Dia ativo exige cinco questões distintas fora de revisão. A semana começa na segunda e o mês no dia 1, no horário de Brasília. Apenas a missão de presença semanal exige três dias; os outros objetivos seguem os critérios mostrados. Conclusões não são revogadas por erros posteriores.

Recuperação conta o primeiro acerto elegível de uma questão errada em dia anterior, uma vez por questão. Acertos em revisão ou repetição no mesmo dia não avançam essa meta. É preciso ter erros anteriores para realizar esses objetivos.

## Conquistas ampliadas

São 78 conquistas permanentes, incluindo as 20 anteriores. Cada uma das 12 áreas tem Bronze (5 questões distintas acertadas), Prata (15) e Ouro (30), com 20, 40 e 75 XP. Também há marcos por modo, dificuldade, partidas completas, dias ativos, sequência e recuperação de erros. As medalhas de sequência não acrescentam XP aos bônus de sequência já existentes.

O Perfil mostra próximas conquistas, barras de progresso e filtros por categoria e situação. Missões têm filtros por período e conclusão. Os contadores novos de modo, domínio e recuperação começam nesta atualização; XP, totais antigos e conquistas já obtidas são preservados, sem inventar histórico detalhado.

## Verdadeiro / Falso

360 afirmações, 30 por área: 15 fáceis, 9 médias e 6 difíceis. Cada área tem 15 verdadeiras e 15 falsas. Todas as 12 áreas permitem partidas de 10 questões. As 200 questões originais de múltipla escolha foram preservadas e receberam 240 novas (20 por área: 10 fáceis, 6 médias e 4 difíceis), totalizando 440 de múltipla escolha e 800 no banco completo. As novas categorias são Excel e Economia e Atualidades.

V/F: 30 segundos, com −3 XP aos 10 segundos decorridos e −6 XP aos 20 segundos; múltipla escolha: 60 segundos. O tempo esgotado registra erro mesmo com alternativa selecionada. Verdadeiro e Falso permanecem nessa ordem. O painel administrativo e a importação aceitam `formato: "vf"`, `alternativas: ["Verdadeiro", "Falso"]` e `respostaCorreta: 0` ou `1`. Questões antigas sem formato são múltipla escolha. Especialista está disponível no cadastro/importação; o banco anterior não foi reclassificado artificialmente.

## Carreira e sequência

Carreira pelo XP vitalício, preservada ao trocar temporada:

| Nível | Cargo | XP mínimo |
|---|---|---:|
| 1 | Aprendiz | 0 |
| 2 | Assistente | 500 |
| 3 | Analista | 1.500 |
| 4 | Supervisor | 3.000 |
| 5 | Coordenador | 5.000 |
| 6 | Gerente | 8.000 |
| 7 | Diretor | 12.000 |

A sequência aumenta uma vez por dia com cinco questões distintas. Uma falta interrompe a sequência atual, mas preserva o recorde. Marcos: 3 dias +20; 7 +50; 14 +100; 30 +200. Cada marco dá XP uma única vez por perfil, inclusive se a sequência for perdida e retomada.

## Roteiro de teste

1. Confira as três missões do dia. Em um perfil recém-reiniciado, confira também XP zero e Aprendiz.
2. Jogue uma partida de múltipla escolha. Confira explicações e XP.
3. Selecione V/F e Todas; complete 10 questões. Confira cronômetro, resultado e missões.
4. Refaça erros: pratique sem XP adicional.
5. Recarregue a página: perfil, missões e XP permanecem.
6. No Admin, cadastre uma questão Especialista ou V/F e confira a listagem/jogo.
7. Consulte Perfil e Ranking, que representam somente dados fictícios locais.
8. Use Reiniciar teste para recomeçar.

`npm test` cobre pontuação, repetição, idempotência, calendário, marcos de sequência até 30 dias, carreira e validação dos bancos. `npm run build` compila a prévia; não publica.

## Antes de futura publicação

Esta entrega é exclusivamente local. A integração de produção e as regras do Firestore ainda precisam ser adaptadas e verificadas para os novos campos e formatos, com plano de migração para a temporada em curso. Nenhum reset/migração foi feito nos perfis reais. A meta de premiação de 8.000 XP discutida anteriormente não foi implementada nem recalculada; o rebalanceamento muda o esforço necessário e exige nova avaliação antes de anunciar a meta.


## Ampliação do banco — 24/09/2026

- `src/data/questions.json`: 200 questões originais, preservadas.
- `src/data/trueFalse.json`: 360 questões de verdadeiro/falso, incluindo as 20 anteriores.
- `src/data/additionalQuestions.json`: 240 novas questões de múltipla escolha.
- `src/data/questionBank.js`: composição dos três arquivos, mantendo os identificadores locais anteriores.
- `src/domain/localBank.js`: atualização local que acrescenta questões, preserva progresso, perguntas personalizadas e exclusões anteriores.

Nas dez áreas antigas há 40 questões de múltipla escolha e 30 de V/F; nas duas novas, 20 de múltipla escolha e 30 de V/F. A expressão “6 fáceis” no pedido de V/F foi interpretada como “6 difíceis”, seguindo a proporção solicitada. O texto do seletor continua mostrando apenas os modos.

Missão Visão completa e conquista Generalista passam a contemplar as 12 categorias. Prêmios já conquistados não são revogados nem concedidos novamente.

Excel usa contexto Microsoft 365 em português do Brasil, com ponto e vírgula nas fórmulas. Questões datadas de economia informam a edição/período e distinguem projeções de resultados observados. Números de cenários didáticos não são apresentados como cotações atuais. Após responder, o aluno pode consultar a fonte das questões referenciadas e ver a data de referência quando aplicável.

Fontes oficiais consultadas para os temas específicos:

- [IBGE — PIB](https://www.ibge.gov.br/explica/pib.php)
- [IBGE — inflação](https://www.ibge.gov.br/explica/inflacao.php)
- [Banco Central — política monetária](https://www.bcb.gov.br/controleinflacao/)
- [Banco Central — transmissão da política monetária](https://www.bcb.gov.br/controleinflacao/transmissaopoliticamonetaria)
- [Banco Central — câmbio](https://bcb.gov.br/estabilidadefinanceira/oqueecambio)
- [Banco Central — meta contínua desde 2025](https://bcb.gov.br/controleinflacao/historicometas)
- [FMI — WEO, julho de 2026](https://www.imf.org/en/publications/weo/issues/2026/07/08/world-economic-outlook-update-july-2026)
- [Microsoft — PROCX](https://support.microsoft.com/pt-br/excel/functions/xlookup-function)
- [ANPD — perguntas frequentes sobre proteção de dados](https://www.gov.br/anpd/pt-br/acesso-a-informacao/perguntas-frequentes)

As questões são redação pedagógica própria. Os testes verificam estrutura, contagens, distribuição, preservação do gabarito ao embaralhar, fontes válidas e migração; não substituem revisão pedagógica humana. Os registros de atualidades são um retrato datado, sem atualização automática por notícias.


## Edição conceitual — banco ativo

Esta seção substitui as contagens ativas da ampliação anterior: há **551 questões ativas**, distribuídas pelas 12 categorias e pelos dois modos. Foram retirados da seleção 262 itens de análise de cenários, decisões aplicadas, cálculos e interpretação de resultados. Conceitos, definições, características e finalidades de ferramentas permanecem, inclusive conceitos avançados.

Os enunciados retirados continuam preservados nos três arquivos originais. `src/data/deferredQuestionIds.json` registra seus índices estáveis no banco completo (ordem: questions, trueFalse, additionalQuestions). Esse arquivo é o catálogo reservado para a futura mecânica; seus itens não aparecem na seleção de jogo nem na listagem ativa local. Uma cópia importada com o mesmo enunciado também é excluída da edição atual.

`src/data/conceptualQuestions.json` acrescenta 13 questões de conceitos e definições em Excel e Economia para manter pelo menos dez perguntas por categoria/modo e trinta por área, permitindo a medalha Ouro. A distribuição anterior de dificuldades não é mais uma quota do banco ativo.

A atualização preserva os IDs, XP, conquistas e histórico de respostas. Não apaga registros locais antigos: apenas retira os itens reservados da consulta ativa. Cadastros ou importações de conteúdo novo ainda exigem revisão pedagógica; não há classificador automático de enunciados. Tudo permanece na prévia local, sem publicação.

## V1.4 — piloto de múltiplas respostas

Banco inicial de **10 questões conceituais**, em `src/data/multipleAnswers.json`, anexado aos IDs existentes. Total ativo: 561. Selecione **Múltiplas respostas → Todas** para uma partida completa. O piloto mistura dez áreas e não oferece partidas individuais por categoria. Cronômetro: 60 segundos.

Cada questão tem quatro alternativas e duas, três ou quatro corretas (somente uma questão do piloto tem quatro corretas). O aluno deve selecionar pelo menos uma e confirmar. Não há indicação do gabarito antes da confirmação. Conjunto incompleto ou com alternativa incorreta recebe zero XP da questão; conjunto exato recebe o XP normal da dificuldade. Não há multiplicador. Após confirmar, cada alternativa mostra seu estado e sua explicação, além da quantidade de corretas identificadas e incorretas marcadas.

Somente no novo formato, após uma primeira tentativa errada, a segunda tentativa correta no mesmo dia rende 50% do XP base. Uma segunda tentativa errada também consome essa oportunidade. Demais tentativas não dão XP no dia. Repetir uma questão acertada de primeira não rende bônus. Os controles são por questão/dia e persistem ao recarregar, independentemente da sessão. Revisões não avançam missões, estatísticas de primeira tentativa, combos ou bônus de partida. No dia seguinte inicia-se outro ciclo de tentativas. Os outros modos mantêm suas regras anteriores.

Combos e desempenho usam acertos completos. O novo modo tem missão diária rotativa de três acertos, semanal de dez e mensal de 80% em pelo menos vinte primeiras tentativas diárias. A amostra mínima impede obter a missão mensal com uma única questão. Acrescentadas três conquistas de 10, 25 e 50 acertos: agora são 41 missões no catálogo (21 ativas) e 81 conquistas.

Importação JSON aceita `formato: "multipla_resposta"`, quatro `alternativas`, `respostasCorretas` como lista de índices de 0 a 3 e quatro `explicacoesAlternativas` na mesma ordem. O cadastro manual anterior continua atendendo múltipla escolha e V/F; use JSON para importar questões deste piloto. O embaralhamento mantém juntos alternativas, gabarito e explicações, inclusive ao refazer erros. Nenhuma mudança foi publicada no GitHub ou no Firebase.

## V1.5 — ligas e temporadas locais

Esta seção substitui o encerramento manual e as regras de ranking das versões anteriores. Temporadas mensais usam o horário de Brasília, início inclusivo e fim exclusivo à meia-noite do primeiro dia do mês seguinte. O adaptador local processa a virada antes das operações; a interface também atualiza ao receber foco e a cada 30 segundos. Com o aplicativo fechado, a virada é processada na próxima abertura. Não existe agendamento em servidor nesta prévia.

### Competição e XP

`competition.points` é independente de `pontuacaoGeral`. Somente acertos inéditos no dia e o bônus de desempenho de partidas completas dão pontos competitivos. Valem os mesmos valores de dificuldade e a redução de tempo do V/F. Combos, missões, conquistas, sequência e a segunda tentativa de múltiplas respostas continuam concedendo o XP previsto, sem pontuar no ranking. O feedback mostra XP e pontos separadamente. Não há limite diário rígido ou retorno decrescente nesta versão.

O XP histórico, os níveis, conquistas permanentes e recordes são preservados. O valor legado `xpTemporada` permanece apenas por compatibilidade e não ordena mais o ranking. Na migração, os perfis existentes entram na Bronze com zero pontos competitivos; não se inventa uma pontuação retroativa a partir do XP antigo. Os dados de produção não são modificados.

### Salas e resultados

Bronze, Prata, Ouro e Diamante têm salas de até 30 participantes. Na abertura, as salas são equilibradas dentro de cada liga (31 alunos formam salas de 16 e 15); novas entradas aproveitam vagas sem mover participantes já alocados. O ranking mostra somente a sala do aluno, sem o antigo corte de dez pessoas.

Em salas de 30, cinco sobem e cinco descem. Em salas menores, usa-se `floor(participantes / 6)`, limitado a cinco; abaixo de seis não há promoção, rebaixamento ou título de campeão. Bronze não rebaixa, e Diamante não promove: o primeiro recebe o título e os demais na faixa superior recebem Elite. É preciso ter pontos positivos para promoção, Elite ou título. Desempate: pontos, acertos da temporada e identificador estável, nesta ordem. O campo de distância mostra quantos pontos garantem ultrapassar o adversário sem depender do desempate.

Novos perfis que entram a partir de 75% da temporada ficam em classificação: estudam e ganham XP, mas não disputam pontos oficiais até a próxima temporada, quando entram na Bronze. A migração dos perfis de teste existentes é uma exceção inicial para permitir testar a sala atual.

O encerramento registra o resultado de cada sala e a campanha de cada perfil antes de iniciar a próxima temporada. Reseta pontos, estatísticas competitivas, missões e seus contadores, mantendo o histórico permanente. Os IDs das tentativas e eventos são preservados para impedir repetição de recompensa; a troca normal de dia continua controlando as novas tentativas. Partidas atravessando a virada não podem receber bônus da campanha anterior na nova temporada.

O Perfil mostra temporadas disputadas (com pelo menos uma resposta oficial), melhor posição, maior liga, títulos Diamante, Top 3, Top 10, medalhas e a última campanha encerrada. Top 3 exige sala com ao menos seis e pontos positivos; oferece uma moldura dourada no avatar. Campanhas sem participação são registradas, mas não contam como temporadas disputadas. Todas as recompensas competitivas são simbólicas, sem XP extra.

### Como testar sem alterar seu perfil

Em **Admin → Simular ligas e encerramento**, há 30 participantes fictícios, separados do armazenamento do seu perfil. Escolha uma liga, acrescente 200 pontos fictícios para mudar a posição e simule o fim da temporada. Confira promoção/rebaixamento, pontos zerados, medalhas e histórico. Reiniciar simulação afeta apenas essa demonstração. Os dados da demonstração não persistem ao recarregar.

A V1.5 não publica no GitHub, Vercel ou Firebase. Antes da produção serão necessários cálculo competitivo confiável no servidor, controle de concorrência de salas/encerramentos, regras de acesso e execução agendada. Não foram incluídos rankings de turma/instituição, desafios de 24 horas, temporadas paralelas ou premiações acadêmicas.


## Integração de produção — V1.5

O build de produção agora usa Firebase e API Vercel. A prévia fictícia continua somente no desenvolvimento padrão. As observações anteriores sobre integração pendente são históricas e foram substituídas pelo README atual. O simulador de ligas e o botão de reset ficam restritos à prévia local.
