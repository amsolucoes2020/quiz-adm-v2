import React,{useState,useEffect,useRef} from 'react';
import {messageRequest} from '../services/messages';
import {MESSAGE_ADMIN_UID} from '../domain/messaging';
const date=value=>new Date(value).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'});
const merge=(old,rows)=>[...new Map([...old,...rows].map(row=>[row.id,row])).values()].sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id));

export default function MessageInbox({uid}) {
  const [contacts,setContacts]=useState([]),[items,setItems]=useState([]),[inboxCursor,setInboxCursor]=useState(null);
  const [active,setActive]=useState(null),[conversation,setConversation]=useState(null),[messages,setMessages]=useState([]),[cursor,setCursor]=useState(null);
  const [compose,setCompose]=useState(false),[recipient,setRecipient]=useState(''),[search,setSearch]=useState(''),[text,setText]=useState('');
  const [filter,setFilter]=useState('all'),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [requestId,setRequestId]=useState(()=>crypto.randomUUID());
  const generation=useRef(0),locked=useRef(false);
  const historyExpanded=useRef(false),inboxExpanded=useRef(false);
  async function inbox(more=false) {
    const page=await messageRequest('inbox',more?{cursor:inboxCursor}:{});
    if(more)inboxExpanded.current=true;
    setItems(old=>more||inboxExpanded.current?[...new Map([...old,...page.items].map(row=>[row.id,row])).values()].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)):page.items);
    if(more||!inboxExpanded.current)setInboxCursor(page.cursor);
  }
  useEffect(()=>{
    let live=true;
    async function refresh(){try{const page=await messageRequest('inbox');if(live){setItems(old=>inboxExpanded.current?[...new Map([...old,...page.items].map(row=>[row.id,row])).values()].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)):page.items);if(!inboxExpanded.current)setInboxCursor(page.cursor);}}catch(err){if(live)setError(err.message);}finally{if(live)setLoading(false);}}
    messageRequest('contacts').then(result=>{if(live)setContacts(result.contacts);}).catch(err=>{if(live)setError(err.message);});
    refresh();const timer=setInterval(()=>{if(!document.hidden)refresh();},20000);
    return()=>{live=false;clearInterval(timer);};
  },[uid]);
  useEffect(()=>{
    const current=++generation.current;if(!active){setConversation(null);setMessages([]);return;}
    historyExpanded.current=false;setCursor(null);setMessages([]);setConversation(null);setError('');setLoading(true);
    async function refresh(){try{
      const page=await messageRequest('conversation',{threadId:active});
      if(generation.current!==current)return;
      setConversation(page.thread);setMessages(old=>merge(old,page.messages));if(!historyExpanded.current)setCursor(page.cursor);
      if(page.thread.unread){await messageRequest('markRead',{threadId:active,updatedAt:page.thread.updatedAt});if(generation.current===current)await inbox();}
    }catch(err){if(generation.current===current)setError(err.message);}finally{if(generation.current===current)setLoading(false);}}
    refresh();const timer=setInterval(()=>{if(!document.hidden)refresh();},20000);
    return()=>{generation.current++;clearInterval(timer);};
  },[active]);
  const other=thread=>thread.names.find(person=>person.uid!==uid)?.nome||'Usuário';
  async function send(event) {
    event.preventDefault();if(locked.current||!text.trim())return;
    locked.current=true;setBusy(true);setError('');
    try {
      const result=await messageRequest('send',{requestId,text,...(compose?{recipient}:{threadId:active})});
      setText('');setRequestId(crypto.randomUUID());setCompose(false);
      if(active===result.threadId){const page=await messageRequest('conversation',{threadId:active});setConversation(page.thread);setMessages(old=>merge(old,page.messages));}
      else setActive(result.threadId);
      await inbox();
    }catch(err){setError(err.message);}finally{locked.current=false;setBusy(false);}
  }
  return <section className="space-y-4">
    <div className="flex justify-between items-center"><h3 className="font-bold text-indigo-300">Mensagens</h3>
      <button disabled={busy} onClick={()=>{setActive(null);setCompose(true);setText('');setRecipient(uid===MESSAGE_ADMIN_UID?'':MESSAGE_ADMIN_UID);setRequestId(crypto.randomUUID());setError('');}} className="bg-indigo-600 px-3 py-2 text-sm rounded-lg">Nova mensagem</button>
    </div>
    <p className="text-xs text-slate-400">Converse com colegas ou com a administração. Cada conversa é privada entre seus participantes.</p>
    {error&&<p role="alert" className="text-sm text-red-300">{error}</p>}
    {!active&&!compose&&<>
      <label className="block text-xs text-slate-300">Mostrar<select value={filter} onChange={event=>setFilter(event.target.value)} className="ml-2 rounded bg-slate-800 p-2"><option value="all">Todas</option><option value="unread">Não lidas</option><option value="question">Revisões de questões</option></select></label>
      {loading&&<p role="status" className="text-sm text-slate-400">Carregando mensagens…</p>}
      {!loading&&!items.filter(item=>filter==='all'||(filter==='unread'?item.unread:item.type==='question')).length&&<p className="text-sm text-slate-400">Nenhuma conversa neste filtro.</p>}
      <div className="space-y-2">{items.filter(item=>filter==='all'||(filter==='unread'?item.unread:item.type==='question')).map(item=><button key={item.id} onClick={()=>{setActive(item.id);setText('');setRequestId(crypto.randomUUID());}} className="w-full text-left p-4 rounded-xl border border-slate-700 bg-slate-800">
        <div className="flex justify-between gap-2"><span className="font-semibold text-sm">{other(item)} {item.unread&&<span className="text-xs text-emerald-300">· Nova</span>}</span><span className="text-[10px] text-slate-400">{date(item.updatedAt)}</span></div>
        {item.type==='question'&&<p className="text-xs text-indigo-300 mt-1">{item.subject} · {item.status==='resolved'?'Revisada':'Em revisão'}</p>}
        <p className="text-xs text-slate-400 mt-1 break-words">{item.preview}</p>
      </button>)}</div>
      {inboxCursor&&<button onClick={()=>inbox(true).catch(err=>setError(err.message))} className="text-sm text-indigo-300 underline">Carregar mais conversas</button>}
    </>}
    {(active||compose)&&<div className="rounded-xl bg-slate-800 border border-slate-700 p-4 space-y-4">
      <button disabled={busy} className="text-xs text-indigo-300 underline" onClick={()=>{setActive(null);setCompose(false);setText('');setError('');}}>Voltar à caixa de mensagens</button>
      {compose?<>
        <label className="block text-sm">Buscar usuário<input value={search} onChange={event=>setSearch(event.target.value)} className="block w-full mt-1 rounded-lg bg-slate-900 p-2" placeholder="Nome ou turma"/></label>
        <label className="block text-sm">Destinatário<select required value={recipient} onChange={event=>{setRecipient(event.target.value);setRequestId(crypto.randomUUID());}} className="block w-full mt-1 rounded-lg bg-slate-900 p-2"><option value="">Selecione</option>{contacts.filter(person=>person.uid===recipient||`${person.nome} ${person.turma}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))).map(person=><option key={person.uid} value={person.uid}>{person.nome}{person.turma?` · ${person.turma}`:''}</option>)}</select></label>
      </>:conversation?<>
        <h4 className="font-semibold">{other(conversation)}</h4>
        {conversation.question&&<details className="text-xs rounded-lg bg-slate-900 p-3"><summary className="cursor-pointer text-indigo-300">Questão em revisão · {conversation.status==='resolved'?'Revisada':'Em revisão'}</summary>
          <p className="mt-3 leading-relaxed">{conversation.question.pergunta}</p>
          <ul className="mt-2 space-y-1">{conversation.question.alternativas.map((option,i)=><li key={i} className={conversation.question.correct.includes(i)?'text-emerald-300':'text-slate-300'}>{option}{conversation.question.correct.includes(i)?' · Gabarito':''}{conversation.question.selected.includes(i)?' · Resposta do aluno':''}</li>)}</ul>
          <p className="mt-3 text-slate-400">{conversation.question.explicacao}</p>
        </details>}
        {uid===MESSAGE_ADMIN_UID&&conversation.type==='question'&&conversation.status!=='resolved'&&<button disabled={busy} className="text-xs text-emerald-300 underline" onClick={async()=>{setBusy(true);try{await messageRequest('resolve',{threadId:active});setConversation(old=>({...old,status:'resolved'}));await inbox();}catch(err){setError(err.message);}finally{setBusy(false);}}}>Marcar revisão como concluída</button>}
        {cursor&&<button className="text-xs text-indigo-300 underline" onClick={async()=>{try{const page=await messageRequest('conversation',{threadId:active,cursor});historyExpanded.current=true;setMessages(old=>merge(old,page.messages));setCursor(page.cursor);}catch(err){setError(err.message);}}}>Ver mensagens anteriores</button>}
        <div className="max-h-96 overflow-y-auto space-y-3" aria-label="Conversa">{messages.map(message=><div key={message.id} className={`rounded-lg p-3 text-sm ${message.sender===uid?'bg-indigo-950 ml-6':'bg-slate-900 mr-6'}`}><p className="text-xs text-indigo-300 mb-1">{message.sender===uid?'Você':other(conversation)}</p><p className="whitespace-pre-wrap break-words">{message.text}</p><time className="block text-[10px] text-slate-400 mt-2">{date(message.createdAt)}</time></div>)}</div>
      </>:<p role="status" className="text-sm text-slate-400">Carregando conversa…</p>}
      {(compose||conversation)&&<form onSubmit={send} className="space-y-2"><label className="block text-sm">Mensagem<textarea required maxLength={2000} rows={3} disabled={busy} value={text} onChange={event=>{setText(event.target.value);setRequestId(crypto.randomUUID());}} className="block w-full mt-1 rounded-lg bg-slate-900 p-3"/></label><button disabled={busy||!text.trim()||(compose&&!recipient)} className="bg-indigo-600 rounded-lg px-4 py-2 text-sm disabled:opacity-50">{busy?'Enviando…':'Enviar mensagem'}</button></form>}
    </div>}
  </section>;
}
