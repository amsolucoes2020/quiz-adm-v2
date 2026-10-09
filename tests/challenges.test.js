import test from 'node:test';
import assert from 'node:assert/strict';
import { initialProgress, resetPeriods } from '../src/domain/periods.js';
import { applyQuizEvent } from '../src/domain/progress.js';
import { DEFAULT_MISSIONS, CONQUISTAS_SISTEMA, activeMissions } from '../src/domain/gamification.js';
import { AREAS_ADMINISTRACAO } from '../src/domain/questions.js';
const now = new Date('2026-09-24T15:00:00Z');
const tomorrow = new Date('2026-09-25T15:00:00Z');
const question = {id:'q0', disciplina:AREAS_ADMINISTRACAO[0], dificuldade:'Difícil', formato:'vf', respostaCorreta:0};
const answer = (id, extra={}) => ({id:`g:answer:${id}`, type:'answer', question:{...question,id}, selected:0,remaining:20,...extra});

test('catalogue has unique IDs, three deterministic daily tracks and all 12 rotating areas', () => {
  assert.equal(DEFAULT_MISSIONS.length,41);
  assert.equal(CONQUISTAS_SISTEMA.length,81);
  for(const catalogue of [DEFAULT_MISSIONS,CONQUISTAS_SISTEMA]) assert.equal(new Set(catalogue.map(x=>x.id)).size,catalogue.length);
  const areas = new Set();
  for(let i=0;i<12;i++) {
    const date=new Date(+now+i*86400000), selected=activeMissions(date);
    assert.equal(selected.length,21);
    assert.equal(selected.filter(x=>x.tipo==='Diária').length,3);
    assert.deepEqual(selected,activeMissions(new Date(+date+3600000)));
    areas.add(selected.find(x=>x.id.startsWith('dia_area_')).id);
  }
  assert.equal(areas.size,12);
});

test('detailed progress excludes review and repeated answers and never mutates input', () => {
  const original=initialProgress('local',now), snapshot=structuredClone(original);
  const first=applyQuizEvent(original,answer('q0'),now).data;
  assert.deepEqual(original,snapshot);
  for(const scope of ['total','day','week','month']) {
    assert.equal(first.learning[scope].answers,1);
    assert.equal(first.learning[scope].modeCorrect.vf,1);
    assert.equal(first.learning[scope].hardCorrect,1);
  }
  const repeat=applyQuizEvent(first,answer('q0',{id:'repeat:answer:0'}),now).data;
  const review=applyQuizEvent(repeat,answer('review',{review:true}),now).data;
  assert.deepEqual(review.learning,first.learning);
});

test('area medals count unique lifetime correct questions and award once', () => {
  let data=initialProgress('local',now);
  for(let i=0;i<5;i++) data=applyQuizEvent(data,answer(`q${i}`),now).data;
  assert.equal(data.learning.mastery[question.disciplina],5);
  assert.ok(data.conquistasDesbloqueadas.includes('mastery_0_5'));
  const next=applyQuizEvent(data,answer('q0',{id:'tomorrow:answer:0'}),tomorrow);
  assert.equal(next.data.learning.mastery[question.disciplina],5);
  assert.ok(!next.achievements.includes('mastery_0_5'));
});

test('recovery requires a first correct answer on a later day and counts only once', () => {
  let data=applyQuizEvent(initialProgress('local',now),answer('q0',{selected:1}),now).data;
  data=applyQuizEvent(data,answer('q0',{id:'review:answer:0',review:true}),now).data;
  data=applyQuizEvent(data,answer('q0',{id:'repeat:answer:0'}),now).data;
  assert.equal(data.learning.total.recovered,0);
  data=applyQuizEvent(data,answer('q0',{id:'next:answer:0'}),tomorrow).data;
  assert.equal(data.learning.total.recovered,1);
  assert.deepEqual(data.learning.pending,[]);
  data=applyQuizEvent(data,answer('q0',{id:'later:answer:0'}),new Date(+tomorrow+86400000)).data;
  assert.equal(data.learning.total.recovered,1);
});

test('finish metrics require a complete eligible session and are idempotent', () => {
  let data=initialProgress('local',now);
  for(let i=0;i<10;i++) data=applyQuizEvent(data,answer(`q${i}`,{selected:i<8?0:1}),now).data;
  const finish={id:'g:finish',type:'finish',total:10};
  data=applyQuizEvent(data,finish,now).data;
  assert.equal(data.learning.week.goodQuizzes,1);
  assert.equal(data.learning.month.quizModes.vf,1);
  assert.equal(data.learning.total.perfect,0);
  const replay=applyQuizEvent(data,finish,now).data;
  const forged=applyQuizEvent(replay,{...finish,id:'other:finish'},now).data;
  assert.deepEqual(forged.learning,data.learning);
});

test('calendar resets period metrics while preserving permanent learning and prior awards', () => {
  const legacy={...initialProgress('local',now),pontuacaoGeral:2087,conquistasDesbloqueadas:['des_1']};
  delete legacy.learning;
  const migrated=resetPeriods(legacy,DEFAULT_MISSIONS,now);
  assert.equal(migrated.pontuacaoGeral,2087);
  assert.deepEqual(migrated.conquistasDesbloqueadas,['des_1']);
  assert.equal(migrated.learning.total.answers,0);
  let data=migrated;
  for(let i=0;i<5;i++) data=applyQuizEvent(data,answer(`q${i}`),now).data;
  assert.equal(data.learning.total.activeDays.length,1);
  const next=resetPeriods(data,DEFAULT_MISSIONS,tomorrow);
  assert.equal(next.learning.day.answers,0);
  assert.equal(next.learning.week.answers,5);
  const month=resetPeriods(next,DEFAULT_MISSIONS,new Date('2026-10-05T15:00:00Z'));
  assert.equal(month.learning.week.answers,0);
  assert.equal(month.learning.month.answers,0);
  assert.equal(month.learning.mastery[question.disciplina],5);
  assert.deepEqual(month.learning.total,data.learning.total);
});
