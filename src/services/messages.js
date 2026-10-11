import {auth,db,isSandbox,doc,collection,getDoc,getDocs,runTransaction} from '@backend';
import {messaging} from '../domain/messaging.js';
const ref=path=>{const parts=path.split('/');return doc(db,parts.slice(0,-1).join('/'),parts.at(-1));};
const localStore={
  get:async path=>(await getDoc(ref(path))).data(),
  list:async(path,options={})=>{
    let items=(await getDocs(collection(db,path))).docs.map(row=>({id:row.id,data:row.data()}));
    if(options.filter)items=items.filter(row=>row.data[options.filter.field]===options.filter.value);
    items.sort((a,b)=>options.orderBy?(String(a.data[options.orderBy]).localeCompare(String(b.data[options.orderBy]))||a.id.localeCompare(b.id))*(options.direction==='desc'?-1:1):a.id.localeCompare(b.id));
    if(options.cursor){const index=items.findIndex(row=>row.id===options.cursor);if(index<0)throw new Error('Página inválida.');items=items.slice(index+1);}
    const page=items.slice(0,options.limit||50);
    return {items:page,cursor:items.length>page.length?page.at(-1).id:null};
  },
  transaction:fn=>runTransaction(db,tx=>fn({get:async path=>(await tx.get(ref(path))).data(),set:(path,value)=>tx.set(ref(path),value)}))
};
export async function messageRequest(action,payload={}) {
  if(isSandbox)return messaging(localStore,auth.currentUser?.uid,action,payload);
  const token=await auth.currentUser?.getIdToken();
  if(!token)throw new Error('Entre novamente para continuar.');
  const response=await fetch('/api/messages',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({action,...payload})});
  const result=await response.json();
  if(!response.ok)throw new Error(result.error||'Não foi possível acessar as mensagens.');
  return result;
}
