import { EXTRA_MISSIONS, EXTRA_ACHIEVEMENTS } from './challenges.js';
import { AREAS_ADMINISTRACAO } from './questions.js';
import { getPeriods } from './periods.js';

// Tabela Oficial de Conquistas Permanentes + Secretas
export const CONQUISTAS_SISTEMA = [
  // 📚 Participação
  { id: 'part_1', cat: 'Participação', nome: 'Primeiro Passo', desc: 'Responder 10 questões no total', icone: '🎯', xp: 30, secreta: false, checar: (u) => (u.questoesRespondidas || 0) >= 10 },
  { id: 'part_2', cat: 'Participação', nome: 'Participante', desc: 'Completar 3 quizzes no total', icone: '📚', xp: 50, secreta: false, checar: (u) => (u.quizzesRealizados || 0) >= 3 },
  { id: 'part_3', cat: 'Participação', nome: 'Ativo', desc: 'Completar 6 quizzes no total', icone: '⚡', secreta: false, xp: 75, checar: (u) => (u.quizzesRealizados || 0) >= 6 },
  { id: 'part_4', cat: 'Participação', nome: 'Dedicado', desc: 'Completar 10 quizzes no total', icone: '🔥', secreta: false, xp: 100, checar: (u) => (u.quizzesRealizados || 0) >= 10 },

  // 🎯 Desempenho Geral
  { id: 'des_1', cat: 'Desempenho', nome: 'Primeiro Acerto', desc: 'Acertar 1 questão no total', icone: '✅', xp: 20, secreta: false, checar: (u) => (u.questoesAcertadas || 0) >= 1 },
  { id: 'des_2', cat: 'Desempenho', nome: 'Conhecedor', desc: '25 acertos no total', icone: '🧠', xp: 50, secreta: false, checar: (u) => (u.questoesAcertadas || 0) >= 25 },
  { id: 'des_3', cat: 'Desempenho', nome: 'Bom Desempenho', desc: '50 acertos no total', icone: '🌟', xp: 75, secreta: false, checar: (u) => (u.questoesAcertadas || 0) >= 50 },
  { id: 'des_4', cat: 'Desempenho', nome: 'Especialista', desc: '100 acertos no total', icone: '🥇', xp: 150, secreta: false, checar: (u) => (u.questoesAcertadas || 0) >= 100 },
  { id: 'des_5', cat: 'Desempenho', nome: 'Mestre do Quiz', desc: '150 acertos no total', icone: '👑', xp: 250, secreta: false, checar: (u) => (u.questoesAcertadas || 0) >= 150 },

  // 🔥 Desempenho no Quiz (Sessão Única)
  { id: 'quiz_1', cat: 'Quiz', nome: 'Quiz Completo', desc: 'Finalizar um bloco de 10', icone: '🏁', xp: 20, secreta: false, checar: (_, acertosQuiz) => acertosQuiz >= 0 },
  { id: 'quiz_2', cat: 'Quiz', nome: 'Mão Cheia', desc: 'Acertar 5/10 em um quiz', icone: '✋', xp: 30, secreta: false, checar: (_, acertosQuiz) => acertosQuiz >= 5 },
  { id: 'quiz_3', cat: 'Quiz', nome: 'Bom Quiz', desc: 'Acertar 7/10 em um quiz', icone: '👍', xp: 50, secreta: false, checar: (_, acertosQuiz) => acertosQuiz >= 7 },
  { id: 'quiz_4', cat: 'Quiz', nome: 'Excelente', desc: 'Acertar 9/10 em um quiz', icone: '🚀', xp: 75, secreta: false, checar: (_, acertosQuiz) => acertosQuiz >= 9 },
  { id: 'quiz_5', cat: 'Quiz', nome: 'Perfeito', desc: 'Acertar 10/10 em um quiz', icone: '💯', xp: 100, secreta: false, checar: (_, acertosQuiz) => acertosQuiz === 10 },

  // 🏅 Categorias / Disciplinas
  { id: 'cat_1', cat: 'Categorias', nome: 'Explorador', desc: 'Responder ≥10 questões em 3 categorias', icone: '🗺️', xp: 50, secreta: false, checar: (u) => Object.keys(u.categoriasRespondidas || {}).filter(k => u.categoriasRespondidas[k] >= 10).length >= 3 },
  { id: 'cat_2', cat: 'Categorias', nome: 'Multidisciplinar', desc: 'Responder questões em 5 categorias', icone: '🧩', xp: 100, secreta: false, checar: (u) => Object.keys(u.categoriasRespondidas || {}).length >= 5 },
  { id: 'cat_3', cat: 'Categorias', nome: 'Generalista', desc: `Responder questões nas ${AREAS_ADMINISTRACAO.length} categorias`, icone: '🎓', xp: 200, secreta: false, checar: (u) => AREAS_ADMINISTRACAO.every(area => (u.categoriasRespondidas?.[area] || 0) > 0) },

  // 🔒 Conquistas Secretas (Ocultas até desbloquear)
  { id: 'sec_1', cat: 'Secreta', nome: 'Velocista ADM', desc: 'Respondeu e acertou uma questão em menos de 5s', icone: '⚡', xp: 100, secreta: true, checar: (_, __, tempoRestante) => tempoRestante > 55 },
  { id: 'sec_2', cat: 'Secreta', nome: 'Perfeição Absoluta', desc: 'Concluiu um quiz com 100% sem cometer erros', icone: '💎', xp: 200, secreta: true, checar: (_, acertosQuiz) => acertosQuiz === 10 },
  { id: 'sec_3', cat: 'Secreta', nome: 'Coruja da Madrugada', desc: 'Estudou e concluiu um quiz no turno da noite/madrugada', icone: '🦉', xp: 80, secreta: true, checar: (_, acertosQuiz) => { const h = getPeriods().hour; return acertosQuiz >= 0 && (h >= 22 || h < 4); } },
  ...EXTRA_ACHIEVEMENTS
];

