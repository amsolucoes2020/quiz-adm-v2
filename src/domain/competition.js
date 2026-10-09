import {getPeriods, resetPeriods} from './periods.js';
import {emptyMetrics} from './learning.js';

export const LEAGUES = ['Bronze','Prata','Ouro','Diamante'];
export const LEAGUE_ICONS = ['🥉','🥈','🥇','💎'];
export function monthlySeason(now=new Date()) {
  const {month,seasonName}=getPeriods(now);
  const [year,m]=month.split('-').map(Number);
  const next=new Date(Date.UTC(year,m,1)).toISOString().slice(0,10);
  return {id:month,name:seasonName,startAt:`${month}-01T00:00:00-03:00`,endAt:`${next}T00:00:00-03:00`,status:'active'};
}
export function enrollCompetition(season,now=new Date(),league='Bronze',grandfather=false) {
  const late=+now >= Date.parse(season.startAt)+(Date.parse(season.endAt)-Date.parse(season.startAt))*.75;
  return {seasonId:season.id,league:LEAGUES.includes(league)?league:'Bronze',roomId:null,
    status:late&&!grandfather?'classification':'active',points:0,answers:0,correct:0,quizzes:0,enrolledAt:now.toISOString()};
}
export const competitionRow=(uid,data)=>({uid,nome:data.nome,pontuacaoGeral:data.pontuacaoGeral||0,temporadaAtual:data.temporadaAtual,competition:data.competition});
export function roomRanking(rows,competition) {
  if(!competition||competition.status!=='active') return [];
  return rows.filter(row=>row.competition?.seasonId===competition.seasonId&&row.competition?.roomId===competition.roomId&&row.competition?.league===competition.league&&row.competition?.status==='active')
    .sort((a,b)=>b.competition.points-a.competition.points||b.competition.correct-a.competition.correct||a.uid.localeCompare(b.uid));
}
export function leagueOutcome(league,position,size,points) {
  const index=LEAGUES.indexOf(league), slots=size>=6?Math.min(5,Math.floor(size/6)):0;
  if(slots&&position<=slots&&points>0) return {nextLeague:LEAGUES[Math.min(3,index+1)],zone:index===3?(position===1?'Campeão':'Elite'):'Promoção',slots};
  if(slots&&position>size-slots&&index>0) return {nextLeague:LEAGUES[index-1],zone:'Rebaixamento',slots};
  return {nextLeague:league,zone:'Permanência',slots};
}
function assignRooms(data,season) {
  const users=Object.entries(data).filter(([key])=>key.startsWith('users/')).sort(([a],[b])=>a.localeCompare(b));
  for(const league of LEAGUES) {
    const members=users.filter(([,p])=>p.competition?.seasonId===season.id&&p.competition.league===league&&p.competition.status==='active');
    const counts=new Map();
    for(const [,p] of members) if(p.competition.roomId) counts.set(p.competition.roomId,(counts.get(p.competition.roomId)||0)+1);
    const unassigned=members.filter(([,p])=>!p.competition.roomId);
    // At rollover, distribute evenly so 31 players become rooms of 16 and 15.
    const fresh=counts.size===0, rooms=Math.ceil(members.length/30);
    unassigned.forEach(([path,p],i)=>{
      let number=fresh?i%rooms+1:1;
      const room=n=>`${league}-${String(n).padStart(2,'0')}`;
      while(!fresh&&(counts.get(room(number))||0)>=30) number++;
      const roomId=room(number);counts.set(roomId,(counts.get(roomId)||0)+1);
      data[path]={...p,competition:{...p.competition,roomId}};
    });
  }
}
function freshSeasonProfile(profile,season,now,league) {
  const data=resetPeriods(profile,[],now);
  // Lifetime learning and daily attempt IDs remain, preventing extra XP on retries.
  for(const scope of ['day','week','month']) data.learning[scope]=emptyMetrics();
  return {...data,temporadaAtual:season.name,xpTemporada:0,missoesConcluidas:[],
    progressoMissoes:{quizzesHoje:0,acertosHoje:0,quizzesSemana:0,acertosSemana:0,quizzesPerfeitosSemana:0,quizzesPerfeitosMes:0},
    respostasSemana:0,categoriasHoje:[],categoriasSemana:[],categoriasMes:[],dificeisHoje:0,
    questoesRespondidasMes:0,questoesAcertadasMes:0,quizzesRealizadosMes:0,diasAtivosMes:[],respostasNoDia:0,
    partidaAtual:null,competition:enrollCompetition(season,now,league,true)};
}
export function closeCompetition(input,now=new Date()) {
  const season=input['settings/season'];
  if(!season?.id||+now<Date.parse(season.endAt)) return input;
  const data={...input}, next=monthlySeason(new Date(season.endAt));
  const rows=Object.entries(data).filter(([path])=>path.startsWith('users/')).map(([path,p])=>competitionRow(path.slice(6),p));
  const results=[];
  for(const row of rows) {
    const path=`users/${row.uid}`, profile=data[path], c=profile.competition;
    if(!c||c.seasonId!==season.id) continue;
    const ranked=roomRanking(rows,c), position=ranked.findIndex(r=>r.uid===row.uid)+1;
    const outcome=c.status==='active'?leagueOutcome(c.league,position,ranked.length,c.points):{nextLeague:'Bronze',zone:'Classificação'};
    const result={seasonId:season.id,seasonName:season.name,startAt:season.startAt,endAt:season.endAt,league:c.league,roomId:c.roomId,
      position:position||null,size:ranked.length,points:c.points,answers:c.answers,correct:c.correct,quizzes:c.quizzes,
      ...outcome,competed:c.status==='active'&&c.answers>0};
    // Preserve closed campaigns even when a player is inactive, but count participation separately.
    const history=[...(profile.seasonHistory||[]).filter(h=>h.seasonId!==season.id),result];
    const badges=new Set(profile.leagueBadges||[]);
    if(result.competed) badges.add(c.league);
    if(result.competed&&position<=3&&ranked.length>=6&&c.points>0) badges.add('Top 3');
    if(outcome.zone==='Campeão'&&result.competed) badges.add('Campeão da Temporada');
    data[path]=freshSeasonProfile({...profile,seasonHistory:history,leagueBadges:[...badges]},next,new Date(next.startAt),outcome.nextLeague);
    results.push({uid:row.uid,nome:row.nome,...result});
  }
  data[`seasons/${season.id}`]={...season,status:'closed',closedAt:season.endAt,results};
  data['settings/season']=next;
  assignRooms(data,next);
  return data;
}
export function syncCompetition(input,now=new Date()) {
  let data={...input}, season=data['settings/season'];
  const migration=!season?.id;
  if(migration) data['settings/season']=season=monthlySeason(now);
  for(const [path,p] of Object.entries(data)) {
    if(path.startsWith('users/')&&!p.competition) data[path]={...p,temporadaAtual:season.name,competition:enrollCompetition(season,now,'Bronze',migration)};
  }
  assignRooms(data,season);
  while(+now>=Date.parse(data['settings/season'].endAt)) data=closeCompetition(data,now);
  for(const [path,p] of Object.entries(data)) if(path.startsWith('users/')) data[`rankings/${path.slice(6)}`]=competitionRow(path.slice(6),p);
  return data;
}
export function competitionCareer(profile) {
  const played=(profile.seasonHistory||[]).filter(h=>h.competed);
  return {played:played.length,titles:played.filter(h=>h.zone==='Campeão').length,
    top3:played.filter(h=>h.position<=3&&h.size>=6&&h.points>0).length,top10:played.filter(h=>h.position<=10&&h.points>0).length,
    bestPosition:played.length?Math.min(...played.map(h=>h.position)):null,
    bestLeague:LEAGUES[Math.max(0,LEAGUES.indexOf(profile.competition?.league),...played.map(h=>LEAGUES.indexOf(h.league)))]};
}
