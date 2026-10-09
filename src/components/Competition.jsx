import React,{useState} from 'react';
import {LEAGUES,LEAGUE_ICONS,roomRanking,leagueOutcome,competitionCareer,monthlySeason,enrollCompetition,syncCompetition} from '../domain/competition';
import {initialProgress} from '../domain/periods';
const leagueLabel=league=>`${LEAGUE_ICONS[LEAGUES.indexOf(league)]||'🎯'} ${league}`;
const date=value=>new Date(value).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'});

export function CompetitionPanel({profile,rows,season,uid,now=new Date()}) {
  const c=profile.competition;
  if(!c||!season) return <p>Carregando liga…</p>;
  const ranked=roomRanking(rows,c), index=ranked.findIndex(r=>r.uid===uid);
  const slots=leagueOutcome(c.league,1,ranked.length,1).slots;
  const cutoff=ranked[slots-1];
  const hours=Math.max(0,Math.ceil((Date.parse(season.endAt)-now)/3600000));
  return <section className="space-y-4">
    <div className="bg-indigo-950/60 border border-indigo-500/40 rounded-xl p-4">
      <h3 className="font-bold text-lg">🏆 {season.name}</h3>
      <p className="text-xs text-slate-300">{date(season.startAt)} até {date(new Date(Date.parse(season.endAt)-1))} · Horário de Brasília</p>
      <p className="text-sm mt-2">⏱️ {Math.floor(hours/24)} dias e {hours%24} horas restantes</p>
      <p className="font-semibold mt-3">{c.status==='classification'?'🎯 Classificação para a próxima temporada':`${leagueLabel(c.league)} · Sala ${c.roomId?.split('-').at(-1)||'—'}`}</p>
      {c.status==='active'?<>
        <p className="text-2xl font-bold mt-2">{index>=0?`${index+1}º / ${ranked.length}`:'—'} <span className="text-base">· {c.points} pontos</span></p>
        {slots>0&&c.league!=='Diamante'&&index>=slots&&cutoff&&<p className="text-sm mt-2">Para ultrapassar {cutoff.nome} na zona de promoção: {Math.max(1,cutoff.competition.points-c.points+1)} pontos.</p>}
        {index>0&&<p className="text-xs text-slate-300 mt-1">Para ultrapassar a próxima posição: {Math.max(1,ranked[index-1].competition.points-c.points+1)} pontos.</p>}
        {slots>0&&index>=0&&index<slots&&c.points>0&&<p className="text-sm text-emerald-300 mt-2">{c.league==='Diamante'?'Defenda seu lugar no topo até o encerramento.':'Você está na zona de promoção. Defenda sua posição até o encerramento.'}</p>}
      </>:<p className="text-sm mt-2">Entrada após 75% do período. Você pode estudar e ganhar XP; sua competição oficial começa na Bronze em {date(season.endAt)}.</p>}
    </div>
    {c.status==='active'&&<>
      <p className="text-xs text-slate-400">{slots?`${slots} vaga(s) de ${c.league==='Diamante'?'elite':'promoção'}${c.league==='Bronze'?' · Bronze não tem rebaixamento':` e ${slots} de rebaixamento`}.`:'Sala com menos de 6 participantes: sem promoção ou rebaixamento nesta temporada.'} É necessário pontuar para subir. Desempate: mais acertos; persistindo, identificador estável do participante.</p>
      <div className="space-y-2 max-h-[520px] overflow-y-auto">
        {ranked.map((row,i)=>{
          const zone=leagueOutcome(c.league,i+1,ranked.length,row.competition.points).zone;
          return <div key={row.uid} className={`p-3 rounded-xl border flex justify-between gap-2 ${row.uid===uid?'border-indigo-400 bg-indigo-950':'border-slate-700 bg-slate-900'}`}>
            <div><p className="text-sm">{i+1}º · {row.nome} {row.uid===uid&&'· Você'}</p><p className={`text-xs ${zone==='Rebaixamento'?'text-red-300':zone==='Permanência'?'text-slate-400':'text-emerald-300'}`}>{zone==='Promoção'?'⬆️ ':zone==='Rebaixamento'?'⬇️ ':''}{zone}</p></div>
            <span className="font-bold text-amber-300 whitespace-nowrap">{row.competition.points} pts</span>
          </div>;
        })}
      </div>
    </>}
    <p className="text-xs text-slate-400">Pontos competitivos vêm de acertos inéditos no dia e bônus de desempenho. Missões, conquistas, combos, sequência e novas tentativas dão apenas o XP previsto nas regras de estudo.</p>
  </section>;
}

