import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AREAS_ADMINISTRACAO,normalizeQuestion,validateImport,prepareQuestions,gradeAnswer,questionKey} from '../src/domain/questions.js';
import {createQuestionScope} from '../src/domain/questionScope.js';
import {upgradeLocalBank} from '../src/domain/localBank.js';
import {canonicalEvent} from '../server/events.js';
import {questions as serverBank,isDeferred} from '../server/questionBank.js';
const read=n=>JSON.parse(fs.readFileSync(new URL(`../src/data/${n}.json`,import.meta.url),'utf8'));
const bank=read('balancedQuestions');
const historical=['questions','trueFalse','additionalQuestions','conceptualQuestions','multipleAnswers'].flatMap(read);
const all=[...historical,...bank],retired=read('retiredQuestionKeys');

test('balanced edition has 60/40/40 per category and the 50/30/20 difficulty mix',()=>{
  assert.equal(bank.length,1680);
  assert.equal(validateImport(bank).duplicates,0);
  assert.equal(new Set(bank.map(q=>q.idBanco)).size,1680);
  assert.equal(new Set(bank.map(q=>q.objetivo)).size,1680);
  assert.equal(new Set(bank.map(q=>q.pergunta.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,''))).size,1680);
  for(const area of AREAS_ADMINISTRACAO)for(const [format,total] of [['multipla',60],['vf',40],['multipla_resposta',40]]) {
    const slice=bank.filter(q=>q.disciplina===area&&q.formato===format);
    assert.equal(slice.length,total,`${area} ${format}`);
    for(const [level,ratio] of [['Fácil',.5],['Médio',.3],['Difícil',.2]])assert.equal(slice.filter(q=>q.dificuldade===level).length,total*ratio);
  }
});

test('answer positions and true-false values are balanced; multiple sets are not fixed',()=>{
  for(const area of AREAS_ADMINISTRACAO) {
    const mc=bank.filter(q=>q.disciplina===area&&q.formato==='multipla');
    for(let i=0;i<5;i++)assert.equal(mc.filter(q=>q.respostaCorreta===i).length,12);
    const vf=bank.filter(q=>q.disciplina===area&&q.formato==='vf');
    assert.equal(vf.filter(q=>q.respostaCorreta===0).length,20);
    assert.equal(vf.filter(q=>q.respostaCorreta===1).length,20);
    const definitions=vf.map(q=>q.pergunta.split('é a denominação de: ')[1]);
    assert.equal(new Set(definitions).size,40,'no true/false copies of the same statement');
    const multi=bank.filter(q=>q.disciplina===area&&q.formato==='multipla_resposta');
    assert.deepEqual([...new Set(multi.map(q=>q.respostasCorretas.length))].sort(),[2,3,4]);
    assert.ok(new Set(multi.map(q=>q.respostasCorretas.join(','))).size>=5);
  }
});

test('retired originals, imported copies and archived documents stay outside both editions',()=>{
  const scope=createQuestionScope(all,read('deferredQuestionIds'),retired);
  assert.equal(scope.activeQuestions.length,1680);
  assert.deepEqual(scope.activeQuestions,bank);
  assert.deepEqual(serverBank,bank);
  for(const q of historical){assert.ok(scope.isDeferredQuestion(q));assert.ok(isDeferred({...q,pergunta:q.pergunta.toUpperCase()}));}
  assert.equal(isDeferred({...bank[0],ativo:false}),true);
  assert.equal(isDeferred({...bank[0],pergunta:'Questão inédita cadastrada pelo professor.'}),false);
  assert.equal(bank.filter(q=>retired.includes(questionKey(q))).length,0);
});

test('local upgrade archives by filtering and preserves progress, custom rows and every historical ID',()=>{
  const profile={pontuacaoGeral:2048,competition:{points:90},questoesRespondidasHoje:['local-1'],conquistasDesbloqueadas:['part_1']};
  const input={...Object.fromEntries(historical.map((q,i)=>[`questions/local-${i}`,q])),
    'users/test':profile,'questions/custom':{...bank[0],pergunta:'Questão inédita do professor.'},
    'settings/localBank':{version:'2026-09-27-v1.4-561',count:historical.length}};
  const upgraded=upgradeLocalBank(input,all,'2026-10-09-balanced-1680');
  assert.deepEqual(upgraded['users/test'],profile);
  assert.deepEqual(upgraded['questions/custom'],input['questions/custom']);
  for(let i=0;i<historical.length;i++)assert.deepEqual(upgraded[`questions/local-${i}`],historical[i]);
  assert.equal(Object.values(upgraded).filter(q=>typeof q?.pergunta==='string'&&!isDeferred(q)).length,1681);
  assert.equal(upgradeLocalBank(upgraded,all,'2026-10-09-balanced-1680'),upgraded);
});

