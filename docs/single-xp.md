# XP único e ligas suspensas

O aplicativo usa `pontuacaoGeral` como saldo de XP e como critério do ranking geral. Perguntas, combos, desempenho, missões, conquistas e sequência continuam concedendo suas recompensas a esse saldo. Os antigos pontos competitivos não são somados novamente: representavam uma parte do XP já concedido.

A API de quiz usa `server/xpService.js`, sem matrícula em salas, classificação, promoção, rebaixamento ou encerramento de temporadas. O cron mensal foi removido da Vercel e o endpoint antigo de temporada informa que as ligas estão desativadas, sem escrever no banco.

Perfis antigos preservam seus campos e históricos de competição; esses registros não recebem novos pontos ou contadores. Campos antigos de XP de temporada também permanecem congelados. As missões diárias, semanais e mensais continuam usando seus próprios períodos de calendário. O XP acumulado, as conquistas e o progresso permanente não são zerados na virada do mês.

A interface não mostra ligas, temporadas nem uma segunda pontuação. O código antigo de ligas permanece isolado para uma eventual implementação futura; seus testes continuam validando a preservação histórica, mas ele não é chamado pelo aplicativo publicado.
