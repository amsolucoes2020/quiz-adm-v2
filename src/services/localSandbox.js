import { allBundledQuestions, isDeferredQuestion, BANK_VERSION } from '../data/questionBank';
import { upgradeLocalBank } from '../domain/localBank';
import { initialProgress } from '../domain/periods.js';
import {syncCompetition} from '../domain/competition.js';
if (!['localhost','127.0.0.1','[::1]'].includes(location.hostname)) throw new Error('Esta prévia é exclusiva para testes locais.');
const KEY = 'adm-quiz-sandbox-v1.3';
export const isSandbox = true;
const UID = 'ktCddjGUigN8Spm6x9wrdFgzBZy2';
const user = {uid:UID,email:'teste@local.invalid'};
function seed() {
  const profile={...user,nome:'Aluno de teste',curso:'Administração',turma:'Local',unidade:'Teste local',isAdmin:true,...initialProgress('TESTE LOCAL V1.3')};
  return {['users/'+UID]:profile,['rankings/'+UID]:profile,'settings/season':{name:'TESTE LOCAL V1.3'},
    'settings/localBank': {version:BANK_VERSION,count:allBundledQuestions.length},
    ...Object.fromEntries(allBundledQuestions.map((q,i)=>['questions/local-'+i,q]))};
}
function read() { const raw=localStorage.getItem(KEY); return syncCompetition(raw ? upgradeLocalBank(JSON.parse(raw), allBundledQuestions, BANK_VERSION) : seed()); }
function write(data) { localStorage.setItem(KEY,JSON.stringify(data)); }
export const db = {};
export const auth = {currentUser:user};
export const doc = (_,table,id) => ({path:table+'/'+id,id});
export const collection = (_,table) => ({table});
const snap = (ref,data) => ({id:ref.id,ref,exists:()=>data!==undefined,data:()=>structuredClone(data)});
export async function getDoc(ref) {return snap(ref,read()[ref.path]);}
export const orderBy = (field,direction) => ({field,direction});
export const limit = count => ({count});
export const query = (ref,...filters) => ({...ref,filters});
export const where = (field,op,value) => ({kind:'where',field,op,value});
export async function getDocs(ref) {
  let rows=Object.entries(read()).filter(([path,data])=>path.startsWith(ref.table+'/') && (ref.table !== 'questions' || !isDeferredQuestion(data))).map(([path,data])=>snap({path,id:path.split('/').at(-1)},data));
  for(const filter of ref.filters || []) {
    if(filter.kind==='where') {
      if(filter.op!=='==')throw new Error('Filtro local não suportado.');
      rows=rows.filter(row=>row.data()[filter.field]===filter.value);
    } else if(filter.field) rows.sort((a,b)=>(a.data()[filter.field]-b.data()[filter.field])*(filter.direction==='desc'?-1:1));
    if(filter.count) rows=rows.slice(0,filter.count);
  }
  return {docs:rows,size:rows.length,forEach:fn=>rows.forEach(fn)};
}
// Serialize read-modify-write transactions, including across local browser tabs.
export async function runTransaction(_,fn) {
  return navigator.locks.request(KEY,async()=>{
    const data=read();
    const result=await fn({get:async ref=>snap(ref,data[ref.path]),set:(ref,value)=>{data[ref.path]=structuredClone(value);},update:(ref,value)=>{data[ref.path]={...data[ref.path],...structuredClone(value)};}});
    write(data); return result;
  });
}
export function writeBatch() {
  const operations=[];
  return {set:(ref,value)=>operations.push(['set',ref,value]),update:(ref,value)=>operations.push(['update',ref,value]),
    commit:()=>runTransaction(db,async tx=>{for(const [method,ref,value] of operations) tx[method](ref,value);})};
}
export const updateDoc = (ref,value)=>runTransaction(db,async tx=>tx.update(ref,value));
export async function deleteDoc(ref) {await navigator.locks.request(KEY,async()=>{const data=read();delete data[ref.path];write(data);});}
export function onAuthStateChanged(_,fn) {let active=true;queueMicrotask(()=>{if(active) fn(user);});return ()=>{active=false;};}
export async function signOut() { location.reload(); }
export async function signInWithEmailAndPassword() {throw new Error('Use o perfil fictício local.');}
export const createUserWithEmailAndPassword=signInWithEmailAndPassword;
export const sendPasswordResetEmail=signInWithEmailAndPassword;
export function resetSandbox() {localStorage.removeItem(KEY);location.reload();}
