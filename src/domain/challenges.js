import { AREAS_ADMINISTRACAO } from './questions.js';
const metric=(scope,key)=>u=>u.learning?.[scope]?.[key] || 0;
const mode=(scope,format,key='modes')=>u=>u.learning?.[scope]?.[key]?.[format] || 0;
const days=scope=>u=>u.learning?.[scope]?.activeDays?.length || 0;
const mission=(id,tipo,nome,desc,alvo,xp,progresso)=>({id,tipo,nome,desc,alvo,xp,progresso});
const achievement=(id,cat,nome,desc,alvo,xp,icone,progresso)=>({id,cat,nome,desc,alvo,xp,icone,progresso,secreta:false,checar:u=>progresso(u)>=alvo});
export const EXTRA_MISSIONS = [
  mission('dia_multi','Diária','Conjunto completo','Acerte 3 questões de múltiplas respostas na primeira tentativa do dia',3,30,mode('day','multipla_resposta','modeCorrect')),
  mission('sem_multi','Semanal','Olhar completo','Acerte 10 questões de múltiplas respostas na primeira tentativa do dia',10,100,mode('week','multipla_resposta','modeCorrect')),
  mission('men_multi','Mensal','Precisão nos conjuntos','Tenha 80% de acertos em pelo menos 20 questões de múltiplas respostas no mês (primeiras tentativas do dia)',20,200,u=>mode('month','multipla_resposta','modeCorrect')(u)/Math.max(1,mode('month','multipla_resposta')(u))>=0.8?mode('month','multipla_resposta')(u):0),
  mission('dia_vf','Diária','Verdade em foco','Acerte 5 questões de verdadeiro/falso hoje',5,30,mode('day','vf','modeCorrect')),
  mission('dia_mc','Diária','Escolha consciente','Acerte 5 questões de múltipla escolha hoje',5,30,mode('day','multipla','modeCorrect')),
  mission('dia_duo','Diária','Dois jeitos de aprender','Responda 5 questões em cada modo hoje',5,40,u=>Math.min(mode('day','vf')(u),mode('day','multipla')(u))),
  mission('dia_precision','Diária','Partida consistente','Complete uma partida com pelo menos 8 acertos hoje',1,40,metric('day','goodQuizzes')),
  mission('dia_recovery','Diária','Aprender com o erro','Acerte 2 questões que errou em dias anteriores e nunca tinha acertado',2,30,metric('day','recovered')),
  ...AREAS_ADMINISTRACAO.map((area,i)=>mission(`dia_area_${i}`,'Diária',`Explore: ${area}`,`Responda 5 questões de ${area} hoje`,5,30,u=>u.learning?.day?.categories?.[area] || 0)),
  mission('sem_days','Semanal','Volte para aprender','Estude em 3 dias da semana (5 questões distintas por dia)',3,100,days('week')),
  mission('sem_modes','Semanal','Versatilidade','Responda 20 questões em cada modo nesta semana',20,100,u=>Math.min(mode('week','vf')(u),mode('week','multipla')(u))),
  mission('sem_hard','Semanal','Encare o desafio','Acerte 15 questões difíceis ou especialistas na semana',15,120,metric('week','hardCorrect')),
  mission('sem_quality','Semanal','Qualidade constante','Complete 3 partidas com pelo menos 8 acertos na semana',3,120,metric('week','goodQuizzes')),
  mission('sem_recovery','Semanal','Reaprendizagem','Recupere 5 questões erradas em dias anteriores, pela primeira vez',5,100,metric('week','recovered')),
  mission('men_modes','Mensal','Dupla formação','Complete 5 partidas de cada modo neste mês',5,200,u=>Math.min(mode('month','vf','quizModes')(u),mode('month','multipla','quizModes')(u))),
  mission('men_hard','Mensal','Desafios do mês','Acerte 50 questões difíceis ou especialistas neste mês',50,250,metric('month','hardCorrect')),
  mission('men_quality','Mensal','Excelência recorrente','Complete 10 partidas com pelo menos 8 acertos no mês',10,250,metric('month','goodQuizzes')),
  mission('men_recovery','Mensal','Evolução real','Recupere 15 questões erradas em dias anteriores, pela primeira vez',15,200,metric('month','recovered'))
];
export const EXTRA_ACHIEVEMENTS = [
  ...[[10,30,'Mente Analítica'],[25,60,'Detalhista'],[50,100,'Especialista em conjuntos']].map(([alvo,xp,nome])=>achievement(`multi_${alvo}`,'Modos',nome,`Acerte ${alvo} questões de múltiplas respostas na primeira tentativa do dia`,alvo,xp,'🧠',mode('total','multipla_resposta','modeCorrect'))),
  ...AREAS_ADMINISTRACAO.flatMap((area,i)=>[[5,20,'Bronze'],[15,40,'Prata'],[30,75,'Ouro']].map(([alvo,xp,tier])=>
    achievement(`mastery_${i}_${alvo}`,'Domínio por área',`${tier} · ${area}`,`Acerte ${alvo} questões diferentes de ${area} ao longo do tempo`,alvo,xp,'🏅',u=>u.learning?.mastery?.[area] || 0))),
  ...[['vf','Verdadeiro/falso'],['multipla','Múltipla escolha']].flatMap(([format,label])=>[[10,20],[50,50],[150,100]].map(([alvo,xp])=>
    achievement(`mode_${format}_${alvo}`,'Modos',`${label}: ${alvo} acertos`,`Acerte ${alvo} questões no modo ${label}`,alvo,xp,'🎮',mode('total',format,'modeCorrect')))),
  ...[[10,25],[30,60],[75,120]].map(([alvo,xp])=>achievement(`hard_${alvo}`,'Desafios',`${alvo} acertos difíceis`,`Acerte ${alvo} questões difíceis ou especialistas`,alvo,xp,'🧠',metric('total','hardCorrect'))),
  ...[3,7,14,30].map(alvo=>achievement(`streak_${alvo}`,'Constância',`${alvo} dias seguidos`,`Alcance uma sequência de ${alvo} dias de estudo`,alvo,0,'🔥',u=>u.maiorSequenciaDias || 0)),
  ...[[10,30],[30,75],[60,150]].map(([alvo,xp])=>achievement(`days_${alvo}`,'Constância',`${alvo} dias de estudo`,`Estude em ${alvo} dias diferentes, mesmo sem sequência`,alvo,xp,'📅',days('total'))),
  ...[[25,75],[50,125],[100,200]].map(([alvo,xp])=>achievement(`games_${alvo}`,'Participação',`${alvo} partidas completas`,`Complete ${alvo} partidas elegíveis de 10 questões`,alvo,xp,'🏁',u=>u.quizzesRealizados || 0)),
  ...[[5,25],[20,60],[50,120]].map(([alvo,xp])=>achievement(`recovery_${alvo}`,'Aprendizagem',`${alvo} erros superados`,`Acerte pela primeira vez ${alvo} questões erradas em dias anteriores`,alvo,xp,'🌱',metric('total','recovered')))
];
