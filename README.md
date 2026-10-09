# Quiz ADM — V1.5

Aplicativo pedagógico de Administração com React, Vite e Firebase, hospedado na Vercel. Firebase Authentication identifica os alunos; Firestore guarda os dados; a API da Vercel calcula pontuação e processa temporadas.

## Desenvolvimento e validação

Use Node.js 22 ou 24 nesta pasta, que contém o package-lock.json. A pasta superior adm_quiz é legada.

    npm ci
    npm run dev
    npm test
    npm run build

O desenvolvimento padrão utiliza o perfil fictício e o armazenamento local. O build de produção sempre utiliza Firebase real. VITE_REAL_BACKEND=true permite testar login real durante o desenvolvimento; nesse caso a API também deve estar disponível pelo servidor local da Vercel. O Firebase de produção nunca recebe o progresso do perfil fictício.

## Estudo e pontuação

Questões fáceis/médias/difíceis/especialistas rendem 10/20/30/50 XP. Verdadeiro/falso tem 30 segundos e desconta 3 XP a cada dez segundos; os outros formatos têm 60 segundos. A primeira resposta distinta do dia avança estatísticas. Repetição e revisão não rendem XP; múltiplas respostas admitem metade do XP na segunda tentativa correta após um primeiro erro, uma vez ao dia.

Combos de 3/5/10 acertos rendem 10/20/30 XP, cada marco uma vez por partida. Desempenho de 7–8/9/10 acertos rende 20/40/60 XP, somente em partidas completas de dez questões inéditas do dia. Missões, conquistas, carreira e sequência usam XP permanente.

## Ligas e temporadas

Temporadas mensais seguem America/Sao_Paulo. Bronze, Prata, Ouro e Diamante usam salas de até 30 participantes. Pontos competitivos vêm de acertos elegíveis e bônus de desempenho; missões, conquistas, combos, sequência e novas tentativas não aumentam o ranking.

Salas de 30 promovem os cinco primeiros e rebaixam os cinco últimos; Bronze não rebaixa. Em salas menores, as vagas são proporcionais; menos de seis participantes não gera mudança de liga. Empates usam acertos e UID estável. Novos cadastros depois de 75% do mês ficam em classificação para o mês seguinte.

O servidor registra as campanhas antes de renovar pontos, missões e salas. XP permanente, conquistas e histórico são preservados. A Vercel agenda o processamento no primeiro dia do mês às 03h UTC; o plano Hobby pode executar dentro dessa hora. Todo acesso autenticado também verifica a virada, garantindo o corte pelo horário do servidor.

## Banco de questões

O conjunto versionado contém 1.680 questões conceituais ativas nas 12 categorias: 60 múltiplas escolhas, 40 verdadeiro/falso e 40 múltiplas respostas por categoria. Cada formato mantém 50% fáceis, 30% médias e 20% difíceis. [Currículo, manutenção e critérios editoriais](content/bank/README.md).

O banco anterior permanece arquivado para preservar IDs e histórico. O balanceamento não altera perfis, XP, rankings nem conquistas. `ativo: false` e o índice de enunciados aposentados impedem que cópias antigas retornem ao quiz. Novas questões manuais continuam permitidas; sua inclusão altera a distribuição planejada.

Use `npm run bank:build`, `npm run bank:check` e `npm run bank:audit` para gerar, conferir e auditar o banco. A publicação do banco no Firestore usa `node scripts/publish-balanced-bank.mjs --credential <arquivo-protegido>` em modo de simulação; `--apply` salva backup e aplica as mudanças. Credenciais e backups nunca devem ser versionados.

O importador aceita um array JSON com disciplina, dificuldade, tipo, pergunta, alternativas, explicacao e formato. multipla usa cinco opções e respostaCorreta (0–4); vf usa Verdadeiro/Falso nessa ordem e respostaCorreta (0–1); multipla_resposta usa quatro opções, respostasCorretas (2–4 índices distintos) e explicacoesAlternativas (quatro textos). fonte HTTPS e dataReferencia AAAA-MM-DD são opcionais.

## Publicação e acesso

Projeto Firebase: quiz-administracao, banco Standard (default), região southamerica-east1. O administrador existente é autorizado pelo UID, não por um campo enviado pelo navegador. As regras deixam perfis privados, permitem ler perguntas e projeções públicas após login e reservam gravações de progresso e competição ao backend.

Configure na Vercel as variáveis de servidor FIREBASE_SERVICE_ACCOUNT_JSON e CRON_SECRET, ambas como secrets. A conta de serviço usa roles/datastore.user e roles/firebaseauth.viewer. Nunca use prefixo VITE_ para credenciais privadas. .local, .vercel, backups e arquivos .env ficam fora do Git.

Antes de publicar, rode testes e build, valide as regras, preserve um backup, importe questões sem duplicação e teste o deployment em staging. Depois publique firestore.rules e promova o deployment. Firebase e Vercel são publicações separadas.

O backend aplica gabaritos do banco, eventos idempotentes e relógio do servidor. A interface fornece feedback com gabaritos e informa o tempo de resposta: a aplicação não representa uma avaliação supervisionada contra toda forma de fraude.

As regras são um protótipo validado por testes de acesso e precisam ser reavaliadas ao mudar coleções, privilégios ou o modo de avaliação.
