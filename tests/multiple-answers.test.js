import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeQuestion,prepareQuestions,gradeAnswer,validateImport} from '../src/domain/questions.js';
import {initialProgress} from '../src/domain/periods.js';
import {applyQuizEvent} from '../src/domain/progress.js';
import {upgradeLocalBank} from '../src/domain/localBank.js';
const bank=JSON.parse(readFileSync(new URL('../src/data/multipleAnswers.json',import.meta.url),'utf8'));
const now=new Date('2026-09-27T15:00:00Z');
const q={...bank[1],id:'multi-test'};
const answer=(id,selected,extra={})=>({id:`game:answer:${id}`,type:'answer',question:q,selected,remaining:30,...extra});

test('pilot has exactly ten valid conceptual questions, with only one all-correct set',()=>{
  assert.equal(bank.length,10);
  assert.equal(validateImport(bank).questions.length,10);
  assert.equal(bank.filter(q=>q.respostasCorretas.length===4).length,1);
  for(const q of bank) {
    assert.equal(q.formato,'multipla_resposta');assert.equal(q.alternativas.length,4);
    assert.match(q.pergunta,/Selecione todas as alternativas corretas/);
    assert.equal(q.explicacoesAlternativas.length,4);
  }
});
test('only the exact set earns correctness, with informative partial feedback',()=>{
  assert.equal(gradeAnswer(q,[1,0],30).correct,true);
  assert.deepEqual(gradeAnswer(q,[0],30),{correct:false,identified:1,expected:2,incorrect:0});
  for(const selected of [[],null,[0,1,2],[0,1,1],['0',1],[0,1,8]]) assert.equal(gradeAnswer(q,selected,30).correct,false);
  assert.equal(gradeAnswer(q,[0,1],0).correct,false);
});
test('normalization rejects invalid sets and missing explanations',()=>{
  for(const respostasCorretas of [[0],[0,0],[0,4],[0,1.5],['0',1]]) assert.throws(()=>normalizeQuestion({...q,respostasCorretas}));
  assert.throws(()=>normalizeQuestion({...q,explicacoesAlternativas:['a']}));
  assert.throws(()=>normalizeQuestion({...q,alternativas:['a','b','c']}));
});
test('shuffling and repeated review preserve every correct option and its explanation',()=>{
  let questions=bank.map((q,i)=>({...normalizeQuestion(q),id:`m${i}`}));
  for(let i=0;i<5;i++) {
    questions=prepareQuestions(questions,{},10);
    for(const q of questions) {
      const original=bank[Number(q.id.slice(1))];
      assert.deepEqual(q.respostasCorretas.map(i=>q.alternativas[i]).sort(),original.respostasCorretas.map(i=>original.alternativas[i]).sort());
      q.alternativas.forEach((text,i)=>assert.equal(q.explicacoesAlternativas[i],original.explicacoesAlternativas[original.alternativas.indexOf(text)]));
    }
  }
});
test('second attempt pays half once, no bonus or mission progress, third pays zero',()=>{
  let data=applyQuizEvent(initialProgress('local',now),answer(0,[0]),now).data;
  const before=data.learning;
  const result=applyQuizEvent(data,answer(1,[0,1],{review:true}),now);
  assert.equal(result.xp,5);assert.equal(result.comboXp,0);assert.equal(result.streak,0);
  assert.deepEqual(result.data.learning,before);
  assert.equal(result.data.questoesAcertadas,0);
  assert.equal(applyQuizEvent(result.data,answer(1,[0,1],{review:true}),now).data.pontuacaoGeral,result.data.pontuacaoGeral);
  assert.equal(applyQuizEvent(result.data,answer(2,[0,1],{review:true}),now).xp,0);
});
test('a wrong second attempt consumes retry; a first correct answer never yields retry XP',()=>{
  let data=applyQuizEvent(initialProgress('local',now),answer(0,[0]),now).data;
  data=applyQuizEvent(data,answer(1,[1],{review:true}),now).data;
  assert.equal(applyQuizEvent(data,answer(2,[0,1],{review:true}),now).xp,0);
  data=applyQuizEvent(initialProgress('local',now),answer(0,[0,1]),now).data;
  assert.equal(applyQuizEvent(data,answer(1,[0,1],{review:true}),now).xp,0);
  assert.equal(applyQuizEvent(data,answer(2,[0,1]),new Date(+now+86400000)).xp,10);
});
test('a full pilot game advances mode metrics and performance, while partial sets break combo',()=>{
  let data=initialProgress('local',now);
  for(let i=0;i<10;i++) data=applyQuizEvent(data,answer(i,bank[i].respostasCorretas,{question:{...bank[i],id:`m${i}`}}),now).data;
  const finish=applyQuizEvent(data,{id:'game:finish',type:'finish',total:10},now);
  assert.equal(finish.xp,60);
  assert.equal(finish.data.learning.total.modeCorrect.multipla_resposta,10);
  assert.equal(finish.data.learning.month.quizModes.multipla_resposta,1);
  assert.ok(finish.data.conquistasDesbloqueadas.includes('multi_10'));
});
test('pilot is appended without changing an existing profile or seed IDs',()=>{
  const original=Array.from({length:813},(_,i)=>({pergunta:`Old ${i}`}));
  const input={'settings/localBank':{version:'old',count:813},'users/test':{pontuacaoGeral:3214}};
  const result=upgradeLocalBank(input,[...original,...bank],'pilot');
  assert.deepEqual(result['questions/local-813'],bank[0]);
  assert.deepEqual(result['users/test'],input['users/test']);
  assert.equal(result['settings/localBank'].count,823);
});
