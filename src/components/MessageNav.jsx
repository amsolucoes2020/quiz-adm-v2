import React,{useEffect,useState} from 'react';
import {messageRequest} from '../services/messages';
export default function MessageNav({uid,active,onOpen}) {
  const [unread,setUnread]=useState(false);
  useEffect(()=>{
    let live=true;
    async function refresh(){try{const result=await messageRequest('unread');if(live)setUnread(result.unread);}catch{/* Inbox displays actionable errors when opened. */}}
    refresh();const timer=setInterval(()=>{if(!document.hidden)refresh();},60000);
    return()=>{live=false;clearInterval(timer);};
  },[uid,active]);
  return <button onClick={onOpen} className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${active?'bg-indigo-600 text-white':'text-slate-400 hover:text-white'}`}>✉️ Mensagens{unread&&<span className="ml-1 text-emerald-300" aria-label="Há mensagens não lidas">●</span>}</button>;
}
