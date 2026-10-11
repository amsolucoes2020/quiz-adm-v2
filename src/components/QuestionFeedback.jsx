import React,{useState} from 'react';
import {messageRequest} from '../services/messages';

export default function QuestionFeedback({question,selected}) {
  const [open,setOpen]=useState(false),[text,setText]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
  const [requestId,setRequestId]=useState(()=>crypto.randomUUID());
  return <div className="mt-4 border-t border-slate-700 pt-3">
    {!open&&!notice&&<button type="button" className="text-indigo-300 underline text-xs" onClick={()=>setOpen(true)}>Discorda do gabarito? Enviar feedback</button>}
    {notice&&<p role="status" className="text-emerald-300">{notice}</p>}
    {open&&<form onSubmit={async event=>{
      event.preventDefault();if(busy||!text.trim())return;setBusy(true);setError('');
      try {
        await messageRequest('report',{requestId,text,questionId:question.id,alternativas:question.alternativas,selected:selected??null});
        setNotice('Feedback enviado à administração. Acompanhe a resposta em Mensagens.');setOpen(false);setText('');
      } catch(err){setError(err.message);}finally{setBusy(false);}
    }} className="space-y-2">
      <label className="block text-slate-300">O que você considera incorreto?
        <textarea required maxLength={2000} rows={3} value={text} disabled={busy} onChange={event=>{setText(event.target.value);setRequestId(crypto.randomUUID());}}
          className="mt-2 block w-full rounded-lg bg-slate-800 border border-slate-600 p-3 text-sm text-white" placeholder="Explique sua dúvida. Se possível, indique uma referência."/>
      </label>
      <p className="text-slate-400">A questão e o gabarito serão enviados junto com seu comentário.</p>
      {error&&<p role="alert" className="text-red-300">{error}</p>}
      <div className="flex gap-3"><button disabled={busy||!text.trim()} className="bg-indigo-600 rounded-lg px-3 py-2 disabled:opacity-50">{busy?'Enviando…':'Enviar feedback'}</button>
        <button type="button" disabled={busy} onClick={()=>setOpen(false)} className="text-slate-300">Cancelar</button></div>
    </form>}
  </div>;
}