// Three daily tracks: practice, learning and a rotating category. Refreshing never rerolls them.
export const DEFAULT_MISSIONS = [
  { id:'dia_1', tipo:'Diária', nome:'Dez por dia', desc:'Responda 10 questões diferentes hoje', alvo:10, xp:30, progresso:u=>u.questoesRespondidasHoje?.length || 0 },
  { id:'dia_2', tipo:'Diária', nome:'Cinco acertos', desc:'Acerte 5 questões diferentes hoje', alvo:5, xp:30, progresso:u=>u.progressoMissoes?.acertosHoje || 0 },
  { id:'dia_3', tipo:'Diária', nome:'Explore', desc:'Responda em 2 categorias hoje', alvo:2, xp:30, progresso:u=>u.categoriasHoje?.length || 0 },
  { id:'dia_4', tipo:'Diária', nome:'Uma partida', desc:'Complete 1 partida de 10 questões', alvo:1, xp:30, progresso:u=>u.progressoMissoes?.quizzesHoje || 0 },
  { id:'dia_5', tipo:'Diária', nome:'Desafio diário', desc:'Acerte 3 questões difíceis ou especialistas diferentes', alvo:3, xp:40, progresso:u=>u.dificeisHoje || 0 },
  { id:'sem_1', tipo:'Semanal', nome:'Ritmo semanal', desc:'Responda 50 questões na semana (repetições no mesmo dia não contam)', alvo:50, xp:150, progresso:u=>u.respostasSemana || 0 },
  { id:'sem_2', tipo:'Semanal', nome:'Novos horizontes', desc:'Responda em 4 categorias na semana', alvo:4, xp:150, progresso:u=>u.categoriasSemana?.length || 0 },
  { id:'sem_3', tipo:'Semanal', nome:'Precisão semanal', desc:'Tenha 80% de acertos em pelo menos 30 questões da semana', alvo:30, xp:200, progresso:u=>(u.progressoMissoes?.acertosSemana || 0)/Math.max(1,u.respostasSemana || 0)>=0.8 ? u.respostasSemana : 0 },
  { id:'men_1', tipo:'Mensal', nome:'Duzentas questões', desc:'Responda 200 questões no mês (repetições no mesmo dia não contam)', alvo:200, xp:500, progresso:u=>u.questoesRespondidasMes || 0 },
  { id:'men_2', tipo:'Mensal', nome:'Visão completa', desc:`Responda nas ${AREAS_ADMINISTRACAO.length} categorias no mês`, alvo:AREAS_ADMINISTRACAO.length, xp:500, progresso:u=>AREAS_ADMINISTRACAO.filter(area=>u.categoriasMes?.includes(area)).length },
  { id:'men_3', tipo:'Mensal', nome:'Presença constante', desc:'Estude em 15 dias do mês: 5 questões diferentes por dia', alvo:15, xp:700, progresso:u=>u.diasAtivosMes?.length || 0 },
  { id:'men_4', tipo:'Mensal', nome:'Vinte partidas', desc:'Complete 20 partidas de 10 questões no mês', alvo:20, xp:600, progresso:u=>u.quizzesRealizadosMes || 0 },
  ...EXTRA_MISSIONS
];
export function activeMissions(now = new Date()) {
  const day = Math.floor(Date.parse(getPeriods(now).day+'T12:00:00Z')/86400000);
  const general = DEFAULT_MISSIONS.filter(m=>/^dia_[1-5]$/.test(m.id));
  const learning = DEFAULT_MISSIONS.filter(m=>m.tipo==='Diária' && !/^dia_[1-5]$/.test(m.id) && !m.id.startsWith('dia_area_'));
  const areas = DEFAULT_MISSIONS.filter(m=>m.id.startsWith('dia_area_'));
  const selected = [general[day % general.length].id, learning[day % learning.length].id, areas[day % areas.length].id];
  return DEFAULT_MISSIONS.filter(m=>m.tipo!=='Diária' || selected.includes(m.id));
}
export const QUESTION_XP = { 'Fácil':10, 'Médio':20, 'Difícil':30, 'Especialista':50 };
export const COMBO_XP = {3:10, 5:20, 10:30};
export const performanceBonus = correct => correct===10 ? 60 : correct>=9 ? 40 : correct>=7 ? 20 : 0;
export const CAREER = [
  {nome:'Aprendiz',xp:0}, {nome:'Assistente',xp:500}, {nome:'Analista',xp:1500},
  {nome:'Supervisor',xp:3000}, {nome:'Coordenador',xp:5000}, {nome:'Gerente',xp:8000}, {nome:'Diretor',xp:12000}
];
export function careerProgress(xp=0) {
  const index = CAREER.findLastIndex(level=>xp>=level.xp);
  const current = CAREER[Math.max(0,index)], next = CAREER[index+1];
  return {...current, level:Math.max(0,index)+1, next, percent:next ? Math.max(0,Math.min(100,(xp-current.xp)/(next.xp-current.xp)*100)) : 100};
}
export function dailyStreak(data, now=new Date()) {
  const day = getPeriods(now).day;
  const gap=(Date.parse(day)-Date.parse(data.ultimoDiaSequencia))/86400000;
  return gap<=1 ? data.sequenciaDias || 0 : 0;
}
