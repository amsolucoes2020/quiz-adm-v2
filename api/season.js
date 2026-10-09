import {timingSafeEqual} from 'node:crypto';
import {services} from '../server/firebase.js';
import {ensureCompetition} from '../server/competition.js';
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  const expected=`Bearer ${process.env.CRON_SECRET||''}`, actual=req.headers.authorization||'';
  if(req.method!=='GET'||!process.env.CRON_SECRET||actual.length!==expected.length||!timingSafeEqual(Buffer.from(actual),Buffer.from(expected))) return res.status(401).json({error:'Acesso negado.'});
  try {return res.status(200).json({season:await ensureCompetition(services().db)});}
  catch(error) {console.error('season API:',error.message);return res.status(500).json({error:'Não foi possível processar a temporada.'});}
}
