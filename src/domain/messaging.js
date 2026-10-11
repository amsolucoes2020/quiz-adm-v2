export const MESSAGE_ADMIN_UID='ktCddjGUigN8Spm6x9wrdFgzBZy2';
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const uid=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(value);
function text(value,max) {
  if(typeof value!=='string'||!value.trim()||value.trim().length>max)fail(`Escreva uma mensagem de até ${max} caracteres.`);
  return value.trim();
}
async function key(values) {
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(values)));
  return [...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');
}
function participant(thread,actor) {
  if(!thread||!thread.participants.includes(actor))fail('Conversa não encontrada.',404);
}
const summary=(thread,actor)=>({id:thread.id,type:thread.type,participants:thread.participants,names:thread.names,
  subject:thread.subject,status:thread.status,updatedAt:thread.updatedAt,preview:thread.preview,unread:thread.unreadFor.includes(actor)});

// All storage access goes through the authenticated API in production. The local
// adapter runs the same validation and authorization against the sandbox store.
export async function messaging(store,actor,action,body={},clock=()=>new Date()) {
  if(!uid(actor))fail('Entre novamente para continuar.',401);
  const profile=await store.get(`users/${actor}`);
  if(!profile)fail('Complete seu perfil para usar as mensagens.',403);
  if(action==='contacts') {
    const rows=await store.list('rankings',{limit:1000});
    const contacts=rows.items.filter(row=>row.id!==actor&&row.id!==MESSAGE_ADMIN_UID).map(row=>({uid:row.id,nome:row.data.nome||'Usuário',turma:row.data.turma||''}));
    contacts.sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
    return {contacts:[...(actor!==MESSAGE_ADMIN_UID?[{uid:MESSAGE_ADMIN_UID,nome:'Administração',turma:''}]:[]),...contacts]};
  }
  if(action==='inbox') {
    const result=await store.list(`mailboxes/${actor}/threads`,{orderBy:'updatedAt',direction:'desc',limit:50,cursor:body.cursor});
    return {items:result.items.map(row=>({...row.data,id:row.id})),cursor:result.cursor};
  }
  if(action==='unread') {
    const page=await store.list(`mailboxes/${actor}/threads`,{filter:{field:'unread',value:true},limit:1});
    return {unread:page.items.length>0};
  }
  if(['conversation','markRead','resolve'].includes(action)) {
    if(!uid(body.threadId))fail('Conversa inválida.');
    const path=`conversations/${body.threadId}`, thread=await store.get(path);
    participant(thread,actor);
    if(action==='conversation') {
      const page=await store.list(`${path}/messages`,{orderBy:'createdAt',direction:'desc',limit:50,cursor:body.cursor});
      return {thread:{...summary(thread,actor),question:thread.question||null},messages:page.items.map(row=>({id:row.id,...row.data})).reverse(),cursor:page.cursor};
    }
    return store.transaction(async tx=>{
      const current=await tx.get(path);participant(current,actor);
      if(action==='markRead'&&body.updatedAt&&current.updatedAt!==body.updatedAt)return {ok:true};
      if(action==='resolve') {
        if(actor!==MESSAGE_ADMIN_UID||current.type!=='question')fail('Somente a administração pode concluir a revisão.',403);
        current.status='resolved';
        current.updatedAt=clock().toISOString();
        current.unreadFor=current.participants.filter(value=>value!==actor);
      } else current.unreadFor=current.unreadFor.filter(value=>value!==actor);
      tx.set(path,current);
      for(const member of current.participants)tx.set(`mailboxes/${member}/threads/${current.id}`,summary(current,member));
      return {ok:true};
    });
  }
  if(!['send','report'].includes(action))fail('Operação desconhecida.');
  if(typeof body.requestId!=='string'||!/^[A-Za-z0-9_-]{8,80}$/.test(body.requestId))fail('Identificador de envio inválido.');
  const content=text(body.text,2000);
  const receiptKey=await key([actor,body.requestId]);
  const receiptPath=`messageReceipts/${receiptKey}`;
  let recipient=body.recipient,threadId=body.threadId;
  if(action==='report') {
    if(actor===MESSAGE_ADMIN_UID)fail('A administração já pode revisar as questões pelo painel.');
    recipient=MESSAGE_ADMIN_UID;
    if(!uid(body.questionId))fail('Questão inválida.');
    threadId=await key(['report',actor,body.requestId]);
  } else if(!threadId) {
    if(!uid(recipient)||recipient===actor)fail('Escolha outro usuário como destinatário.');
    threadId=await key(['direct',...[actor,recipient].sort()]);
  }
  if(!uid(threadId))fail('Conversa inválida.');
  const signature=await key([action,threadId,recipient||null,content,body.questionId||null,body.alternativas||null,body.selected??null]);
  return store.transaction(async tx=>{
    const receipt=await tx.get(receiptPath);
    if(receipt) {
      if(receipt.signature!==signature)fail('Esse envio já foi utilizado. Atualize a página e tente novamente.');
      return {threadId:receipt.threadId,duplicate:true};
    }
    const path=`conversations/${threadId}`;
    let thread=await tx.get(path);
    if(thread) {
      participant(thread,actor);
      recipient=thread.participants.find(value=>value!==actor);
    }
    if(!uid(recipient)||recipient===actor)fail('Destinatário inválido.');
    const target=await tx.get(`users/${recipient}`);
    if(!target)fail('O destinatário ainda não tem um perfil disponível.',404);
    const limitPath=`messageLimits/${actor}`,previous=await tx.get(limitPath);
    const now=clock(),instant=now.toISOString(),millis=+now;
    const minute=previous&&millis-previous.windowStart<60000?previous.count:0;
    const day=instant.slice(0,10),daily=previous?.day===day?previous.daily:0;
    if(minute>=10||daily>=200)fail('Você enviou muitas mensagens. Aguarde antes de enviar novamente.',429);
    let question;
    if(action==='report') {
      const stored=await tx.get(`questions/${body.questionId}`);
      if(!stored||stored.ativo===false)fail('Questão não disponível para revisão.',404);
      const options=body.alternativas;
      if(!Array.isArray(options)||options.length!==stored.alternativas.length||new Set(options).size!==options.length||options.some(option=>!stored.alternativas.includes(option)))fail('As alternativas da questão mudaram. Atualize o quiz.');
      const chosen=body.selected===null?[]:Array.isArray(body.selected)?body.selected:[body.selected];
      if(new Set(chosen).size!==chosen.length||chosen.some(i=>!Number.isInteger(i)||i<0||i>=options.length))fail('Resposta selecionada inválida.');
      question={id:body.questionId,disciplina:stored.disciplina,pergunta:stored.pergunta,alternativas:stored.alternativas,
        correct:stored.formato==='multipla_resposta'?stored.respostasCorretas:[stored.respostaCorreta],
        selected:chosen.map(i=>stored.alternativas.indexOf(options[i])),explicacao:stored.explicacao};
    }
    if(!thread)thread={id:threadId,type:action==='report'?'question':'direct',participants:[actor,recipient],
      names:[{uid:actor,nome:actor===MESSAGE_ADMIN_UID?'Administração':profile.nome},{uid:recipient,nome:recipient===MESSAGE_ADMIN_UID?'Administração':target.nome}],
      subject:question?`Revisão: ${question.disciplina}`:'Conversa',status:'open',unreadFor:[],...(question?{question}:{})};
    thread.updatedAt=instant;thread.preview=content.slice(0,160);
    thread.unreadFor=[...new Set([...thread.unreadFor,recipient])].filter(value=>value!==actor);
    if(thread.type==='question'&&actor!==MESSAGE_ADMIN_UID)thread.status='open';
    tx.set(path,thread);
    tx.set(`${path}/messages/${receiptKey}`,{sender:actor,text:content,createdAt:instant});
    for(const member of thread.participants)tx.set(`mailboxes/${member}/threads/${threadId}`,summary(thread,member));
    tx.set(receiptPath,{signature,threadId});
    tx.set(limitPath,{windowStart:minute?previous.windowStart:millis,count:minute+1,day,daily:daily+1});
    return {threadId,duplicate:false};
  });
}
