// Detailed tracking starts when this version is installed; legacy totals remain intact.
export const emptyMetrics = () => ({answers:0,correct:0,hardCorrect:0,recovered:0,quizzes:0,goodQuizzes:0,perfect:0,
  modes:{}, modeCorrect:{}, quizModes:{}, categories:{}, activeDays:[]});
export function resetLearning(input, periods) {
  const source = structuredClone(input || {});
  const result = {...source, total:{...emptyMetrics(),...source.total}, mastery:source.mastery || {}, mastered:source.mastered || [], pending:source.pending || []};
  for (const period of ['day','week','month']) {
    result[period] = source[period+'Key'] === periods[period] ? {...emptyMetrics(),...source[period]} : emptyMetrics();
    result[period+'Key'] = periods[period];
  }
  return result;
}
export function recordLearningAnswer(data, question, correct, periods) {
  const learning = data.learning;
  const mode = question.formato || 'multipla';
  const firstMastery = correct && !learning.mastered.includes(question.id);
  const recovered = firstMastery && learning.pending.includes(question.id);
  for (const scope of ['total','day','week','month']) {
    const m=learning[scope];
    m.answers++; m.modes[mode]=(m.modes[mode] || 0)+1;
    m.categories[question.disciplina]=(m.categories[question.disciplina] || 0)+1;
    if(correct) {
      m.correct++; m.modeCorrect[mode]=(m.modeCorrect[mode] || 0)+1;
      if(['Difícil','Especialista'].includes(question.dificuldade)) m.hardCorrect++;
    }
    if(recovered) m.recovered++;
    if(data.questoesRespondidasHoje.length>=5 && !m.activeDays.includes(periods.day)) m.activeDays.push(periods.day);
  }
  if(firstMastery) {
    learning.mastered.push(question.id);
    learning.mastery[question.disciplina]=(learning.mastery[question.disciplina] || 0)+1;
    learning.pending=learning.pending.filter(id=>id!==question.id);
  } else if(!correct && !learning.mastered.includes(question.id) && !learning.pending.includes(question.id)) learning.pending.push(question.id);
}
export function recordLearningFinish(data, session) {
  for(const scope of ['total','day','week','month']) {
    const m=data.learning[scope];m.quizzes++;
    if(session.correct>=8) m.goodQuizzes++;
    if(session.correct===10) m.perfect++;
    if(session.modes?.length===1) m.quizModes[session.modes[0]]=(m.quizModes[session.modes[0]] || 0)+1;
  }
}
