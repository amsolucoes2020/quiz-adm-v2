import {syncCompetition,competitionRow,enrollCompetition} from '../src/domain/competition.js';
import {initialProgress,resetPeriods} from '../src/domain/periods.js';
import {DEFAULT_MISSIONS} from '../src/domain/gamification.js';
import {applyQuizEvent} from '../src/domain/progress.js';
import {canonicalEvent} from './events.js';
import {isDeferred} from './questionBank.js';

export const ADMIN_UID='ktCddjGUigN8Spm6x9wrdFgzBZy2';
const clean=value=>JSON.parse(JSON.stringify(value));
const active=(season,now)=>season?.id && +now>=Date.parse(season.startAt) && +now<Date.parse(season.endAt);

function writeState(tx,db,before,after) {
  const changes=Object.entries(after).filter(([path,value])=>JSON.stringify(before[path])!==JSON.stringify(value));
  // Leave the whole transaction untouched if the deployment outgrows the request size.
  if(Buffer.byteLength(JSON.stringify(changes))>8*1024*1024) throw new Error('Temporada excedeu a capacidade desta operação. Contate o administrador.');
  for(const [path,value] of changes) {
    if(path.startsWith('seasons/') && value.results) {
      const {results,...season}=value;
      tx.set(db.doc(path),{...season,participants:results.length});
      for(const result of results) tx.set(db.doc(`${path}/results/${result.uid}`),clean(result));
    } else tx.set(db.doc(path),clean(value));
  }
}

export async function ensureCompetition(db,clock=()=>new Date()) {
  return db.runTransaction(async tx=>{
    const now=clock(), ref=db.doc('settings/season'), snapshot=await tx.get(ref);
    const season=snapshot.data();
    if(active(season,now)) return season;
    const profiles=await tx.get(db.collection('users'));
    const before={'settings/season':season,...Object.fromEntries(profiles.docs.map(d=>[`users/${d.id}`,d.data()]))};
    const after=syncCompetition(before,now);
    writeState(tx,db,before,after);
    return after['settings/season'];
  });
}

// All registrations share the season document, preventing two concurrent signups
// from taking the final seat in the same room.
async function enrollProfile(db,identity,details,clock) {
  return db.runTransaction(async tx=>{
    const now=clock(), ref=db.doc(`users/${identity.uid}`);
    const seasonSnap=await tx.get(db.doc('settings/season'));
    const snapshot=await tx.get(ref), season=seasonSnap.data();
    if(!active(season,now)) throw Object.assign(new Error('A temporada mudou. Tente novamente.'),{retrySeason:true});
    if(snapshot.data()?.competition) return snapshot.data();
    if(!snapshot.exists && !details) return null;
    const rankings=await tx.get(db.collection('rankings'));
    let profile=snapshot.data();
    if(!profile) {
      if(!identity.email) throw new Error('Sua conta precisa ter e-mail.');
      const fields={};
      for(const key of ['nome','curso','turma','unidade']) {
        if(typeof details?.[key]!=='string'||!details[key].trim()||details[key].trim().length>200) throw new Error('Preencha os dados do cadastro com até 200 caracteres.');
        fields[key]=details[key].trim();
      }
      profile={...fields,uid:identity.uid,email:identity.email,isAdmin:identity.uid===ADMIN_UID,...initialProgress(season.name,now)};
    }
    profile={...profile,temporadaAtual:season.name,competition:enrollCompetition(season,now)};
    const input={'settings/season':season,[`users/${identity.uid}`]:profile};
    for(const row of rankings.docs) if(row.id!==identity.uid) input[`users/${row.id}`]=row.data();
    const enrolled=syncCompetition(input,now)[`users/${identity.uid}`];
    tx.set(ref,clean(enrolled));
    tx.set(db.doc(`rankings/${identity.uid}`),clean(competitionRow(identity.uid,enrolled)));
    tx.update(db.doc('settings/season'),{rosterRevision:(season.rosterRevision||0)+1});
    return enrolled;
  });
}

export async function perform(db,identity,action,payload={},clock=()=>new Date()) {
  for(let attempt=0;attempt<3;attempt++) {
    await ensureCompetition(db,clock);
    try {
      if(action==='loadSeason') return (await db.doc('settings/season').get()).data();
      const enrolled=await enrollProfile(db,identity,action==='createProfile'?payload.data:null,clock);
      if(action==='createProfile') return enrolled;
      if(!enrolled) {
        if(action==='loadProfile') return null;
        throw new Error('Perfil não encontrado.');
      }
      return await db.runTransaction(async tx=>{
        const now=clock(), ref=db.doc(`users/${identity.uid}`);
        const season=(await tx.get(db.doc('settings/season'))).data();
        const snapshot=await tx.get(ref);
        if(!active(season,now)||snapshot.data()?.competition?.seasonId!==season.id) throw Object.assign(new Error('A temporada mudou. Tente novamente.'),{retrySeason:true});
        const original=snapshot.data();
        let result;
        if(action==='loadProfile') result={data:{...resetPeriods(original,DEFAULT_MISSIONS,now),isAdmin:identity.uid===ADMIN_UID}};
        else if(action==='saveQuizEvent') {
          const event=payload.event;
          let question;
          if(event?.type==='answer') {
            const id=event.question?.id;
            if(typeof id!=='string'||!id||id.length>200||id.includes('/')) throw new Error('Questão inválida.');
            question=(await tx.get(db.doc(`questions/${id}`))).data();
            if(!question||isDeferred(question)) throw new Error('Questão indisponível. Inicie uma nova partida.');
          }
          const validated=canonicalEvent(event,question);
          const duplicate=(original.recentQuizEvents||[]).find(e=>e.id===validated.id);
          if(!duplicate && validated.type==='answer') {
            const index=Number(validated.id.split(':answer:')[1]), id=validated.id.split(':answer:')[0];
            const expected=original.partidaAtual?.id===id?original.partidaAtual.answers.length:0;
            if(index!==expected || expected>=10 || original.partidaAtual?.id===id && original.partidaAtual.finished) throw new Error('Ordem das respostas inválida. Inicie uma nova partida.');
          }
          result=applyQuizEvent(original,validated,now);
        } else throw new Error('Operação desconhecida.');
        if(JSON.stringify(result.data)!==JSON.stringify(original)) {
          tx.set(ref,clean(result.data));
          tx.set(db.doc(`rankings/${identity.uid}`),clean(competitionRow(identity.uid,result.data)));
        }
        return action==='loadProfile'?result.data:result;
      });
    } catch(error) {
      if(!error.retrySeason || attempt===2) throw error;
    }
  }
}
