import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {AREAS_ADMINISTRACAO,normalizeQuestion,questionKey} from '../src/domain/questions.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const input=path.join(root,'content/bank');
const files=fs.readdirSync(input).filter(f=>f.endsWith('.txt')).sort();
const edition='2026-10-09-balanced-1680';
const questions=[],report=[];
const level=(i,total)=>i<total*.5?'Fácil':i<total*.8?'Médio':'Difícil';
// Use the same descriptive style for correct statements and distractors. Modal
// wording such as "pode" must not reveal the answer. Original complete claims
// remain in the feedback, including their conditions and qualifications.
function description(value) {
  let text=value.replace(/^Pode(?:m)? /,'');
  const direct=[
    [/^(?:É|São) (?:definid[oa]s?|caracterizad[oa]s?) (?:como|por|pelo|pela) /,''],
    [/^(?:Se define|Se definem) (?:por|pela|pelo) /,''],
    [/^(?:É|São) (?:sinônimo|sinônimos) de /,''],
    [/^(?:É|São) /,''],
    [/^(?:Corresponde|Correspondem|Equivale|Equivalem) (?:a|ao|à) /,''],
  ];
  for(const [re,replacement] of direct)if(re.test(text)){text=text.replace(re,replacement);break;}
  const verbs=[
    ['explicitar','Explicita|Explicitam','Explicitação de'],['expressar','Expressa|Expressam','Expressão de'],
    ['detalhar','Detalha|Detalham','Detalhamento de'],['descrever','Descreve|Descrevem','Descrição de'],
    ['influenciar','Influencia|Influenciam','Influência sobre'],['abranger','Abrange|Abrangem','Inclusão de'],
    ['incluir','Inclui|Incluem','Abrangência de'],['envolver','Envolve|Envolvem','Envolvimento de'],
    ['usar','Usa|Usam','Uso de'],['utilizar','Utiliza|Utilizam','Utilização de'],
    ['considerar','Considera|Consideram','Consideração de'],['exigir','Exige|Exigem','Necessidade de'],
    ['apoiar','Apoia|Apoiam','Apoio a'],['reduzir','Reduz|Reduzem','Redução de'],
    ['aumentar','Aumenta|Aumentam','Aumento de'],['definir','Define|Definem','Definição de'],
    ['combinar','Combina|Combinam','Combinação de'],['alterar','Altera|Alteram','Alteração de'],
    ['registrar','Registra|Registram','Registro de'],['examinar','Examina|Examinam','Exame de'],
    ['representar','Representa|Representam','Representação de'],['orientar','Orienta|Orientam','Orientação de'],
    ['comparar','Compara|Comparam','Comparação de'],['permitir','Permite|Permitem','Permissão para'],
    ['estimular','Estimula|Estimulam','Estímulo a'],['relacionar','Relaciona|Relacionam','Relação de'],
    ['conectar','Conecta|Conectam','Conexão de'],['concentrar','Concentra|Concentram','Concentração de'],
    ['acompanhar','Acompanha|Acompanham','Acompanhamento de'],['proteger','Protege|Protegem','Proteção de'],
    ['afetar','Afeta|Afetam','Efeito sobre'],['distribuir','Distribui|Distribuem','Distribuição de'],
    ['identificar','Identifica|Identificam','Identificação de'],['ampliar','Amplia|Ampliam','Ampliação de'],
    ['avaliar','Avalia|Avaliam','Avaliação de'],['calcular','Calcula|Calculam','Cálculo de'],
    ['facilitar','Facilita|Facilitam','Facilitação de'],['gerar','Gera|Geram','Geração de'],
    ['oferecer','Oferece|Oferecem','Oferta de'],['eliminar','Elimina|Eliminam','Eliminação de'],
    ['produzir','Produz|Produzem','Produção de'],['retornar','Retorna|Retornam','Retorno de'],
    ['admitir','Admite|Admitem','Admissão de'],['aceitar','Aceita|Aceitam','Aceitação de'],
    ['prever','Prevê|Preveem','Previsão de'],['impedir','Impede|Impedem','Impedimento de'],
    ['fixar','Fixa|Fixam','Fixação de'],['substituir','Substitui|Substituem','Substituição de'],
    ['garantir','Garante|Garantem','Garantia de'],['organizar','Organiza|Organizam','Organização de'],
    ['coordenar','Coordena|Coordenam','Coordenação de'],['obter','Obtém|Obtêm','Obtenção de'],
    ['verificar','Verifica|Verificam','Verificação de'],['reconhecer','Reconhece|Reconhecem','Reconhecimento de'],
    ['estabelecer','Estabelece|Estabelecem','Estabelecimento de'],['controlar','Controla|Controlam','Controle de'],
    ['mobilizar','Mobiliza|Mobilizam','Mobilização de'],['conservar','Conserva|Conservam','Conservação de'],
    ['compartilhar','Compartilha|Compartilham','Compartilhamento de'],['incentivar','Incentiva|Incentivam','Incentivo a'],
    ['esclarecer','Esclarece|Esclarecem','Esclarecimento de'],['mostrar','Mostra|Mostram','Exibição de'],
    ['medir','Mede|Medem','Medição de'],['investigar','Investiga|Investigam','Investigação de'],
    ['expor','Expõe|Expõem','Exposição de'],['reforçar','Reforça|Reforçam','Reforço de'],
    ['condicionar','Condiciona|Condicionam','Condicionamento de'],['priorizar','Prioriza|Priorizam','Priorização de'],
    ['repor','Repõe|Repõem','Reposição'],['coletar','Coleta|Coletam','Coleta de'],
    ['padronizar','Padroniza|Padronizam','Padronização de'],['ignorar','Ignora|Ignoram','Desconsideração de'],
    ['articular','Articula|Articulam','Articulação de'],['remunerar','Remunera|Remuneram','Remuneração de'],
    ['internalizar','Internaliza|Internalizam','Internalização de'],['consumir','Consome|Consomem','Consumo de'],
    ['automatizar','Automatiza|Automatizam','Automação de'],['replicar','Replica|Replicam','Replicação de'],
    ['filtrar','Filtra|Filtram','Filtragem de'],['replicar','Replica|Replicam','Replicação de'],
    ['reproduzir','Reproduz|Reproduzem','Reprodução de'],['restabelecer','Restabelece|Restabelecem','Restabelecimento de'],
    ['retirar','Retira|Retiram','Retirada de'],['modificar','Modifica|Modificam','Modificação de'],
    ['limitar','Limita|Limitam','Limitação de'],['preservar','Preserva|Preservam','Preservação de'],
    ['restaurar','Restaura|Restauram','Restauração de'],['estudar','Estuda|Estudam','Estudo de'],
  ];
  for(const [inf,present,noun] of verbs) {
    const re=new RegExp(`^(?:${inf}|${present}) `,'i');
    if(re.test(text)){text=text.replace(re,noun+' ');break;}
  }
  text=text.replace(/^(?:Consideração|Envolvimento|Abrangência) de /,'');
  text=text.replace(/^a? influência de /i,'Influência de ')
    .replace(/^Ser afetados por /,'Efeitos de ').replace(/^Ser compartilhado pela /,'Compartilhamento pela ')
    .replace(/^Ser registrado em /,'Registro em ').replace(/^Ser transmitido por /,'Transmissão por ')
    .replace(/^Ser examinada em /,'Exame em ').replace(/^Ser usado em /,'Uso em ')
    .replace(/^Ser usada em /,'Uso em ').replace(/^Ser preparado /,'Preparação ')
    .replace(/^Ser revisada /,'Revisão ').replace(/^Ser objeto de /,'Objeto de ')
    .replace(/^Ser percebido /,'Percepção ').replace(/^Ser calculados /,'Cálculo ')
    .replace(/^Ser usados /,'Uso ').replace(/^Ser utilizado[s]? /,'Utilização ')
    .replace(/^Estar dentro da /,'Presença dentro da ').replace(/^Estar em /,'Presença em ')
    .replace(/^Ter /,'Presença de ').replace(/^Terem /,'Presença de ')
    .replace(/^Ocorrer /,'Ocorrência ').replace(/^Variar com /,'Variação conforme ')
    .replace(/^Diferir da /,'Diferença em relação à ').replace(/^Depender de /,'Dependência de ')
    .replace(/^Começar em /,'Início em ').replace(/^Continuar após /,'Continuidade após ');
  text=text.replace(/\bde as /g,'das ').replace(/\bde os /g,'dos ')
    .replace(/\bde a /g,'da ').replace(/\bde o /g,'do ')
    .replace(/\ba as /g,'às ').replace(/\ba os /g,'aos ')
    .replace(/\ba a /g,'à ').replace(/\ba o /g,'ao ');
  return text.charAt(0).toUpperCase()+text.slice(1);
}
for(let areaIndex=0;areaIndex<files.length;areaIndex++) {
  const file=files[areaIndex],area=AREAS_ADMINISTRACAO[areaIndex];
  const blocks={MC:[],VF:[],MR:[]};let section;
  for(const line of fs.readFileSync(path.join(input,file),'utf8').split(/\r?\n/).map(s=>s.trim())) {
    if(!line||line.startsWith('#'))continue;
    if(/^\[(MC|VF|MR)\]$/.test(line)){section=line.slice(1,-1);continue;}
    assert.ok(section,`${file}: missing section`);blocks[section].push(line.split('|').map(s=>s.trim()));
  }
  for(const [s,n] of [['MC',60],['VF',40],['MR',40]]) assert.equal(blocks[s].length,n,`${file} ${s}`);
  const append=(q,topic,i)=>questions.push({...normalizeQuestion(q),ativo:true,...(q.grupoPedagogico?{grupoPedagogico:q.grupoPedagogico}:{}),edicaoBanco:edition,objetivo:`${areaIndex+1}:${q.formato}:${topic}`,idBanco:`balanced-${areaIndex+1}-${q.formato}-${i+1}`});
  blocks.MC.forEach(([term,definition,...rest],i)=>{
    assert.ok(term&&definition&&!rest.length,`${file} MC ${i}`);
    const peers=blocks.MC.slice(Math.floor(i/5)*5,Math.floor(i/5)*5+5);
    const other=peers.filter(([t])=>t!==term).map(([,d])=>d);
    const alternativas=[...other];alternativas.splice(i%5,0,definition);
    append({disciplina:area,formato:'multipla',dificuldade:level(i,60),tipo:'Conceitos e definições',
      pergunta:`Qual é a definição de «${term}»?`,alternativas,respostaCorreta:i%5,
      grupoPedagogico:`${areaIndex+1}:mc:${Math.floor(i/5)}`,
      explicacao:`${term}: ${definition}. ${peers.filter(([t])=>t!==term).map(([t,d])=>`${t}: ${d}.`).join(' ')}`},term,i);
  });
  blocks.VF.forEach(([term,definition,...rest],i)=>{
    assert.ok(term&&definition&&!rest.length,`${file} VF ${i}`);
    // Two true and two false statements in each four-item block. No negation cue.
    const truth=[true,false,false,true][i%4];
    const group=blocks.VF.slice(Math.floor(i/5)*5,Math.floor(i/5)*5+5);
    const falsePeers=group.filter((_,j)=>![true,false,false,true][(Math.floor(i/5)*5+j)%4]);
    const peer=falsePeers[(falsePeers.findIndex(([t])=>t===term)+1)%falsePeers.length];
    append({disciplina:area,formato:'vf',dificuldade:level(i,40),tipo:'Conceitos e definições',
      pergunta:`«${term}» é a denominação de: ${truth?definition:peer[1]}.`,alternativas:['Verdadeiro','Falso'],respostaCorreta:truth?0:1,
      explicacao:`${term}: ${definition}.${truth?'':` A definição apresentada corresponde a ${peer[0]}.`}`},term,i);
  });
  blocks.MR.forEach(([term,...items],i)=>{
    assert.equal(items.length,4,`${file} MR ${term}: four statements required`);
    const alternativas=[],correct=[],explanations=[];
    items.forEach((item,index)=>{
      assert.ok(/^[+-]/.test(item),`${file} MR ${term}: statement marker`);
      const [statement,correction,...extra]=item.slice(1).split('~');
      assert.ok(statement&&!extra.length,`${file} MR ${term}: malformed statement`);
      if(item.startsWith('+')){correct.push(index);explanations.push(`${statement}.`);}
      else {assert.ok(correction,`${file} MR ${term}: correction required`);explanations.push(`${correction}.`);}
      alternativas.push(description(statement));
    });
    // Rotate authored options; the app shuffles again independently for each quiz.
    const shift=i%4;
    const order=[0,1,2,3].map(j=>(j+shift)%4);
    append({disciplina:area,formato:'multipla_resposta',dificuldade:level(i,40),tipo:'Conceitos e definições',
      pergunta:`Quais descrições se aplicam a «${term}»?`,alternativas:order.map(j=>alternativas[j]),
      respostasCorretas:order.flatMap((j,k)=>correct.includes(j)?[k]:[]),explicacoesAlternativas:order.map(j=>explanations[j]),
      explicacao:correct.map(j=>explanations[j]).join(' ')},term,i);
  });
  report.push({categoria:area,multipla:60,vf:40,multipla_resposta:40});
}
assert.equal(files.length,12,'All twelve curricula must be authored before release');
assert.equal(questions.length,1680);
assert.equal(new Set(questions.map(questionKey)).size,1680,'Duplicate stems');
assert.equal(new Set(questions.map(q=>q.objetivo)).size,1680,'Duplicate learning objectives');
const output=JSON.stringify(questions,null,2)+'\n';
if(process.argv.includes('--check'))assert.equal(fs.readFileSync(path.join(root,'src/data/balancedQuestions.json'),'utf8'),output,'Generated bank differs from editorial sources');
else fs.writeFileSync(path.join(root,'src/data/balancedQuestions.json'),output);
console.log(JSON.stringify({edition,total:questions.length,distribution:report},null,2));
