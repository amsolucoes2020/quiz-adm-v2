import {identity,services} from '../server/firebase.js';
import {performXP as perform} from '../server/xpService.js';
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST') return res.status(405).json({error:'Método não permitido.'});
  try {
    const user=await identity(req);
    const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
    if(!body||Buffer.byteLength(JSON.stringify(body))>50000) return res.status(400).json({error:'Pedido inválido.'});
    if(!['loadSeason','loadProfile','createProfile','saveQuizEvent'].includes(body.action)) return res.status(400).json({error:'Operação desconhecida.'});
    return res.status(200).json(await perform(services().db,user,body.action,body));
  } catch(error) {
    const status=error.status || (error.code && typeof error.code==='number'?503:400);
    console.error('quiz API:',error.message);
    return res.status(status).json({error:status===503?'Serviço temporariamente indisponível. Tente novamente.':error.message});
  }
}
