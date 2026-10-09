import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createQuestionScope} from '../src/domain/questionScope.js';
import {upgradeLocalBank} from '../src/domain/localBank.js';
import {AREAS_ADMINISTRACAO,validateImport} from '../src/domain/questions.js';
const read=name=>JSON.parse(readFileSync(new URL(`../src/data/${name}.json`,import.meta.url),'utf8'));
const bank=['questions','trueFalse','additionalQuestions','conceptualQuestions'].flatMap(read);
const deferred=read('deferredQuestionIds');
const {activeQuestions,isDeferredQuestion}=createQuestionScope(bank,deferred);

test('conceptual edition excludes all deferred items and supports full games and area medals',()=>{
  assert.equal(deferred.length,262);
  assert.equal(new Set(deferred).size,deferred.length);
  assert.equal(activeQuestions.length,551);
  assert.equal(validateImport(activeQuestions).questions.length,551);
  for(const id of deferred) assert.ok(!activeQuestions.includes(bank[id]));
  for(const area of AREAS_ADMINISTRACAO) {
    const questions=activeQuestions.filter(q=>q.disciplina===area);
    assert.ok(questions.length>=30,area+' gold medal');
    for(const format of ['vf','multipla']) assert.ok(questions.filter(q=>(q.formato||'multipla')===format).length>=10,area+' '+format);
  }
});

test('imported copies of deferred questions are excluded without hiding other custom content',()=>{
  assert.ok(isDeferredQuestion({...bank[105],id:'custom',pergunta:bank[105].pergunta.toUpperCase()}));
  assert.equal(isDeferredQuestion({...bank[0],id:'custom'}),false);
});

test('upgrade preserves all old question IDs and progress while appending conceptual additions',()=>{
  const profile={pontuacaoGeral:2087,questoesRespondidasHoje:['local-105'],conquistasDesbloqueadas:['mastery_0_5']};
  const input={...Object.fromEntries(bank.slice(0,800).map((q,i)=>[`questions/local-${i}`,q])),
    'users/test':profile,'settings/localBank':{version:'2026-09-24-800',count:800}};
  const upgraded=upgradeLocalBank(input,bank,'conceptual');
  assert.deepEqual(upgraded['users/test'],profile);
  for(let i=0;i<800;i++) assert.deepEqual(upgraded[`questions/local-${i}`],input[`questions/local-${i}`]);
  assert.equal(Object.entries(upgraded).filter(([path,q])=>path.startsWith('questions/')&&!isDeferredQuestion(q)).length,551);
  assert.equal(upgradeLocalBank(upgraded,bank,'conceptual'),upgraded);
});

test('repairs transitional preview count without restoring deleted old questions',()=>{
  const input={...Object.fromEntries(bank.slice(0,800).map((q,i)=>[`questions/local-${i}`,q])),
    'settings/localBank':{version:'2026-09-24-concepts-551',count:551}};
  delete input['questions/local-600'];
  const result=upgradeLocalBank(input,bank,'2026-09-24-concepts-551');
  assert.equal(result['questions/local-600'],undefined);
  assert.deepEqual(result['questions/local-800'],bank[800]);
  assert.equal(result['settings/localBank'].count,813);
});
