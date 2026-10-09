import {normalizeQuestion} from '../src/domain/questions.js';

// Rebuild grading from the stored question; never trust a client answer key or difficulty.
export function canonicalEvent(raw,stored) {
  if(!raw || typeof raw.id!=='string' || raw.id.length>160 || !['answer','finish'].includes(raw.type) || typeof raw.review!=='boolean') throw new Error('Evento inválido.');
  if(raw.type==='finish') {
    if(!/^[\w-]+:finish$/.test(raw.id) || !Number.isInteger(raw.total) || raw.total<1 || raw.total>10) throw new Error('Conclusão inválida.');
    return {id:raw.id,type:'finish',total:raw.total,review:raw.review};
  }
  if(!/^[\w-]+:answer:[0-9]$/.test(raw.id)) throw new Error('Resposta inválida.');
  const q=normalizeQuestion(stored);
  const limit=q.formato==='vf'?30:60;
  if(!Number.isInteger(raw.remaining)||raw.remaining<0||raw.remaining>limit) throw new Error('Tempo inválido.');
  const shown=raw.question?.alternativas;
  if(!Array.isArray(shown)||shown.length!==q.alternativas.length||new Set(shown).size!==shown.length||shown.some(a=>!q.alternativas.includes(a))) throw new Error('Alternativas inválidas.');
  const selected=q.formato==='multipla_resposta'?raw.selected:raw.selected===null?[]:[raw.selected];
  if(!Array.isArray(selected)||new Set(selected).size!==selected.length||selected.some(i=>!Number.isInteger(i)||i<0||i>=shown.length)) throw new Error('Seleção inválida.');
  const mapped=selected.map(i=>q.alternativas.indexOf(shown[i]));
  return {id:raw.id,type:'answer',review:raw.review,remaining:raw.remaining,
    question:{...q,id:raw.question.id},selected:q.formato==='multipla_resposta'?mapped:mapped[0]??null};
}
