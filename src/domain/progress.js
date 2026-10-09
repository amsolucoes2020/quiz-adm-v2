import { recordLearningAnswer, recordLearningFinish } from './learning.js';
import { gradeAnswer } from './questions.js';
import { getPeriods, resetPeriods } from './periods.js';
import { CONQUISTAS_SISTEMA, DEFAULT_MISSIONS, activeMissions, QUESTION_XP, COMBO_XP, performanceBonus } from './gamification.js';

export function applyQuizEvent(input, event, now = new Date()) {
  let data = resetPeriods(input, DEFAULT_MISSIONS, now);
  const previous = (data.recentQuizEvents || []).find(e => e.id === event.id);
  if (previous) return { ...previous, data };
  const periods = getPeriods(now);
  let xp = 0, comboXp = 0, bonus = '', correct = false, streak = 0;
  let achievementScore = -1, speed = 0;
  let competitivePoints = 0;
  if(data.competition) data.competition={...data.competition};
  const add = (key, amount = 1) => { data[key] = (data[key] || 0) + amount; };
  if (event.type === 'answer') {
    const q = event.question;
    correct = gradeAnswer(q,event.selected,event.remaining).correct;
    const answered = data.questoesRespondidasHoje || [];
    const repeated = answered.includes(q.id);
    const attempt = data.multiAttempts?.[q.id];
    const retryReward = q.formato==='multipla_resposta' && correct && attempt?.count===1 && !attempt.correct;
    if(q.formato==='multipla_resposta' && (!event.review || attempt)) {
      data.multiAttempts = {...data.multiAttempts,[q.id]:{count:(attempt?.count||0)+1,correct:!!attempt?.correct||correct}};
    }
    if (!event.review) data.questoesRespondidasHoje = [...new Set([...answered, q.id])];
    const session = event.id.split(':answer:')[0];
    const current = data.partidaAtual?.id === session ? structuredClone(data.partidaAtual) : {id:session,answers:[],correct:0,eligible:true,seasonId:data.competition?.seasonId};
    streak = current.streak || 0;
    current.modes = [...new Set([...(current.modes || []),q.formato || 'multipla'])];
    current.answers.push(q.id); current.correct += correct ? 1 : 0;
    current.eligible = current.eligible && !repeated && !event.review;
    data.partidaAtual = current;
    data.questoesErradasHoje = correct
      ? (data.questoesErradasHoje || []).filter(id => id !== q.id)
      : [...new Set([...(data.questoesErradasHoje || []), q.id])];
    if (!event.review && !repeated) {
    if(data.competition) {
      data.competition.answers++;
      if(correct) data.competition.correct++;
    }
    recordLearningAnswer(data, q, correct, periods);
    add('respostasSemana');
    for (const key of ['categoriasHoje','categoriasSemana','categoriasMes']) data[key] = [...new Set([...(data[key] || []),q.disciplina])];
    add('questoesRespondidas'); add('questoesRespondidasMes'); add('respostasNoDia');
    data.categoriasRespondidas = { ...data.categoriasRespondidas,
      [q.disciplina]: (data.categoriasRespondidas?.[q.disciplina] || 0) + 1 };
    // An active day requires five distinct questions, not merely opening the app.
    if (data.questoesRespondidasHoje.length >= 5) {
      data.diasAtivosMes = [...new Set([...(data.diasAtivosMes || []), periods.day])];
    }
    }
    if (correct) {
      if (!event.review && !repeated) {
      add('questoesAcertadas'); add('questoesAcertadasMes');
      data.progressoMissoes.acertosHoje++;
      data.progressoMissoes.acertosSemana++;
      if (['Difícil','Especialista'].includes(q.dificuldade)) add('dificeisHoje');
      }
      speed = !event.review && !repeated ? 60 - ((q.formato === 'vf' ? 30 : 60) - event.remaining) : 0;
      xp = QUESTION_XP[q.dificuldade] || 0;
      if (q.formato === 'vf') {
        const penalty = Math.floor(Math.max(0, 30 - event.remaining) / 10) * 3;
        xp = Math.max(0, xp - penalty);
        if (penalty) bonus = `Tempo de resposta: −${penalty} XP nesta questão.`;
      }
      if (event.review || repeated) { xp = retryReward ? (QUESTION_XP[q.dificuldade] || 0)/2 : 0; streak = 0; bonus = retryReward ? `Segunda tentativa correta! +${xp} XP` : 'Prática sem XP adicional.'; }
      else { streak++; data.maiorSequencia = Math.max(data.maiorSequencia || 0, streak); }
      if(!event.review&&!repeated) competitivePoints=xp;
    } else streak = 0;
    current.streak = streak;
    const comboReward = COMBO_XP[streak];
    // Keep claimed milestones after errors; only a new quiz starts a new ledger.
    if (comboReward && !event.review && !repeated && !current.finished && current.answers.length <= 10
        && !(current.rewardedCombos || []).includes(streak)) {
      current.rewardedCombos = [...(current.rewardedCombos || []), streak];
      comboXp = comboReward;
      xp += comboXp;
      bonus = `🔥 Combo de ${streak} acertos! +${comboXp} XP`;
    }
  } else if (event.type === 'finish') {
    const session = data.partidaAtual;
    const valid = session?.id === event.id.split(':finish')[0] && session.seasonId===data.competition?.seasonId && !session.finished && session.eligible && session.answers.length === 10 && new Set(session.answers).size === 10;
    if (!event.review && event.total === 10 && valid) {
      data.partidaAtual = {...session, finished:true};
      recordLearningFinish(data, session);
      add('quizzesRealizados'); add('quizzesRealizadosMes');
      data.progressoMissoes.quizzesHoje++;
      data.progressoMissoes.quizzesSemana++;
      xp = performanceBonus(session.correct);
      competitivePoints=xp;
      if(data.competition) data.competition.quizzes++;
      bonus = xp ? `Desempenho: ${session.correct}/10! +${xp} XP` : 'Bônus de desempenho a partir de 7/10.';
      achievementScore = session.correct;
      if (session.correct === 10) {
        data.progressoMissoes.quizzesPerfeitosSemana++;
        data.progressoMissoes.quizzesPerfeitosMes++;
      }
    } else bonus = 'Sessão de prática concluída. Partidas com revisão, repetição ou menos de 10 questões não rendem bônus nem avançam missões de partidas.';
  } else throw new Error('Evento de quiz inválido.');
  if ((data.questoesRespondidasHoje || []).length >= 5 && data.ultimoDiaSequencia !== periods.day && !event.review) {
    const gap = (Date.parse(periods.day)-Date.parse(data.ultimoDiaSequencia))/86400000;
    data.sequenciaDias = gap === 1 ? (data.sequenciaDias || 0)+1 : 1;
    data.ultimoDiaSequencia = periods.day;
    data.maiorSequenciaDias = Math.max(data.maiorSequenciaDias || 0, data.sequenciaDias);
    const reward = {3:20,7:50,14:100,30:200}[data.sequenciaDias];
    if (reward && !(data.premiosSequencia || []).includes(data.sequenciaDias)) {
      data.premiosSequencia = [...(data.premiosSequencia || []),data.sequenciaDias];
      xp += reward; bonus += ` 🔥 ${data.sequenciaDias} dias de estudo! +${reward} XP`;
    }
  }
  add('pontuacaoGeral', xp); add('xpTemporada', xp);
  const achievements = [], missions = [];
  let awardXp = 0;
  data.conquistasDesbloqueadas = [...(data.conquistasDesbloqueadas || [])];
  for (const achievement of CONQUISTAS_SISTEMA) {
    const eligible = achievement.id === 'sec_3'
      ? achievementScore >= 0 && (periods.hour >= 22 || periods.hour < 4)
      : achievement.checar(data, achievementScore, speed);
    if (!data.conquistasDesbloqueadas.includes(achievement.id) && eligible) {
      achievements.push(achievement.id);
      data.conquistasDesbloqueadas.push(achievement.id);
      awardXp += achievement.xp;
    }
  }
  add('pontuacaoGeral', awardXp); add('xpTemporada', awardXp);
  // Award only the missions selected for this day and the current calendar periods.
  let unlocked;
  do {
    unlocked = false;
    for (const mission of activeMissions(now)) {
      if (!data.missoesConcluidas.includes(mission.id) && mission.progresso(data) >= mission.alvo) {
        data.missoesConcluidas.push(mission.id); missions.push(mission.id);
        add('pontuacaoGeral', mission.xp); add('xpTemporada', mission.xp);
        awardXp += mission.xp; unlocked = true;
      }
    }
  } while (unlocked);
  if(data.competition?.status==='active') data.competition.points+=competitivePoints;
  else competitivePoints=0;
  const result = { id: event.id, xp, comboXp, competitivePoints, awardXp, bonus, correct, streak, achievements, missions };
  data.recentQuizEvents = [...(data.recentQuizEvents || []).slice(-63), result];
  return { ...result, data };
}
