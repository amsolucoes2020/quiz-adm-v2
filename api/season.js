import {timingSafeEqual} from 'node:crypto';
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  const expected=`Bearer ${process.env.CRON_SECRET||''}`, actual=req.headers.authorization||'';
  if(req.method!=='GET'||!process.env.CRON_SECRET||actual.length!==expected.length||!timingSafeEqual(Buffer.from(actual),Buffer.from(expected))) return res.status(401).json({error:'Acesso negado.'});
  return res.status(200).json({leaguesEnabled:false});
}
