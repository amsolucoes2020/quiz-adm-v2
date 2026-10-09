import test from 'node:test';
import assert from 'node:assert/strict';
import {canonicalEvent} from '../server/events.js';
import {ensureCompetition,perform} from '../server/competition.js';
import {questions} from '../server/questionBank.js';
import {monthlySeason} from '../src/domain/competition.js';
import {initialProgress} from '../src/domain/periods.js';

function database(seed={}) {
  const state=structuredClone(seed);let pending=Promise.resolve();
  const snap=path=>({id:path.split('/').at(-1),exists:state[path]!==undefined,data:()=>structuredClone(state[path])});
  const db={state,doc:path=>({path,get:async()=>snap(path)}),collection:table=>({table}),
    runTransaction:fn=>{
      const work=pending.then(async()=>{
        const writes=[];let writing=false;
        const result=await fn({get:async ref=>{
          assert.equal(writing,false,'Firestore reads must precede writes');
          return ref.table?{docs:Object.keys(state).filter(p=>p.startsWith(ref.table+'/')&&p.split('/').length===2).map(snap)}:snap(ref.path);
        },set:(ref,data)=>{writing=true;writes.push([ref.path,structuredClone(data),false]);},update:(ref,data)=>{writing=true;writes.push([ref.path,structuredClone(data),true]);}});
        for(const [path,value,merge] of writes) state[path]=merge?{...state[path],...value}:value;
        return result;
      });pending=work.catch(()=>{});return work;
    }};
  return db;
}
const now=new Date('2026-10-10T12:00:00-03:00'), clock=()=>now;
const identity={uid:'student',email:'student@example.invalid'};
const details={nome:'Aluno',curso:'Administração',turma:'A',unidade:'Teste'};

test('server rebuilds answer key and difficulty, accepting only an actual permutation',()=>{
  const stored=questions.find(q=>(q.formato||'multipla')==='multipla');
  const shown=[...stored.alternativas].reverse();
  const event={id:'session:answer:0',type:'answer',review:false,remaining:60,selected:shown.indexOf(stored.alternativas[stored.respostaCorreta]),question:{...stored,id:'q',alternativas:shown,respostaCorreta:4,dificuldade:'Especialista'}};
  const validated=canonicalEvent(event,stored);
  assert.equal(validated.selected,stored.respostaCorreta);assert.equal(validated.question.dificuldade,stored.dificuldade);
  assert.throws(()=>canonicalEvent({...event,remaining:61},stored));
  assert.throws(()=>canonicalEvent({...event,question:{...event.question,alternativas:['injected',...shown.slice(1)]}},stored));
  assert.throws(()=>canonicalEvent({...event,selected:99},stored));
});
test('server maps multiple selections and ignores caller finish accuracy',()=>{
  const q=questions.find(q=>q.formato==='multipla_resposta');
  const shown=[...q.alternativas].reverse();
  const event={id:'session:answer:0',type:'answer',review:false,remaining:60,question:{...q,id:'q',alternativas:shown},selected:q.respostasCorretas.map(i=>shown.indexOf(q.alternativas[i]))};
  assert.deepEqual(canonicalEvent(event,q).selected,q.respostasCorretas);
  assert.throws(()=>canonicalEvent({...event,selected:[0,0]},q));
  assert.deepEqual(canonicalEvent({id:'session:finish',type:'finish',review:false,total:10,correctCount:999}),{id:'session:finish',type:'finish',review:false,total:10});
});
test('registration takes identity from token and preserves existing profiles',async()=>{
  const db=database();
  const p=await perform(db,identity,'createProfile',{data:{...details,uid:'admin',isAdmin:true,pontuacaoGeral:99999}},clock);
  assert.equal(p.uid,identity.uid);assert.equal(p.isAdmin,false);assert.equal(p.pontuacaoGeral,0);assert.equal(p.competition.roomId,'Bronze-01');
  assert.deepEqual(await perform(db,identity,'createProfile',{data:{...details,nome:'Replace'}},clock),p);
  assert.equal(await perform(db,{uid:'missing'},'loadProfile',{},clock),null);
  await assert.rejects(perform(db,{uid:'invalid',email:'x'},'createProfile',{data:{}},clock));
  assert.equal(db.state['users/invalid'],undefined);
});
test('server enrollment respects room capacity and late classification',async()=>{
  const db=database();
  await Promise.all(Array.from({length:31},(_,i)=>perform(db,{uid:`s${i}`,email:`s${i}@example.invalid`},'createProfile',{data:details},clock)));
  const counts={};for(const [path,p] of Object.entries(db.state)) if(path.startsWith('users/')) counts[p.competition.roomId]=(counts[p.competition.roomId]||0)+1;
  assert.deepEqual(Object.values(counts).sort((a,b)=>b-a),[30,1]);
  const late=await perform(db,{uid:'late',email:'late@example.invalid'},'createProfile',{data:details},()=>new Date('2026-10-29T12:00:00-03:00'));
  assert.equal(late.competition.status,'classification');assert.equal(late.competition.roomId,null);
});
test('server progression is idempotent and rejects missing, deferred and out-of-order questions',async()=>{
  const db=database();await perform(db,identity,'createProfile',{data:details},clock);
  const q=questions.find(q=>(q.formato||'multipla')==='multipla');db.state['questions/q']=q;
  const event={id:'session:answer:0',type:'answer',review:false,remaining:60,question:{...q,id:'q'},selected:q.respostaCorreta};
  const result=await perform(db,identity,'saveQuizEvent',{event},clock);
  const repeated=await perform(db,identity,'saveQuizEvent',{event},clock);
  assert.equal(result.correct,true);assert.equal(result.data.questoesRespondidas,1);assert.equal(repeated.data.pontuacaoGeral,result.data.pontuacaoGeral);
  await assert.rejects(perform(db,identity,'saveQuizEvent',{event:{...event,id:'session:answer:3'}},clock));
  await assert.rejects(perform(db,identity,'saveQuizEvent',{event:{...event,id:'session:answer:1',question:{...q,id:'missing'}}},clock));
});
test('server migration and rollover preserve XP, isolate archived results and close once',async()=>{
  const legacy={...identity,...details,isAdmin:false,...initialProgress('LEGACY',now),pontuacaoGeral:900,conquistasDesbloqueadas:['part_1']};
  const db=database({'users/student':legacy,'settings/season':{name:'LEGACY'}});
  await ensureCompetition(db,clock);assert.equal(db.state['users/student'].pontuacaoGeral,900);
  const c=db.state['users/student'].competition;c.points=100;c.answers=10;c.correct=10;
  const november=()=>new Date('2026-11-01T00:00:00-03:00');
  await Promise.all([ensureCompetition(db,november),ensureCompetition(db,november)]);
  const p=db.state['users/student'];assert.equal(p.pontuacaoGeral,900);assert.deepEqual(p.conquistasDesbloqueadas,['part_1']);
  assert.equal(p.seasonHistory.length,1);assert.equal(p.competition.points,0);
  assert.equal(db.state['seasons/2026-10'].results,undefined);assert.equal(db.state['seasons/2026-10/results/student'].points,100);
  assert.equal(db.state['settings/season'].id,monthlySeason(november()).id);
});
