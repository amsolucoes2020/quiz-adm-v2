import test from 'node:test';
import assert from 'node:assert/strict';
import {messaging,MESSAGE_ADMIN_UID as admin} from '../src/domain/messaging.js';
import {questions} from '../server/questionBank.js';
function store() {
  const state=Object.fromEntries(['alice','bob','eve',admin].flatMap(id=>[
    [`users/${id}`,{nome:id,email:'private@example.invalid',pontuacaoGeral:123,isAdmin:id===admin}],
    [`rankings/${id}`,{nome:id,turma:'A',email:'private@example.invalid',pontuacaoGeral:123}]
  ]));
  let queue=Promise.resolve();
  const get=path=>structuredClone(state[path]);
  return {state,get:async path=>get(path),
    list:async(path,options={})=>{
      let rows=Object.entries(state).filter(([key])=>key.startsWith(path+'/')&&key.split('/').length===path.split('/').length+1).map(([path,data])=>({id:path.split('/').at(-1),data:structuredClone(data)}));
      if(options.filter)rows=rows.filter(row=>row.data[options.filter.field]===options.filter.value);
      rows.sort((a,b)=>(options.orderBy?String(a.data[options.orderBy]).localeCompare(String(b.data[options.orderBy]))||a.id.localeCompare(b.id):a.id.localeCompare(b.id))*(options.direction==='desc'?-1:1));
      if(options.cursor)rows=rows.slice(rows.findIndex(row=>row.id===options.cursor)+1);
      const items=rows.slice(0,options.limit||50);return {items,cursor:items.length<rows.length?items.at(-1).id:null};
    },
    transaction:fn=>{const pending=queue.then(async()=>{
      const writes=[];let writing=false;
      const result=await fn({get:async path=>{assert.equal(writing,false,'reads precede writes');return get(path);},set:(path,value)=>{writing=true;writes.push([path,structuredClone(value)]);}});
      for(const [path,value] of writes)state[path]=value;return result;
    });queue=pending.catch(()=>{});return pending;}
  };
}
const clock=()=>new Date('2026-10-11T18:00:00Z');
const run=(s,actor,action,body={})=>messaging(s,actor,action,body,clock);
const payload={requestId:'request-0001',recipient:'bob',text:'Olá, colega!'};

test('messages are private, server attributes authorship and contacts expose no private profile data',async()=>{
  const s=store(),before=structuredClone(s.state['users/alice']);
  const result=await run(s,'alice','send',{...payload,sender:'eve',participants:['eve']});
  const alice=await run(s,'alice','conversation',result),bob=await run(s,'bob','conversation',result);
  assert.equal(alice.messages[0].sender,'alice');assert.equal(bob.messages[0].text,payload.text);
  assert.equal(bob.thread.unread,true);assert.equal(alice.thread.unread,false);
  assert.equal((await run(s,'bob','unread')).unread,true);assert.equal((await run(s,'alice','unread')).unread,false);
  for(const outsider of ['eve',admin]) {
    await assert.rejects(run(s,outsider,'conversation',result),{status:404});
    await assert.rejects(run(s,outsider,'send',{...result,requestId:'forged-0001',text:'Intrusão'}),{status:404});
    await assert.rejects(run(s,outsider,'markRead',result),{status:404});
    assert.equal((await run(s,outsider,'inbox')).items.length,0);
  }
  const contacts=await run(s,'alice','contacts');
  assert.equal(contacts.contacts[0].uid,admin);
  assert.ok(contacts.contacts.every(row=>!('email' in row)&&!('pontuacaoGeral' in row)));
  assert.deepEqual(s.state['users/alice'],before);
});

test('simultaneous retries write one message and different content cannot reuse a receipt',async()=>{
  const s=store();const results=await Promise.all([run(s,'alice','send',payload),run(s,'alice','send',payload)]);
  assert.equal(results[0].threadId,results[1].threadId);assert.equal(results[1].duplicate,true);
  assert.equal((await run(s,'bob','conversation',results[0])).messages.length,1);
  await assert.rejects(run(s,'alice','send',{...payload,text:'Mudou'}));
  assert.equal(s.state['messageLimits/alice'].count,1);
});

