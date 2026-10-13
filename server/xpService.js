import {initialProgress,resetPeriods} from '../src/domain/periods.js';
import {DEFAULT_MISSIONS} from '../src/domain/gamification.js';
import {applyQuizEvent} from '../src/domain/progress.js';
import {canonicalEvent} from './events.js';
import {isDeferred} from './questionBank.js';
const ADMIN_UID='ktCddjGUigN8Spm6x9wrdFgzBZy2';
const clean=value=>JSON.parse(JSON.stringify(value));
export const xpRow=(uid,data)=>({uid,nome:data.nome,pontuacaoGeral:data.pontuacaoGeral||0});
export async function performXP(db,identity,action,payload={},clock=()=>new Date()) {
  if(action==='loadSeason')return {name:'XP geral',leaguesEnabled:false};
  return db.runTransaction(async tx=>{
    const ref=db.doc(`users/${identity.uid}`),original=(await tx.get(ref)).data(),now=clock();
    if(action==='createProfile') {
      if(original)return original;
      if(!identity.email)throw new Error('Sua conta precisa ter e-mail.');
      const fields={};
      for(const key of ['nome','curso','turma','unidade']) {
        const value=payload.data?.[key];
        if(typeof value!=='string'||!value.trim()||value.trim().length>200)throw new Error('Preencha os dados do cadastro com até 200 caracteres.');
        fields[key]=value.trim();
      }
      const profile={...fields,uid:identity.uid,email:identity.email,isAdmin:identity.uid===ADMIN_UID,...initialProgress('XP geral',now)};
      tx.set(ref,profile);tx.set(db.doc(`rankings/${identity.uid}`),xpRow(identity.uid,profile));return profile;
    }
    if(!original){if(action==='loadProfile')return null;throw new Error('Perfil não encontrado.');}
    let result;
    if(action==='loadProfile')result={data:{...resetPeriods(original,DEFAULT_MISSIONS,now),isAdmin:identity.uid===ADMIN_UID}};
    else if(action==='saveQuizEvent') {
      let question;const event=payload.event;
      if(event?.type==='answer') {
        const id=event.question?.id;
        if(typeof id!=='string'||!id||id.length>200||id.includes('/'))throw new Error('Questão inválida.');
        question=(await tx.get(db.doc(`questions/${id}`))).data();
        if(!question||isDeferred(question))throw new Error('Questão indisponível. Inicie uma nova partida.');
      }
      const validated=canonicalEvent(event,question),duplicate=(original.recentQuizEvents||[]).find(e=>e.id===validated.id);
      if(!duplicate&&validated.type==='answer') {
        const index=Number(validated.id.split(':answer:')[1]),id=validated.id.split(':answer:')[0];
        const expected=original.partidaAtual?.id===id?original.partidaAtual.answers.length:0;
        if(index!==expected||expected>=10||original.partidaAtual?.id===id&&original.partidaAtual.finished)throw new Error('Ordem das respostas inválida. Inicie uma nova partida.');
      }
      result=applyQuizEvent(original,validated,now,{singleXP:true});
    } else throw new Error('Operação desconhecida.');
    if(JSON.stringify(result.data)!==JSON.stringify(original))tx.set(ref,clean(result.data));
    tx.set(db.doc(`rankings/${identity.uid}`),xpRow(identity.uid,result.data));
    return action==='loadProfile'?result.data:result;
  });
}
