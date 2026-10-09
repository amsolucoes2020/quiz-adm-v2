import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initialProgress, resetPeriods, newSeasonData } from '../src/domain/periods.js';
import { applyQuizEvent } from '../src/domain/progress.js';
import { activeMissions, DEFAULT_MISSIONS, careerProgress, dailyStreak } from '../src/domain/gamification.js';
import { normalizeQuestion, prepareQuestions, validateImport, AREAS_ADMINISTRACAO } from '../src/domain/questions.js';
const now=new Date('2026-09-22T15:00:00Z');
const q={id:'q',disciplina:AREAS_ADMINISTRACAO[0],dificuldade:'Médio',respostaCorreta:0};
const answer=(i,extra={})=>({id:`game:answer:${i}`,type:'answer',question:{...q,id:`q${i}`},selected:0,remaining:30,review:false,...extra});
function play(input,correct=10,date=now,prefix='game') {
 let data=input;
 for(let i=0;i<10;i++) data=applyQuizEvent(data,answer(i,{id:`${prefix}:answer:${i}`,selected:i<correct?0:1}),date).data;
 return applyQuizEvent(data,{id:`${prefix}:finish`,type:'finish',total:10,correctCount:correct,review:false},date);
}
test('fixed XP is independent of time and has no consecutive-answer multiplier',()=>{
 for(const [difficulty,xp] of [['Fácil',10],['Médio',20],['Difícil',30],['Especialista',50]]) {
  for(const remaining of [1,30,60]) {
   const r=applyQuizEvent(initialProgress('local',now),answer(1,{question:{...q,dificuldade:difficulty},remaining,streak:4}),now);
   assert.equal(r.xp,xp);
  }
 }
});
test('performance tiers are exclusive and use recorded answers rather than claimed accuracy',()=>{
 for(const [correct,xp] of [[0,0],[6,0],[7,20],[8,20],[9,40],[10,60]]) {
  const r=play(initialProgress('local',now),correct); assert.equal(r.xp,xp);
 }
 let data=play(initialProgress('local',now),6).data;
 assert.equal(applyQuizEvent(data,{id:'forged:finish',type:'finish',total:10,correctCount:10},now).xp,0);
});
test('repeated sessions and reviews cannot farm questions, missions or finish bonuses',()=>{
 const first=play(initialProgress('local',now));
 const second=play(first.data,10,now,'repeat');
 assert.equal(second.data.pontuacaoGeral,first.data.pontuacaoGeral);
 assert.equal(second.data.quizzesRealizados,1);
 assert.equal(second.data.questoesRespondidas,10);
 const review=applyQuizEvent(second.data,answer(99,{review:true}),now);
 assert.equal(review.xp,0); assert.equal(review.awardXp,0);
 assert.equal(review.data.questoesRespondidasHoje.length,10);
});
test('three daily missions stay stable during the day, rotate and exclude other daily awards',()=>{
 const today=activeMissions(now).filter(m=>m.tipo==='Diária');
 assert.equal(today.length,3);
 assert.deepEqual(activeMissions(now),activeMissions(new Date('2026-09-23T02:59:00Z')));
 assert.notDeepEqual(today.map(m=>m.id),activeMissions(new Date('2026-09-23T03:00:00Z')).filter(m=>m.tipo==='Diária').map(m=>m.id));
 const result=play(initialProgress('local',now));
 assert.ok(result.data.missoesConcluidas.filter(id=>id.startsWith('dia')).every(id=>today.some(m=>m.id===id)));
});
test('weekly accuracy needs both sample size and 80 percent, awarded only once',()=>{
 const mission=DEFAULT_MISSIONS.find(m=>m.id==='sem_3');
 assert.equal(mission.progresso({respostasSemana:29,progressoMissoes:{acertosSemana:29}}),29);
 assert.equal(mission.progresso({respostasSemana:30,progressoMissoes:{acertosSemana:23}}),0);
 assert.equal(mission.progresso({respostasSemana:30,progressoMissoes:{acertosSemana:24}}),30);
});
test('daily, weekly and monthly category progress reset independently',()=>{
 const data={...initialProgress('local',now),categoriasHoje:['a'],categoriasSemana:['a'],categoriasMes:['a'],respostasSemana:12,dificeisHoje:2,missoesConcluidas:['dia_1','sem_1','men_1']};
 const tomorrow=resetPeriods(data,DEFAULT_MISSIONS,new Date('2026-09-23T15:00:00Z'));
 assert.deepEqual(tomorrow.categoriasHoje,[]);assert.deepEqual(tomorrow.categoriasSemana,['a']);assert.equal(tomorrow.respostasSemana,12);
 const monday=resetPeriods(data,DEFAULT_MISSIONS,new Date('2026-09-28T15:00:00Z'));
 assert.deepEqual(monday.categoriasSemana,[]);assert.deepEqual(monday.categoriasMes,['a']);assert.equal(monday.respostasSemana,0);
 const october=resetPeriods(data,DEFAULT_MISSIONS,new Date('2026-10-01T15:00:00Z'));
 assert.deepEqual(october.categoriasMes,[]);assert.ok(!october.missoesConcluidas.includes('men_1'));
});
test('streak counts once per active day, crosses month boundary, resets after a gap and never repeats milestone prizes',()=>{
 let data=initialProgress('local',now);
 for(let day=0;day<30;day++) {
  const date=new Date(now.getTime()+day*86400000);
  for(let i=0;i<5;i++) data=applyQuizEvent(data,answer(i,{id:`day${day}:answer:${i}`}),date).data;
  assert.equal(data.sequenciaDias,day+1);
  data=applyQuizEvent(data,answer(6,{id:`day${day}:answer:6`}),date).data;
  assert.equal(data.sequenciaDias,day+1);
 }
 assert.deepEqual(data.premiosSequencia,[3,7,14,30]);
 assert.equal(data.maiorSequenciaDias,30);
 assert.equal(dailyStreak(data,new Date(now.getTime()+31*86400000)),0);
 for(let day=32;day<35;day++) {
  const date=new Date(now.getTime()+day*86400000);
  for(let i=0;i<5;i++) data=applyQuizEvent(data,answer(i,{id:`day${day}:answer:${i}`}),date).data;
 }
 assert.equal(data.sequenciaDias,3);assert.deepEqual(data.premiosSequencia,[3,7,14,30]);
 assert.equal(data.maiorSequenciaDias,30);
});
test('true false bank is valid, balanced and keeps labels in fixed order',()=>{
 const bank=JSON.parse(readFileSync(new URL('../src/data/trueFalse.json',import.meta.url),'utf8'));
 const result=validateImport(bank); assert.equal(result.questions.length,360);
 for(const area of AREAS_ADMINISTRACAO) assert.equal(bank.filter(q=>q.disciplina===area).length,30);
 assert.equal(bank.filter(q=>q.respostaCorreta===0).length,180);
 const prepared=prepareQuestions(bank,{},20);
 for(const question of prepared) assert.deepEqual(question.alternativas,['Verdadeiro','Falso']);
 assert.throws(()=>normalizeQuestion({...bank[0],respostaCorreta:2}));
 assert.throws(()=>normalizeQuestion({...bank[0],alternativas:['Sim','Não']}));
});
test('true false timeout and speed award use thirty-second clock',()=>{
 const base=initialProgress('local',now);
 const question={...q,formato:'vf'};
 assert.equal(applyQuizEvent(base,answer(0,{question,remaining:0}),now).correct,false);
 assert.ok(applyQuizEvent(base,answer(0,{question,remaining:26}),now).achievements.includes('sec_1'));
 assert.ok(!applyQuizEvent(base,answer(0,{question,remaining:25}),now).achievements.includes('sec_1'));
});
test('career boundaries and capped final level use lifetime XP across seasons',()=>{
 for(const [xp,level] of [[0,1],[499,1],[500,2],[1499,2],[1500,3],[3000,4],[5000,5],[8000,6],[12000,7],[99999,7]]) assert.equal(careerProgress(xp).level,level);
 assert.equal(careerProgress(12000).percent,100);assert.equal(careerProgress(12000).next,undefined);
 const data=newSeasonData({...initialProgress('local',now),pontuacaoGeral:8000},'next');
 assert.equal(careerProgress(data.pontuacaoGeral).nome,'Gerente');
});

test('true false loses 3 XP at each ten-second boundary, timeout earns zero',()=>{
 for(const [remaining,expected] of [[30,10],[21,10],[20,7],[11,7],[10,4],[1,4],[0,0]]) {
  const result=applyQuizEvent(initialProgress('local',now),answer(0,{question:{...q,formato:'vf',dificuldade:'Fácil'},remaining}),now);
  assert.equal(result.xp,expected,`remaining ${remaining}`);
 }
 const wrong=applyQuizEvent(initialProgress('local',now),answer(0,{question:{...q,formato:'vf'},remaining:10,selected:1}),now);
 assert.equal(wrong.xp,0);
});
