import React from 'react';
import {gradeAnswer} from '../domain/questions';

export default function MultipleAnswerOptions({question,selected,onChange,confirmed,disabled,remaining}) {
  const choices=Array.isArray(selected)?selected:[];
  const grade=gradeAnswer(question,choices,remaining);
  return <div className="space-y-3 mb-6">
    {!question.pergunta.includes('Selecione todas as alternativas corretas') && <p className="text-sm text-indigo-300">Selecione todas as alternativas corretas.</p>}
    {question.alternativas.map((text,index)=>{
      const checked=choices.includes(index), expected=question.respostasCorretas.includes(index);
      const style=confirmed ? expected?'border-emerald-500 bg-emerald-950/60':checked?'border-red-500 bg-red-950/60':'border-slate-700 bg-slate-900' : checked?'border-indigo-500 bg-indigo-950':'border-slate-700 bg-slate-900';
      return <div key={index} className={`border rounded-xl p-3 ${style}`}>
        <label className="flex items-start gap-3 text-sm cursor-pointer">
          <input type="checkbox" className="mt-1 h-4 w-4" checked={checked} disabled={disabled||confirmed}
            onChange={()=>onChange(checked?choices.filter(i=>i!==index):[...choices,index])}/>
          <span>{text}</span>
        </label>
      </div>;
    })}
    {confirmed && <div role="status" className="text-sm bg-slate-900 border border-indigo-500/30 rounded-xl p-3">
      <p className="font-semibold">{remaining===0?'Tempo esgotado.':grade.correct?'Resposta completa!':'Resposta não totalmente correta.'}</p>
    </div>}
  </div>;
}
