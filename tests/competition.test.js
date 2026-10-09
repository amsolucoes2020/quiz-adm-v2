import test from 'node:test';
import assert from 'node:assert/strict';
import {monthlySeason,enrollCompetition,syncCompetition,closeCompetition,roomRanking,leagueOutcome,competitionCareer} from '../src/domain/competition.js';
import {initialProgress} from '../src/domain/periods.js';
import {applyQuizEvent} from '../src/domain/progress.js';
const now=new Date('2026-10-15T15:00:00-03:00');
function store(count=30,league='Bronze') {
  const season=monthlySeason(now),data={'settings/season':season};
  for(let i=0;i<count;i++) data[`users/u${String(i).padStart(3,'0')}`]={...initialProgress(season.name,now),nome:`Aluno ${i}`,pontuacaoGeral:5000,conquistasDesbloqueadas:['des_1'],
    competition:{...enrollCompetition(season,now,league),points:3000-i*50,answers:100,correct:90,quizzes:10}};
  return syncCompetition(data,now);
}
const answer=(i,extra={})=>({id:`game:answer:${i}`,type:'answer',question:{id:`q${i}`,disciplina:'Excel',dificuldade:'Fácil',respostaCorreta:0},remaining:30,selected:0,...extra});

test('monthly dates use Sao Paulo, end exclusively, and support leap months',()=>{
  assert.equal(monthlySeason(new Date('2026-11-01T02:59:59Z')).id,'2026-10');
  assert.equal(monthlySeason(new Date('2026-11-01T03:00:00Z')).id,'2026-11');
  const feb=monthlySeason(new Date('2028-02-15T12:00:00Z'));
  assert.equal((Date.parse(feb.endAt)-Date.parse(feb.startAt))/86400000,29);
});
test('entry cutoff is exactly 75 percent; classification starts Bronze next month',()=>{
  const season=monthlySeason(now),cutoff=Date.parse(season.startAt)+(Date.parse(season.endAt)-Date.parse(season.startAt))*.75;
  assert.equal(enrollCompetition(season,new Date(cutoff-1)).status,'active');
  assert.equal(enrollCompetition(season,new Date(cutoff)).status,'classification');
  const late=new Date(cutoff),data=syncCompetition({'settings/season':season,'users/new':{...initialProgress(season.name,late),nome:'Novo'}},late);
  assert.equal(data['users/new'].competition.roomId,null);
  const next=syncCompetition(data,new Date(season.endAt));
  assert.equal(next['users/new'].competition.league,'Bronze');assert.equal(next['users/new'].competition.status,'active');
  assert.equal(competitionCareer(next['users/new']).played,0);
});
test('migration preserves XP and achievements, with no invented competitive points',()=>{
  const old={...initialProgress('LEGADO',now),pontuacaoGeral:3214,xpTemporada:3214,conquistasDesbloqueadas:['des_1']};
  const migrated=syncCompetition({'settings/season':{name:'LEGADO'},'users/me':old},now);
  assert.equal(migrated['users/me'].pontuacaoGeral,3214);assert.equal(migrated['users/me'].competition.points,0);
  assert.deepEqual(migrated['users/me'].conquistasDesbloqueadas,['des_1']);
  assert.equal(old.competition,undefined);
});
test('rooms hold at most thirty, are balanced and keep existing assignments on new entry',()=>{
  const data=store(61),rows=Object.entries(data).filter(([path])=>path.startsWith('users/')).map(([,p])=>p);
  const rooms=new Set(rows.map(r=>r.competition.roomId));assert.equal(rooms.size,3);
  for(const room of rooms) assert.ok(rows.filter(r=>r.competition.roomId===room).length<=30);
  const original=data['users/u000'].competition.roomId;
  const updated=syncCompetition({...data,'users/new':{...initialProgress('',now),nome:'Novo'}},now);
  assert.equal(updated['users/u000'].competition.roomId,original);
  assert.ok(updated['users/new'].competition.roomId);
});
test('ranking isolates rooms and uses deterministic ties without lifetime XP',()=>{
  const data=store(31),rows=Object.entries(data).filter(([p])=>p.startsWith('rankings/')).map(([,v])=>v);
  const c=data['users/u000'].competition,ranked=roomRanking(rows,c);
  assert.equal(ranked.length,16);assert.ok(ranked.every(r=>r.competition.roomId===c.roomId));
  const tied=[{uid:'b',competition:{...c,points:1,correct:3}},{uid:'a',competition:{...c,points:1,correct:3}},{uid:'c',competition:{...c,points:1,correct:4}}];
  assert.deepEqual(roomRanking(tied,c).map(r=>r.uid),['c','a','b']);
});
test('full rooms promote and relegate five, with Bronze and Diamond boundaries',()=>{
  assert.equal(leagueOutcome('Bronze',1,30,10).nextLeague,'Prata');
  assert.equal(leagueOutcome('Bronze',30,30,10).nextLeague,'Bronze');
  assert.equal(leagueOutcome('Prata',5,30,10).nextLeague,'Ouro');
  assert.equal(leagueOutcome('Prata',26,30,0).nextLeague,'Bronze');
  assert.equal(leagueOutcome('Ouro',25,30,10).nextLeague,'Ouro');
  assert.equal(leagueOutcome('Diamante',1,30,10).zone,'Campeão');
  assert.equal(leagueOutcome('Diamante',2,30,10).zone,'Elite');
  assert.equal(leagueOutcome('Diamante',30,30,0).nextLeague,'Ouro');
  assert.equal(leagueOutcome('Ouro',1,5,100).zone,'Permanência');
  assert.equal(leagueOutcome('Bronze',1,30,0).zone,'Permanência');
  assert.equal(leagueOutcome('Prata',1,12,10).slots,2);
});
test('rollover archives final campaigns, resets missions and preserves lifetime and streak',()=>{
  const input=store();input['users/u000'].missoesConcluidas=['sem_1','men_1'];input['users/u000'].sequenciaDias=8;
  const snapshot=structuredClone(input),end=new Date(input['settings/season'].endAt);
  const output=syncCompetition(input,end),p=output['users/u000'];
  assert.deepEqual(input,snapshot);
  assert.equal(p.competition.league,'Prata');assert.equal(p.competition.points,0);
  assert.equal(p.competition.answers,0);assert.equal(p.pontuacaoGeral,5000);assert.equal(p.sequenciaDias,8);
  assert.deepEqual(p.conquistasDesbloqueadas,['des_1']);assert.deepEqual(p.missoesConcluidas,[]);
  assert.equal(p.seasonHistory[0].position,1);assert.equal(p.seasonHistory[0].points,3000);
  assert.equal(output['seasons/2026-10'].status,'closed');assert.equal(output['seasons/2026-10'].results.length,30);
  assert.deepEqual(syncCompetition(output,end),output);
  assert.equal(closeCompetition(output,end),output);
  assert.equal(competitionCareer(p).played,1);assert.ok(p.leagueBadges.includes('Top 3'));
});
test('Diamond winner receives title, while zero-point players never win one',()=>{
  const input=store(30,'Diamante');
  let result=syncCompetition(input,new Date(input['settings/season'].endAt));
  assert.equal(competitionCareer(result['users/u000']).titles,1);
  for(const [key,p] of Object.entries(input)) if(key.startsWith('users/')) p.competition.points=0;
  result=syncCompetition(input,new Date(input['settings/season'].endAt));
  assert.equal(competitionCareer(result['users/u000']).titles,0);
});
test('competitive scoring excludes achievements, missions, combos and daily streak',()=>{
  let data=store(1)['users/u000'];data.competition={...data.competition,points:0,answers:0,correct:0,quizzes:0};
  for(let i=0;i<10;i++) data=applyQuizEvent(data,answer(i),now).data;
  assert.equal(data.competition.points,100);assert.equal(data.competition.correct,10);
  assert.ok(data.pontuacaoGeral>5100);
  const finish={id:'game:finish',type:'finish',total:10};
  const result=applyQuizEvent(data,finish,now);assert.equal(result.competitivePoints,60);assert.equal(result.data.competition.points,160);
  assert.equal(applyQuizEvent(result.data,finish,now).data.competition.points,160);
  assert.equal(applyQuizEvent(result.data,answer(11,{question:answer(0).question}),now).competitivePoints,0);
});
test('classification and half-XP retries give no competitive points',()=>{
  const data=store(1)['users/u000'];data.competition.status='classification';data.competition.points=0;
  const result=applyQuizEvent(data,answer(0),now);assert.equal(result.competitivePoints,0);assert.ok(result.xp>0);
  const q={...answer(0).question,formato:'multipla_resposta',respostasCorretas:[0,1]};
  data.competition.status='active';
  const wrong=applyQuizEvent(data,answer(0,{question:q,selected:[0]}),now);
  const retry=applyQuizEvent(wrong.data,answer(1,{question:q,selected:[0,1],review:true}),now);
  assert.equal(retry.xp,5);assert.equal(retry.competitivePoints,0);assert.equal(retry.data.competition.points,0);
});
test('a prior season session cannot yield a performance bonus in the next season',()=>{
  let input=store(1),data=input['users/u000'];
  for(let i=0;i<10;i++) data=applyQuizEvent(data,answer(i),now).data;
  input['users/u000']=data;
  const end=new Date(input['settings/season'].endAt),updated=syncCompetition(input,end);
  const finish=applyQuizEvent(updated['users/u000'],{id:'game:finish',type:'finish',total:10},end);
  assert.equal(finish.competitivePoints,0);assert.equal(finish.xp,0);
});
