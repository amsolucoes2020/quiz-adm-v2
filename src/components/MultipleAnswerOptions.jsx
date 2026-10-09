import React from 'react';
import {gradeAnswer} from '../domain/questions';

export default function MultipleAnswerOptions({question,selected,onChange,confirmed,disabled,remaining}) {
  const choices=Array.isArray(selected)?selected:[];
  const grade=gradeAnswer(question,choices,remaining);
  return <div className="space-y-3 mb-6">
    {!question.pergunta.includes('Selecione todas as alternativas corretas') && <p className="text-sm text-indigo-300">Selecione todas as alternativas corretas.</p>}
    {question.alternativas.map((text,index)=>{
      const checked=choices.includes(index), expected=question.respostasCorretas.includes(index);
      const style=confirmed ? expected?'border-emerald-500 bg-emerald-950/60':'border-slate-700 bg-slate-900' : checked?'border-indigo-500 bg-indigo-950':'border-slate-700 bg-slate-900';
      return <div key={index} className={`border rounded-xl p-3 ${style}`}>
        <label className="flex items-start gap-3 text-sm cursor-pointer">
          <input type="checkbox" className="mt-1 h-4 w-4" checked={checked} disabled={disabled||confirmed}
            onChange={()=>onChange(checked?choices.filter(i=>i!==index):[...choices,index])}/>
          <span>{text}</span>
        </label>
        {confirmed && <div className="mt-2 text-xs text-slate-300">
          <p className={expected?'text-emerald-300':checked?'text-red-300':'text-slate-400'}>{expected?(checked?'✓ Correta selecionada':'○ Correta não selecionada'):(checked?'✗ Incorreta selecionada':'✓ Incorreta não selecionada')}</p>
          <p className="mt-1">{question.explicacoesAlternativas[index]}</p>
        </div>}
      </div>;
    })}
    {confirmed && <div role="status" className="text-sm bg-slate-900 border border-indigo-500/30 rounded-xl p-3">
      <p className="font-semibold">{remaining===0?'Tempo esgotado.':grade.correct?'Resposta completa!':'Resposta não totalmente correta.'}</p>
      <p>Você identificou {grade.identified} das {grade.expected} alternativas corretas e marcou {grade.incorrect} incorreta(s).</p>
    </div>}
  </div>;
}
