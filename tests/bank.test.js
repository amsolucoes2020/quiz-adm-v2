import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AREAS_ADMINISTRACAO, normalizeQuestion, validateImport, prepareQuestions } from '../src/domain/questions.js';
import { upgradeLocalBank } from '../src/domain/localBank.js';
import { DEFAULT_MISSIONS, CONQUISTAS_SISTEMA } from '../src/domain/gamification.js';
const read = name => JSON.parse(readFileSync(new URL(`../src/data/${name}.json`,import.meta.url),'utf8'));
const original=read('questions'), vf=read('trueFalse'), additional=read('additionalQuestions');
const bank=[...original,...vf,...additional];

test('800 valid unique questions cover 12 areas with the requested level distribution',()=>{
 assert.equal(AREAS_ADMINISTRACAO.length,12);
 const valid=validateImport(bank); assert.equal(valid.questions.length,800);assert.equal(valid.duplicates,0);
 for(const area of AREAS_ADMINISTRACAO) {
  const binary=vf.filter(q=>q.disciplina===area), added=additional.filter(q=>q.disciplina===area);
  assert.equal(binary.length,30,area); assert.equal(added.length,20,area);
  for(const [level,count] of [['Fácil',15],['Médio',9],['Difícil',6]]) assert.equal(binary.filter(q=>q.dificuldade===level).length,count,area+' '+level);
  for(const [level,count] of [['Fácil',10],['Médio',6],['Difícil',4]]) assert.equal(added.filter(q=>q.dificuldade===level).length,count,area+' '+level);
  assert.equal(binary.filter(q=>q.respostaCorreta===0).length,15,area);
  for(let i=0;i<5;i++) assert.equal(added.filter(q=>q.respostaCorreta===i).length,4,area);
 }
});
test('every category supports full ten-question blocks in both formats and preserves answer meaning',()=>{
 for(const area of AREAS_ADMINISTRACAO) for(const format of ['vf','multipla']) {
  const source=bank.filter(q=>q.disciplina===area&&(q.formato||'multipla')===format).map((q,i)=>({...normalizeQuestion(q),id:`${area}:${format}:${i}`}));
  const prepared=prepareQuestions(source,{},10);assert.equal(prepared.length,10);
  for(const q of prepared) {
   const before=source.find(item=>item.id===q.id);
   assert.equal(q.alternativas[q.respostaCorreta],before.alternativas[before.respostaCorreta]);
  }
 }
});
test('bank upgrade adds 580 entries without changing progress, original IDs or custom questions',()=>{
 const legacy=Object.fromEntries(bank.slice(0,220).map((q,i)=>[`questions/local-${i}`,q]));
 const profile={nome:'Teste',pontuacaoGeral:1490,questoesRespondidasHoje:['local-201'],conquistasDesbloqueadas:['des_1']};
 const input={...legacy,'users/test':profile,'questions/custom':{...vf[30],pergunta:'Questão personalizada preservada.'}};
 const upgraded=upgradeLocalBank(input,bank,'expanded');
 assert.equal(Object.keys(upgraded).filter(k=>k.startsWith('questions/')).length,801);
 assert.deepEqual(upgraded['users/test'],profile);
 assert.deepEqual(upgraded['questions/custom'],input['questions/custom']);
 for(let i=0;i<220;i++) assert.deepEqual(upgraded[`questions/local-${i}`],input[`questions/local-${i}`]);
 assert.equal(upgradeLocalBank(upgraded,bank,'expanded'),upgraded);
 assert.equal(input['settings/localBank'],undefined);
});
test('upgrade preserves deliberate old deletions and does not duplicate an imported new question',()=>{
 const input=Object.fromEntries(bank.slice(0,220).map((q,i)=>[`questions/local-${i}`,q]));
 delete input['questions/local-1'];
 input['questions/imported']={...bank[220]};
 const upgraded=upgradeLocalBank(input,bank,'expanded');
 assert.equal(upgraded['questions/local-1'],undefined);
 assert.equal(upgraded['questions/local-220'],undefined);
 assert.deepEqual(upgraded['questions/imported'],bank[220]);
});
test('reference metadata survives normalization and disallows unsafe links or invalid dates',()=>{
 const dated=bank.filter(q=>q.dataReferencia);
 assert.ok(dated.length>=6);
 for(const q of dated) {
  const normalized=normalizeQuestion(q);
  assert.equal(normalized.dataReferencia,q.dataReferencia);
  assert.ok(normalized.fonte.startsWith('https://'));
 }
 assert.throws(()=>normalizeQuestion({...vf[0],fonte:'javascript:alert(1)'}));
 assert.throws(()=>normalizeQuestion({...vf[0],dataReferencia:'2026-02-31'}));
});
test('all-category awards now require the two new areas',()=>{
 const mission=DEFAULT_MISSIONS.find(m=>m.id==='men_2');
 const achievement=CONQUISTAS_SISTEMA.find(a=>a.id==='cat_3');
 assert.equal(mission.alvo,12);
 const old={categoriasMes:AREAS_ADMINISTRACAO.slice(0,10),categoriasRespondidas:Object.fromEntries(AREAS_ADMINISTRACAO.slice(0,10).map(a=>[a,1]))};
 assert.equal(mission.progresso(old),10);assert.equal(achievement.checar(old),false);
 const all={categoriasMes:AREAS_ADMINISTRACAO,categoriasRespondidas:Object.fromEntries(AREAS_ADMINISTRACAO.map(a=>[a,1]))};
 assert.equal(mission.progresso(all),12);assert.equal(achievement.checar(all),true);
});
