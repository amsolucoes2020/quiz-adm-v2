import {cert,getApps,initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';

export function services() {
  if(!getApps().length) {
    const raw=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if(!raw) throw new Error('Serviço de produção ainda não configurado.');
    const account=JSON.parse(raw);
    if(account.project_id!=='quiz-administracao') throw new Error('Projeto Firebase incorreto.');
    initializeApp({credential:cert(account),projectId:account.project_id});
  }
  return {db:getFirestore(),auth:getAuth()};
}

export async function identity(req) {
  const header=req.headers.authorization || '';
  if(!header.startsWith('Bearer ')) throw Object.assign(new Error('Entre novamente para continuar.'),{status:401});
  try {return await services().auth.verifyIdToken(header.slice(7),true);}
  catch {throw Object.assign(new Error('Sessão inválida. Entre novamente.'),{status:401});}
}