test('a full quiz spans ten different definition families and keeps unanswered questions first',()=>{
  for(const area of AREAS_ADMINISTRACAO) {
    const pool=bank.filter(q=>q.disciplina===area&&q.formato==='multipla').map(q=>({...normalizeQuestion(q),id:q.idBanco}));
    const quiz=prepareQuestions(pool,{},10);
    assert.equal(new Set(quiz.map(q=>q.grupoPedagogico)).size,10);
    const fresh=[pool[0],pool[1]],old=pool.slice(2).map(q=>q.id);
    const prepared=prepareQuestions(pool,{questoesRespondidasHoje:old},10);
    assert.deepEqual(new Set(prepared.slice(0,2).map(q=>q.id)),new Set(fresh.map(q=>q.id)));
  }
});

test('editorial contexts cover every topic group and retain one general explanation',()=>{
  const contexts=JSON.parse(fs.readFileSync(new URL('../content/bank/contexts.json',import.meta.url),'utf8'));
  for(const [areaIndex,area] of AREAS_ADMINISTRACAO.entries()) {
    for(const [format,section,total] of [['multipla','MC',12],['vf','VF',8],['multipla_resposta','MR',8]]) {
      assert.equal(contexts[areaIndex][section].length,total);
      const rows=bank.filter(q=>q.disciplina===area&&q.formato===format);
      rows.forEach((q,i)=>{
        assert.ok(q.pergunta.startsWith(contexts[areaIndex][section][Math.floor(i/5)]));
        assert.ok(q.explicacao.trim());
        if(format==='multipla')assert.equal(q.explicacao,`${q.objetivo.split(':').slice(2).join(':')}: ${q.alternativas[q.respostaCorreta]}.`);
      });
    }
  }
});

test('same-size editorial upgrade refreshes bank-owned local rows without changing IDs or progress',()=>{
  const source=[...historical,...bank];
  const profile={pontuacaoGeral:100,questoesRespondidasHoje:[`local-${historical.length}`],conquistasDesbloqueadas:['part_1']};
  const path=`questions/local-${historical.length}`;
  const original={...bank[0],pergunta:'Enunciado anterior.'};
  const input={ [path]:original,'users/test':profile,'questions/custom':{...original,pergunta:'Questão criada pelo professor.'},
    'settings/localBank':{version:'2026-10-09-balanced-1680',count:source.length} };
  const updated=upgradeLocalBank(input,source,'2026-10-09-contextual-1680');
  assert.deepEqual(updated[path],bank[0]);
  assert.deepEqual(updated['users/test'],profile);
  assert.deepEqual(updated['questions/custom'],input['questions/custom']);
  assert.equal(upgradeLocalBank(updated,source,'2026-10-09-contextual-1680'),updated);
});

test('every authored answer survives shuffling and authoritative server remapping',()=>{
  for(const raw of bank) {
    const q={...normalizeQuestion(raw),id:raw.idBanco};
    const prepared=prepareQuestions([q],{},1)[0];
    const selected=q.formato==='multipla_resposta'?prepared.respostasCorretas:prepared.respostaCorreta;
    const canonical=canonicalEvent({id:'bank:answer:0',type:'answer',remaining:20,review:false,selected,question:{...prepared,respostaCorreta:99,dificuldade:'Especialista'}},q);
    assert.equal(gradeAnswer(canonical.question,canonical.selected,20).correct,true,raw.idBanco);
    if(q.formato==='multipla_resposta')for(let mask=0;mask<16;mask++) {
      const subset=[0,1,2,3].filter(i=>mask&(1<<i));
      const exact=subset.length===q.respostasCorretas.length&&subset.every(i=>q.respostasCorretas.includes(i));
      assert.equal(gradeAnswer(q,subset,20).correct,exact,raw.idBanco);
    }
  }
});

test('nonsemantic cues and conspicuously long correct choices are absent',()=>{
  for(const q of bank) {
    for(const option of q.alternativas)assert.equal(/(?<!\p{L})(?:sempre|nunca|qualquer|todos|apenas|somente|exclusivamente)(?!\p{L})/iu.test(option),false,`${q.idBanco}: ${option}`);
    for(const option of q.alternativas)assert.equal(/(?<!\p{L})(?:de a|de o|a a)(?!\p{L})/iu.test(option),false,`${q.idBanco}: ${option}`);
    if(q.formato==='multipla') {
      const sizes=q.alternativas.map(s=>s.split(/\s+/).length);
      assert.ok(sizes[q.respostaCorreta]<=Math.min(...sizes)*2.5,q.idBanco);
    }
  }
});
