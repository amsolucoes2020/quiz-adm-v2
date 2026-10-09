import fs from 'node:fs';
import assert from 'node:assert/strict';
import {cert,initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {questions,isDeferred} from '../server/questionBank.js';
import {AREAS_ADMINISTRACAO,validateImport} from '../src/domain/questions.js';
const credentialArg=process.argv.indexOf('--credential');
const account=JSON.parse(credentialArg>=0?fs.readFileSync(process.argv[credentialArg+1],'utf8'):process.env.FIREBASE_SERVICE_ACCOUNT_JSON||'null');
assert.equal(account?.project_id,'quiz-administracao','Explicit credentials for the existing project are required');
initializeApp({credential:cert(account)});
const db=getFirestore(),edition='2026-10-09-balanced-1680';
assert.equal(questions.length,1680);assert.equal(validateImport(questions).duplicates,0);
for(const area of AREAS_ADMINISTRACAO)for(const [format,n] of [['multipla',60],['vf',40],['multipla_resposta',40]])assert.equal(questions.filter(q=>q.disciplina===area&&q.formato===format).length,n);
const expected=new Map(questions.map(q=>[q.idBanco,q]));
const [existing,profiles]=await Promise.all([db.collection('questions').get(),db.collection('users').get()]);
const archive=existing.docs.filter(d=>!expected.has(d.id));
for(const d of archive)assert.ok(isDeferred(d.data()),'Unreviewed question detected: refresh the audit before publishing');
for(const d of existing.docs.filter(d=>expected.has(d.id)))assert.equal(d.data().edicaoBanco,edition,'Question ID collision');
console.log(JSON.stringify({mode:process.argv.includes('--apply')?'apply':'dry-run',activeTarget:questions.length,archive:archive.length,profilesUntouched:profiles.size,new:questions.filter(q=>!existing.docs.some(d=>d.id===q.idBanco)).length}));
if(!process.argv.includes('--apply'))process.exit(0);
fs.mkdirSync('.local',{recursive:true});
const backup=`.local/bank-backup-${Date.now()}.json`;
fs.writeFileSync(backup,JSON.stringify(existing.docs.map(d=>({id:d.id,data:d.data()})),null,2));
const writes=[...questions.map(q=>({ref:db.doc(`questions/${q.idBanco}`),data:q,method:'set'})),
  ...archive.filter(d=>d.data().ativo!==false).map(d=>({ref:d.ref,data:{ativo:false},method:'update'}))];
for(let i=0;i<writes.length;i+=300) {
  const batch=db.batch();for(const w of writes.slice(i,i+300))batch[w.method](w.ref,w.data);
  await batch.commit();console.log(JSON.stringify({questionWritesCompleted:Math.min(i+300,writes.length),total:writes.length}));
}
const [after,afterProfiles]=await Promise.all([db.collection('questions').get(),db.collection('users').get()]);
const active=after.docs.filter(d=>!isDeferred(d.data()));assert.equal(active.length,1680);
for(const d of active)assert.deepEqual(d.data(),expected.get(d.id));
for(const old of profiles.docs) {
  const current=afterProfiles.docs.find(d=>d.id===old.id);assert.ok(current,'Existing profile must remain');
  assert.ok((current.data().pontuacaoGeral||0)>=(old.data().pontuacaoGeral||0),'This migration must not reduce XP');
}
await db.doc('settings/questionBank').set({edition,active:1680,archived:archive.length,formats:{multipla:720,vf:480,multipla_resposta:480},publishedAt:new Date().toISOString()});
console.log(JSON.stringify({status:'verified',active:active.length,archived:archive.length,profiles:afterProfiles.size,backup}));
