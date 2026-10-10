import fs from 'node:fs';
import {normalizeQuestion,questionKey,AREAS_ADMINISTRACAO} from '../src/domain/questions.js';
const bank=JSON.parse(fs.readFileSync(new URL('../src/data/balancedQuestions.json',import.meta.url)));
const fold=s=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
// A shared working situation must not mask duplicated concepts or inflate similarity.
const conceptStem=s=>s
  .replace(/^.*?Nesse contexto, qual descrição corresponde ao conceito de /u,'Qual é a definição de ')
  .replace(/^.*?Avalie a afirmação: /u,'')
  .replace(/^.*?Sobre («[^»]+»), selecione as descrições corretas\.$/u,'Quais descrições se aplicam a $1?');
const substantive=s=>fold(s).split(' ').filter(w=>!['qual','quais','e','a','o','de','do','da','as','os','se','aplicam','sobre','selecione','afirmacoes','descricoes','corretas','denominacao','definicao','corresponde','contexto','organizacional','organizacionais','funcao'].includes(w));
const duplicates=[],near=[],cues=[],lengths=[];
const seen=new Map();
const words=new Map();
bank.forEach((raw,i)=>{
  normalizeQuestion(raw);const key=fold(conceptStem(raw.pergunta));
  if(seen.has(key))duplicates.push([seen.get(key),i]);else seen.set(key,i);
  if(raw.formato!=='vf')raw.alternativas.forEach((text,j)=>{
    const correct=raw.formato==='multipla'?raw.respostaCorreta===j:raw.respostasCorretas.includes(j);
    if(/(?<!\p{L})(?:sempre|nunca|qualquer|todos|apenas|somente|exclusivamente)(?!\p{L})/iu.test(text))cues.push({id:raw.idBanco,correct,alternative:text});
    if(raw.formato==='multipla_resposta') for(const word of new Set(fold(text).split(' '))) {
      const record=words.get(word)||{true:0,false:0};record[correct?'true':'false']++;words.set(word,record);
    }
  });
  if(raw.formato==='multipla') {
    const count=raw.alternativas.map(a=>a.split(/\s+/).length),correct=count[raw.respostaCorreta];
    if(correct>Math.min(...count)*2.5)lengths.push({id:raw.idBanco,counts:count});
  }
});
for(let i=0;i<bank.length;i++)for(let j=i+1;j<bank.length;j++) {
  const a=bank[i],b=bank[j];if(a.disciplina!==b.disciplina)continue;
  const x=new Set(substantive(conceptStem(a.pergunta))),y=new Set(substantive(conceptStem(b.pergunta)));
  if(x.size<2||y.size<2)continue;
  const overlap=[...x].filter(w=>y.has(w)).length;
  const similarity=overlap/(x.size+y.size-overlap);
  if(similarity>=.8)near.push({a:a.idBanco,b:b.idBanco,similarity,stems:[a.pergunta,b.pergunta]});
}
const predictors=[...words].filter(([w,c])=>w.length>3&&c.true+c.false>=35).map(([word,c])=>({word,...c,purity:Math.max(c.true,c.false)/(c.true+c.false)})).filter(c=>c.purity>.88).sort((a,b)=>b.true+b.false-a.true-a.false);
const distribution=AREAS_ADMINISTRACAO.map(area=>({area,formats:Object.fromEntries(['multipla','vf','multipla_resposta'].map(f=>[f,bank.filter(q=>q.disciplina===area&&q.formato===f).length]))}));
const report={total:bank.length,duplicates,near,cues,longCorrectAlternatives:lengths,lexicalReview:predictors,distribution};
fs.mkdirSync(new URL('../.local/',import.meta.url),{recursive:true});
fs.writeFileSync(new URL('../.local/bank-editorial-audit.json',import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify({total:bank.length,duplicates:duplicates.length,near:near.length,cues:cues.length,longCorrectAlternatives:lengths.length,lexicalReview:predictors},null,2));
if(duplicates.length)process.exitCode=1;
