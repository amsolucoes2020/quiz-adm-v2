export const AREAS_ADMINISTRACAO = [
  'Administração e Gestão', 'Gestão de Pessoas', 'Gestão Financeira e Contábil',
  'Marketing e Vendas', 'Empreendedorismo', 'Materiais e Logística',
  'Produção e Qualidade', 'Estratégia e Processos', 'Direito, Legislação e Ética',
  'Tecnologia e Ferramentas Administrativas', 'Excel', 'Economia e Atualidades'
];

const aliases = {
  'Administração Geral': 'Administração e Gestão',
  'Finanças': 'Gestão Financeira e Contábil',
  'Administração Financeira': 'Gestão Financeira e Contábil',
  'Marketing': 'Marketing e Vendas'
};
export const normalizeText = value => value.normalize('NFC').trim().replace(/\s+/g, ' ');
export const questionKey = q => normalizeText(q.pergunta).toLocaleLowerCase('pt-BR');

export function normalizeQuestion(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Questão inválida.');
  for (const key of ['disciplina', 'pergunta', 'dificuldade', 'explicacao']) {
    if (typeof raw[key] !== 'string' || !raw[key].trim()) throw new Error(`Campo obrigatório: ${key}.`);
  }
  const disciplina = aliases[normalizeText(raw.disciplina)] || normalizeText(raw.disciplina);
  if (!AREAS_ADMINISTRACAO.includes(disciplina)) throw new Error(`Disciplina desconhecida: ${disciplina}.`);
  if (!['Fácil', 'Médio', 'Difícil', 'Especialista'].includes(raw.dificuldade)) throw new Error('Dificuldade inválida.');
  const formato = raw.formato || 'multipla';
  if (!['vf','multipla','multipla_resposta'].includes(formato)) throw new Error('Formato inválido.');
  const multiple = formato === 'multipla_resposta';
  const count = formato === 'vf' ? 2 : multiple ? 4 : 5;
  if (formato === 'vf' && JSON.stringify(raw.alternativas) !== JSON.stringify(['Verdadeiro','Falso'])) throw new Error('Use Verdadeiro e Falso, nessa ordem.');
  if (!Array.isArray(raw.alternativas) || raw.alternativas.length !== count ||
      raw.alternativas.some(a => typeof a !== 'string' || !a.trim())) throw new Error(`Informe ${count} alternativas válidas.`);
  const alternativas = raw.alternativas.map(a => normalizeText(a).replace(/^[A-Ea-e]\s*[).:\-]\s*/, '').trim());
  if (alternativas.some(a => !a) || new Set(alternativas.map(a => a.toLocaleLowerCase('pt-BR'))).size !== count) {
    throw new Error('As alternativas precisam ser preenchidas e diferentes.');
  }
  if (!multiple && (!Number.isInteger(raw.respostaCorreta) || raw.respostaCorreta < 0 || raw.respostaCorreta >= count)) {
    throw new Error(`O gabarito deve ser um número inteiro entre 0 e ${count-1}.`);
  }
  const metadata = {};
  if(raw.grupoPedagogico !== undefined) {
    if(typeof raw.grupoPedagogico!=='string'||!raw.grupoPedagogico.trim()||raw.grupoPedagogico.length>100) throw new Error('Grupo pedagógico inválido.');
    metadata.grupoPedagogico=raw.grupoPedagogico;
  }
  if (multiple) {
    if (!Array.isArray(raw.respostasCorretas) || raw.respostasCorretas.length < 2 || raw.respostasCorretas.length > 4 ||
        new Set(raw.respostasCorretas).size !== raw.respostasCorretas.length || raw.respostasCorretas.some(i=>!Number.isInteger(i)||i<0||i>=4)) throw new Error('Informe de 2 a 4 índices corretos, sem repetição.');
    if (!Array.isArray(raw.explicacoesAlternativas) || raw.explicacoesAlternativas.length !== 4 || raw.explicacoesAlternativas.some(e=>typeof e!=='string'||!e.trim())) throw new Error('Explique cada uma das quatro alternativas.');
    metadata.respostasCorretas = [...raw.respostasCorretas].sort((a,b)=>a-b);
    metadata.explicacoesAlternativas = raw.explicacoesAlternativas.map(e=>e.trim());
  }
  if (raw.fonte !== undefined) {
    let url;
    try { url = new URL(raw.fonte); } catch { throw new Error('Fonte deve ser um endereço HTTPS válido.'); }
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Fonte deve usar HTTPS sem credenciais.');
    metadata.fonte = url.href;
  }
  if (raw.dataReferencia !== undefined) {
    if (typeof raw.dataReferencia !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw.dataReferencia) ||
        !Number.isFinite(Date.parse(raw.dataReferencia)) || new Date(raw.dataReferencia).toISOString().slice(0,10) !== raw.dataReferencia) throw new Error('Data de referência inválida.');
    metadata.dataReferencia = raw.dataReferencia;
  }
  return { ...metadata, formato, disciplina, dificuldade: raw.dificuldade, tipo: typeof raw.tipo === 'string' ? raw.tipo.trim() || 'Geral' : 'Geral',
    pergunta: normalizeText(raw.pergunta), alternativas, ...(!multiple ? {respostaCorreta:raw.respostaCorreta} : {}), explicacao: raw.explicacao.trim() };
}