test('reply uses existing participants and an old read watermark cannot hide a newer message',async()=>{
  const s=store(),result=await run(s,'alice','send',payload);
  await run(s,'bob','markRead',{...result,updatedAt:'old'});
  assert.equal((await run(s,'bob','inbox')).items[0].unread,true);
  await run(s,'bob','markRead',{...result,updatedAt:clock().toISOString()});
  assert.equal((await run(s,'bob','inbox')).items[0].unread,false);
  await run(s,'bob','send',{...result,recipient:'eve',text:'Resposta',requestId:'reply-00001'});
  assert.equal((await run(s,'alice','inbox')).items[0].unread,true);
  assert.equal((await run(s,'eve','inbox')).items.length,0);
});

test('reports snapshot real answer keys in all formats and map shuffled selected answers',async()=>{
  const s=store();
  for(const format of ['multipla','vf','multipla_resposta']) {
    const question=questions.find(q=>q.formato===format),id=question.idBanco;s.state[`questions/${id}`]=question;
    const shown=[...question.alternativas].reverse();
    const expected=format==='multipla_resposta'?question.respostasCorretas:[question.respostaCorreta];
    const chosen=expected.map(i=>shown.indexOf(question.alternativas[i]));
    const result=await run(s,'alice','report',{requestId:`report-${format}`,questionId:id,alternativas:shown,selected:format==='multipla_resposta'?chosen:chosen[0],text:'Peço uma revisão.',recipient:'eve',respostaCorreta:99});
    const report=(await run(s,admin,'conversation',result)).thread;
    assert.deepEqual(report.participants,['alice',admin]);assert.deepEqual(report.question.correct,expected);
    assert.deepEqual([...report.question.selected].sort((a,b)=>a-b),expected);assert.equal(report.question.pergunta,question.pergunta);
    await assert.rejects(run(s,'bob','conversation',result),{status:404});
    await assert.rejects(run(s,'alice','resolve',result),{status:403});
    await run(s,admin,'send',{...result,requestId:`reply-${format}`,text:'Vamos conferir a referência.'});
    await run(s,admin,'resolve',result);
    assert.equal((await run(s,'alice','conversation',result)).thread.status,'resolved');
    await run(s,'alice','send',{...result,requestId:`follow-${format}`,text:'Tenho outra referência.'});
    assert.equal((await run(s,admin,'conversation',result)).thread.status,'open');
  }
});

test('invalid recipients, paths, forged options and oversized text make no writes',async()=>{
  const s=store(),before=JSON.stringify(s.state),q=questions[0];s.state[`questions/${q.idBanco}`]=q;
  for(const invalid of [{recipient:'alice'},{recipient:'missing'},{threadId:'../users/alice'},{text:' '},{text:'x'.repeat(2001)},{requestId:'../../x'}])await assert.rejects(run(s,'alice','send',{...payload,...invalid}));
  await assert.rejects(run(s,'missing','inbox'),{status:403});
  await assert.rejects(run(s,'alice','report',{requestId:'report-forged',text:'Revisão',questionId:q.idBanco,alternativas:['forged',...q.alternativas.slice(1)],selected:0}));
  delete s.state[`questions/${q.idBanco}`];assert.equal(JSON.stringify(s.state),before);
});

test('transactional rate limit blocks new sends but allows a retry without an extra charge',async()=>{
  const s=store();
  for(let i=0;i<10;i++)await run(s,'alice','send',{...payload,requestId:`send-${String(i).padStart(8,'0')}`});
  await assert.rejects(run(s,'alice','send',{...payload,requestId:'send-blocked'}),{status:429});
  assert.equal((await run(s,'alice','send',{...payload,requestId:'send-00000000'})).duplicate,true);
  assert.equal(s.state['messageLimits/alice'].count,10);
});

test('inbox and message history paginate within the participant namespace',async()=>{
  const s=store();let result;
  for(let i=0;i<55;i++)result=await messaging(s,'alice','send',{...payload,requestId:`history-${String(i).padStart(8,'0')}`,text:`Mensagem ${i}`},()=>new Date(+clock()+i*61000));
  const first=await run(s,'bob','conversation',result),second=await run(s,'bob','conversation',{...result,cursor:first.cursor});
  assert.equal(first.messages.length,50);assert.equal(second.messages.length,5);assert.equal(second.cursor,null);
  assert.equal(new Set([...first.messages,...second.messages].map(row=>row.id)).size,55);
});
