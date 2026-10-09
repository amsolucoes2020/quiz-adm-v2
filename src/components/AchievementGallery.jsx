import React, {useState} from 'react';
import {CONQUISTAS_SISTEMA} from '../domain/gamification';

const legacyProgress = {
  part_1:[10,u=>u.questoesRespondidas || 0], part_2:[3,u=>u.quizzesRealizados || 0], part_3:[6,u=>u.quizzesRealizados || 0],part_4:[10,u=>u.quizzesRealizados || 0],
  ...Object.fromEntries([1,25,50,100,150].map((target,i)=>[`des_${i+1}`,[target,u=>u.questoesAcertadas || 0]])),
  cat_1:[3,u=>Object.values(u.categoriasRespondidas || {}).filter(n=>n>=10).length],
  cat_2:[5,u=>Object.keys(u.categoriasRespondidas || {}).length],cat_3:[12,u=>Object.keys(u.categoriasRespondidas || {}).length]
};
function progress(item,data) {
  const rule = item.progresso ? [item.alvo,item.progresso] : legacyProgress[item.id];
  return rule ? {target:rule[0],value:Math.min(rule[0],Math.max(0,rule[1](data)))} : null;
}
export default function AchievementGallery({data}) {
  const [category,setCategory]=useState('Todas');
  const [status,setStatus]=useState('Todas');
  const unlocked=data.conquistasDesbloqueadas || [];
  const categories=['Todas',...new Set(CONQUISTAS_SISTEMA.map(a=>a.cat))];
  const items=CONQUISTAS_SISTEMA.filter(a=>(category==='Todas'||a.cat===category)&&(status==='Todas'||(status==='Conquistadas')===unlocked.includes(a.id)));
  const next=CONQUISTAS_SISTEMA.filter(a=>!a.secreta&&!unlocked.includes(a.id)&&progress(a,data)).sort((a,b)=>{
    const p=progress(a,data),q=progress(b,data);return q.value/q.target-p.value/p.target;
  }).slice(0,3);
  return <section className="bg-slate-900 p-4 rounded-xl border border-slate-700 space-y-4">
    <div><h3 className="font-bold">🏆 Sua coleção · {CONQUISTAS_SISTEMA.filter(a=>unlocked.includes(a.id)).length}/{CONQUISTAS_SISTEMA.length}</h3>
      <p className="text-xs text-slate-400 mt-1">Conquistas permanentes: continuam nas próximas temporadas.</p></div>
    {next.length>0&&<div className="bg-indigo-950/50 rounded-lg p-3"><p className="text-xs font-bold text-indigo-300 mb-2">Seus próximos objetivos</p>{next.map(a=>{
      const p=progress(a,data);return <p key={a.id} className="text-xs text-slate-300 py-1">{a.nome} · {p.value}/{p.target}</p>;
    })}</div>}
    <div className="grid grid-cols-2 gap-2">
      <label className="text-xs text-slate-300">Categoria da conquista<select value={category} onChange={e=>setCategory(e.target.value)} className="block w-full bg-slate-800 p-2 rounded mt-1">{categories.map(c=><option key={c}>{c}</option>)}</select></label>
      <label className="text-xs text-slate-300">Situação<select value={status} onChange={e=>setStatus(e.target.value)} className="block w-full bg-slate-800 p-2 rounded mt-1">{['Todas','Em progresso','Conquistadas'].map(s=><option key={s}>{s}</option>)}</select></label>
    </div>
    <p className="text-xs text-slate-400">Os novos registros de modos, domínio e recuperação começam nesta atualização. Totais e conquistas anteriores foram mantidos.</p>
    <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
      {items.length===0&&<p className="text-sm text-slate-400 py-4">Nenhuma conquista neste filtro.</p>}
      {items.map(item=>{
        const owned=unlocked.includes(item.id),secret=item.secreta&&!owned,p=progress(item,data);
        return <article key={item.id} className={`rounded-xl border p-3 ${owned?'border-emerald-500/40 bg-emerald-950/20':'border-slate-700 bg-slate-800/40'}`}>
          <div className="flex gap-3 items-start"><span className="text-2xl" aria-hidden="true">{owned?item.icone:secret?'🔒':item.icone}</span><div className="min-w-0 flex-1">
            <h4 className="font-semibold text-sm">{secret?'Conquista secreta':item.nome} {owned?'✓':''}</h4>
            <p className="text-xs text-slate-400 mt-1">{secret?'Continue explorando para descobrir.':item.desc}</p>
            <p className="text-xs text-emerald-300 mt-2">{item.xp?`+${item.xp} XP`:'Medalha de sequência · bônus diário separado'}</p>
            {!owned&&!secret&&p&&<div className="mt-2"><p className="text-xs text-slate-400">{p.value} / {p.target}</p><progress className="w-full h-2" max={p.target} value={p.value} aria-label={`Progresso: ${item.nome}`} /></div>}
          </div></div>
        </article>;
      })}
    </div>
  </section>;
}