export function validateImport(raw, existing = []) {
  if (!Array.isArray(raw) || !raw.length) throw new Error('O arquivo precisa conter uma lista de questões.');
  const seen = new Set(existing.filter(q => typeof q?.pergunta === 'string').map(questionKey));
  let duplicates = 0;
  const questions = [];
  raw.forEach((item, index) => {
    let q;
    try { q = normalizeQuestion(item); } catch (error) { throw new Error(`Questão ${index + 1}: ${error.message}`); }
    const key = questionKey(q);
    if (seen.has(key)) duplicates++;
    else { seen.add(key); questions.push(q); }
  });
  return { questions, duplicates };
}

export function shuffleArray(array, random = Math.random) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function prepareQuestions(source, user, count = 10) {
  const answered = user?.questoesRespondidasHoje || [];
  const wrong = user?.questoesErradasHoje || [];
  const unique = [...new Map(source.map(q => [questionKey(q), q])).values()];
  const diversify = pool => {
    const seen = new Set(),first=[],rest=[];
    for(const q of shuffleArray(pool)) {
      const group=q.grupoPedagogico||q.id||questionKey(q);
      if(seen.has(group))rest.push(q);else {seen.add(group);first.push(q);}
    }
    return [...first,...rest];
  };
  const ordered = [
    ...diversify(unique.filter(q => !answered.includes(q.id))),
    ...diversify(unique.filter(q => answered.includes(q.id) && !wrong.includes(q.id))),
    ...diversify(unique.filter(q => answered.includes(q.id) && wrong.includes(q.id)))
  ];
  return ordered.slice(0, count).map(q => {
    if (q.formato === 'vf') return {...q};
    const alternatives = shuffleArray(q.alternativas.map((text, index) => ({ text, correct: q.formato==='multipla_resposta' ? q.respostasCorretas.includes(index) : index === q.respostaCorreta, explanation:q.explicacoesAlternativas?.[index] })));
    if(q.formato==='multipla_resposta') return {...q,alternativas:alternatives.map(a=>a.text),respostasCorretas:alternatives.flatMap((a,i)=>a.correct?[i]:[]),explicacoesAlternativas:alternatives.map(a=>a.explanation)};
    return { ...q, alternativas: alternatives.map(a => a.text), respostaCorreta: alternatives.findIndex(a => a.correct) };
  });
}

export function gradeAnswer(question, selected, remaining) {
  if(question.formato!=='multipla_resposta') return {correct:remaining>0 && selected===question.respostaCorreta};
  const choices=Array.isArray(selected)?selected:[];
  const valid=choices.every(i=>Number.isInteger(i)&&i>=0&&i<4)&&new Set(choices).size===choices.length;
  const identified=[...new Set(choices)].filter(i=>question.respostasCorretas.includes(i)).length;
  const incorrect=[...new Set(choices)].filter(i=>!question.respostasCorretas.includes(i)).length;
  return {correct:remaining>0&&valid&&identified===question.respostasCorretas.length&&incorrect===0,
    identified,expected:question.respostasCorretas.length,incorrect};
}
