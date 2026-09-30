import {readFileSync,writeFileSync} from 'node:fs';
import {newGame,slotsFor,eligible,remaining,roll,draft,score,random} from '../public/engine.js';
const {players}=JSON.parse(readFileSync(new URL('../public/game-players.json',import.meta.url)));
export function auditDraft(seed,strategy='random',mode='full'){
 const state=newGame(seed,mode),rng=random('choices-'+seed);
 while(!state.complete){
  if(!roll(state,players))throw Error('No playable draw');
  const open=slotsFor(state).filter(slot=>!state.picks.some(p=>p.slot===slot.id));
  const pool=remaining(state,players).filter(p=>p.club===state.roll.club&&p.era===state.roll.era);
  const options=pool.flatMap(p=>open.filter(slot=>eligible(p,slot.role)).map(slot=>({p,slot,rating:p.ratings[['UTL','INT'].includes(slot.role)?'INT':slot.role]})));
  options.sort((a,b)=>strategy==='first'?b.p.games+3*b.p.votes-a.p.games-3*a.p.votes:strategy==='worst'?a.rating-b.rating:b.rating-a.rating);
  const pick=strategy==='random'?options[Math.floor(rng()*options.length)]:options[0];draft(state,pick.p,pick.slot.id);
 }
 return score(state,players);
}
if(process.argv[1]?.endsWith('audit-scoring.mjs')){
 const report={model:'role-era-percentile-v2',samplesPerStrategy:250,notes:'Synthetic game balance check, not validation against real AFL seasons. First means the top games-plus-votes name with a legal slot. Best greedily selects the highest current role rating; it does not search future rolls.',modes:{}};
 for(const mode of ['full','classic']){report.modes[mode]={};for(const strategy of ['random','first','best','worst']){
  const results=Array.from({length:250},(_,i)=>auditDraft('audit-'+i,strategy,mode)),wins=results.map(r=>r.wins).sort((a,b)=>a-b);
  report.modes[mode][strategy]={meanRating:+(results.reduce((sum,r)=>sum+r.rating,0)/250).toFixed(2),meanWins:+(wins.reduce((a,b)=>a+b,0)/250).toFixed(2),minWins:wins[0],maxWins:wins.at(-1),medianWins:wins[125],twentyPlus:results.filter(r=>r.wins>=20).length,undefeated:results.filter(r=>r.wins===23).length};
 }}
 writeFileSync(new URL('../public/scoring-audit.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}