export function CompetitionHistory({profile}) {
  const career=competitionCareer(profile), history=[...(profile.seasonHistory||[])].reverse();
  return <section className="bg-slate-900 p-4 rounded-xl border border-slate-700 space-y-3">
    <h3 className="font-bold">🏅 Carreira competitiva</h3>
    <div className="grid grid-cols-2 gap-2 text-sm">
      <p>Temporadas disputadas: {career.played}</p><p>Títulos Diamante: {career.titles}</p>
      <p>Top 3: {career.top3}</p><p>Top 10: {career.top10}</p>
      <p>Maior liga: {leagueLabel(career.bestLeague)}</p><p>Melhor posição: {career.bestPosition?`${career.bestPosition}º`:'—'}</p>
    </div>
    {!!profile.leagueBadges?.length&&<p className="text-amber-300 text-sm">Medalhas: {profile.leagueBadges.join(' · ')}</p>}
    {!history.length&&<p className="text-sm text-slate-400">Sua primeira campanha ficará registrada ao encerrar a temporada.</p>}
    <div className="space-y-3 max-h-96 overflow-y-auto">{history.map((h,i)=><article key={h.seasonId} className="border border-slate-700 rounded-lg p-3 text-sm">
      <h4 className="font-semibold">{i===0?'🏁 Última temporada encerrada · ':''}{h.seasonName}</h4>
      <p>{leagueLabel(h.league)} · {h.roomId||'Classificação'} · {h.position?`${h.position}º / ${h.size}`:'Sem posição oficial'}</p>
      <p>{h.points} pontos · {h.answers} questões · {h.correct} acertos · {h.answers?(h.correct/h.answers*100).toFixed(1):0}%</p>
      <p className="text-indigo-300">{h.zone==='Promoção'?`Promovido para ${h.nextLeague}!`:h.zone==='Rebaixamento'?`Próxima liga: ${h.nextLeague}`:h.zone==='Classificação'?'Classificação concluída · entrada na Bronze':h.zone==='Campeão'?'🏆 Campeão da Temporada':`${h.zone} · ${h.nextLeague}`}</p>
      {!h.competed&&<p className="text-xs text-slate-400">Sem participação competitiva contabilizada.</p>}
    </article>)}</div>
  </section>;
}

function demoStore(league) {
  const now=new Date('2026-10-15T15:00:00-03:00'),season=monthlySeason(now);
  const data={'settings/season':season};
  for(let i=0;i<30;i++) {
    const uid=`demo-${String(i).padStart(2,'0')}`;
    data[`users/${uid}`]={...initialProgress(season.name,now),nome:i===6?'Você (simulação)':`Aluno fictício ${i+1}`,pontuacaoGeral:5000,
      competition:{...enrollCompetition(season,now,league),points:3000-i*80,answers:150,correct:120-i,quizzes:15}};
  }
  return syncCompetition(data,now);
}
export function CompetitionLab() {
  const [league,setLeague]=useState('Bronze'),[store,setStore]=useState(()=>demoStore('Bronze'));
  const uid='demo-06',profile=store[`users/${uid}`],season=store['settings/season'];
  const rows=Object.entries(store).filter(([p])=>p.startsWith('users/')).map(([p,u])=>({uid:p.slice(6),...u}));
  return <details className="border border-amber-500/30 bg-slate-900 rounded-xl p-4 mb-6">
    <summary className="cursor-pointer font-bold text-amber-300">🧪 Simular ligas e encerramento</summary>
    <p className="text-xs text-slate-400 my-3">30 participantes fictícios. Esta simulação não altera seu perfil nem o ranking local.</p>
    <label className="text-sm">Liga de demonstração <select value={league} onChange={e=>{setLeague(e.target.value);setStore(demoStore(e.target.value));}} className="bg-slate-800 rounded p-2">{LEAGUES.map(l=><option key={l}>{l}</option>)}</select></label>
    <div className="flex flex-wrap gap-2 my-3">
      <button className="bg-indigo-600 rounded p-2 text-sm" onClick={()=>setStore({...store,[`users/${uid}`]:{...profile,competition:{...profile.competition,points:profile.competition.points+200}}})}>Adicionar 200 pontos fictícios</button>
      <button className="bg-amber-600 rounded p-2 text-sm" onClick={()=>setStore(syncCompetition(store,new Date(season.endAt)))}>Simular fim da temporada</button>
      <button className="bg-slate-700 rounded p-2 text-sm" onClick={()=>setStore(demoStore(league))}>Reiniciar simulação</button>
    </div>
    <CompetitionPanel profile={profile} rows={rows} uid={uid} season={season} now={new Date(Date.parse(season.startAt)+14*86400000)}/>
    <div className="mt-4"><CompetitionHistory profile={profile}/></div>
  </details>;
}
