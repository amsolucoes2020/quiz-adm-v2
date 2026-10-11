import {identity,services} from '../server/firebase.js';
import {messageStore} from '../server/messageStore.js';
import {messaging} from '../src/domain/messaging.js';
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({error:'Método não permitido.'});
  try {
    const user=await identity(req);
    const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
    if(!body||Buffer.byteLength(JSON.stringify(body))>50000)return res.status(400).json({error:'Pedido inválido.'});
    return res.status(200).json(await messaging(messageStore(services().db),user.uid,body.action,body));
  } catch(error) {
    const status=error.status||400;
    return res.status(status).json({error:error.status?error.message:'Não foi possível concluir. Tente novamente.'});
  }
}
