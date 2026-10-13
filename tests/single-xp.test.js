import test from 'node:test';
import assert from 'node:assert/strict';
import {performXP} from '../server/xpService.js';
import {initialProgress} from '../src/domain/periods.js';
import {questions} from '../server/questionBank.js';
function database(seed={}) {
  const state=structuredClone(seed),snap=path=>({data:()=>structuredClone(state[path])});let pending=Promise.resolve();
  return {state,doc:path=>({path}),runTransaction:fn=>{
    const work=pending.then(async()=>{let writing=false;const writes=[];
      const result=await fn({get:async ref=>{assert.equal(writing,false);return snap(ref.path);},set:(ref,data)=>{writing=true;writes.push([ref.path,structuredClone(data)]);}});
      for(const [path,value] of writes)state[path]=value;return result;
    });pending=work.catch(()=>{});return work;
  }};
}
const actor={uid:'student',email:'student@example.invalid'},clock=()=>new Date('2026-10-13T12:00:00-03:00');
const details={nome:'Aluno',curso:'Administração',turma:'A',unidade:'Teste'};

test('single XP signup creates no league or season and ignores forged XP and admin fields',async()=>{
  const db=database(),profile=await performXP(db,actor,'createProfile',{data:{...details,pontuacaoGeral:99999,isAdmin:true}},clock);
  assert.equal(profile.pontuacaoGeral,0);assert.equal(profile.isAdmin,false);assert.equal(profile.competition,undefined);
  assert.equal(db.state['settings/season'],undefined);
  assert.deepEqual(db.state['rankings/student'],{uid:'student',nome:'Aluno',pontuacaoGeral:0});
  assert.deepEqual(await performXP(db,actor,'createProfile',{data:{...details,nome:'Replacement'}},clock),profile);
});

test('month rollover preserves lifetime XP and historical league records without running league transitions',async()=>{
  const profile={...details,...actor,...initialProgress('LEGACY',clock()),pontuacaoGeral:900,xpTemporada:200,competition:{seasonId:'2026-10',points:100,status:'active',league:'Prata'},conquistasDesbloqueadas:['part_1']};
  const db=database({'users/student':profile,'settings/season':{id:'2026-10'}});
  const next=await performXP(db,actor,'loadProfile',{},()=>new Date('2026-11-01T12:00:00-03:00'));
  assert.equal(next.pontuacaoGeral,900);assert.equal(next.xpTemporada,200);assert.deepEqual(next.competition,profile.competition);
  assert.deepEqual(next.conquistasDesbloqueadas,['part_1']);assert.deepEqual(db.state['settings/season'],{id:'2026-10'});
  assert.deepEqual(db.state['rankings/student'],{uid:'student',nome:'Aluno',pontuacaoGeral:900});
});

test('answer and combo rewards go to one XP balance and retries never duplicate XP',async()=>{
  const q=questions.find(q=>q.formato==='multipla'),legacy={...details,...actor,...initialProgress('LEGACY',clock()),pontuacaoGeral:300,xpTemporada:80,competition:{points:70,status:'active'}};
  const db=database({'users/student':legacy,'questions/q':q});let last;
  for(let i=0;i<3;i++) {
    db.state[`questions/q${i}`]=q;
    const event={id:`single:answer:${i}`,type:'answer',remaining:60,review:false,selected:q.respostaCorreta,question:{...q,id:`q${i}`,dificuldade:'Especialista'}};
    last=await performXP(db,actor,'saveQuizEvent',{event},clock);
    const retry=await performXP(db,actor,'saveQuizEvent',{event},clock);
    assert.equal(retry.data.pontuacaoGeral,last.data.pontuacaoGeral);assert.equal(last.competitivePoints,0);
  }
  assert.equal(last.comboXp,10);assert.equal(last.data.xpTemporada,80);assert.deepEqual(last.data.competition,legacy.competition);
  assert.ok(last.data.pontuacaoGeral>300);assert.equal(db.state['rankings/student'].pontuacaoGeral,last.data.pontuacaoGeral);
  await assert.rejects(performXP(db,actor,'saveQuizEvent',{event:{id:'single:answer:8',type:'answer',remaining:60,review:false,selected:0,question:{...q,id:'q'}}},clock));
});

test('disabled league metadata requires no competition storage and missing profiles remain missing',async()=>{
  const db=database();assert.deepEqual(await performXP(db,actor,'loadSeason',{},clock),{name:'XP geral',leaguesEnabled:false});
  assert.equal(await performXP(db,actor,'loadProfile',{},clock),null);assert.deepEqual(db.state,{});
});
