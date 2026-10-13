import { collection, doc, getDocs, runTransaction, writeBatch } from '@backend';
import { auth, db, isSandbox } from '@backend';
import { resetPeriods } from '../domain/periods';
import { DEFAULT_MISSIONS } from '../domain/gamification';
import { applyQuizEvent } from '../domain/progress';
import { validateImport } from '../domain/questions';

const ADMIN_UID = 'ktCddjGUigN8Spm6x9wrdFgzBZy2';
const assertAdmin = () => {
  if (auth.currentUser?.uid !== ADMIN_UID) throw new Error('Acesso restrito ao administrador.');
};
const publicProfile = (uid,data)=>({uid,nome:data.nome,pontuacaoGeral:data.pontuacaoGeral||0});
async function request(action,payload={}) {
  const token=await auth.currentUser?.getIdToken();
  if(!token) throw new Error('Entre novamente para continuar.');
  const response=await fetch('/api/quiz',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({action,...payload})});
  const result=await response.json();
  if(!response.ok) throw new Error(result.error || 'Não foi possível salvar seu progresso.');
  return result;
}

export async function createProfile(uid, data) {
  if(!isSandbox) return request('createProfile',{data});
  return runTransaction(db, async tx => {
    const existing = await tx.get(doc(db, 'users', uid));
    if (existing.exists()) return existing.data();
    const profile = { ...data };
    tx.set(doc(db, 'users', uid), profile);
    tx.set(doc(db, 'rankings', uid), publicProfile(uid, profile));
    return profile;
  });
}

export async function loadSeason() {
  if(!isSandbox) return request('loadSeason');
  return {name:'XP geral',leaguesEnabled:false};
}

export async function loadProfile(uid) {
  if(!isSandbox) return request('loadProfile');
  return runTransaction(db, async tx => {
    const ref = doc(db, 'users', uid);
    const snapshot = await tx.get(ref);
    if (!snapshot.exists()) return null;
    const original = snapshot.data();
    let data = resetPeriods(original, DEFAULT_MISSIONS);
    if (JSON.stringify(original) !== JSON.stringify(data)) tx.update(ref, data);
    tx.set(doc(db, 'rankings', uid), publicProfile(uid, data));
    return data;
  });
}

export async function saveQuizEvent(uid, event) {
  if(!isSandbox) return request('saveQuizEvent',{event});
  if (auth.currentUser?.uid !== uid) throw new Error('Entre novamente para continuar.');
  return runTransaction(db, async tx => {
    const ref = doc(db, 'users', uid);
    const snapshot = await tx.get(ref);
    if (!snapshot.exists()) throw new Error('Perfil não encontrado.');
    const original = snapshot.data();
    const result = applyQuizEvent(original, event,new Date(),{singleXP:true});
    tx.update(ref, result.data);
    tx.set(doc(db, 'rankings', uid), publicProfile(uid, result.data));
    return result;
  });
}

export async function importQuestions(raw) {
  assertAdmin();
  // Validate the entire file before the first write.
  validateImport(raw);
  const existing = await getDocs(collection(db, 'questions'));
  const { questions, duplicates } = validateImport(raw, existing.docs.map(d => d.data()));
  const entries = await Promise.all(questions.map(async q => {
    const bytes = new TextEncoder().encode(q.pergunta.toLocaleLowerCase('pt-BR'));
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2, '0')).join('');
    return { q, id: hash };
  }));
  let imported = 0;
  try {
    for (let i = 0; i < entries.length; i += 400) {
      const batch = writeBatch(db);
      for (const { q, id } of entries.slice(i, i + 400)) batch.set(doc(db, 'questions', id), {...q,ativo:true});
      await batch.commit();
      imported += entries.slice(i, i + 400).length;
    }
  } catch (error) { throw new Error(`${imported} questões salvas antes da falha. Você pode reenviar o arquivo sem duplicá-las. ${error.message}`); }
  return { imported, duplicates };
}
