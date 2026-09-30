export const ROWS=[['BACKS',[['BP','DEF'],['FB','DEF'],['BP','DEF']]],['HALF BACKS',[['HBF','DEF'],['CHB','DEF'],['HBF','DEF']]],['CENTRES',[['W','MID'],['C','MID'],['W','MID']]],['FOLLOWERS',[['RUC','RUC'],['RR','MID'],['ROV','MID']]],['HALF FORWARDS',[['HFF','FWD'],['CHF','FWD'],['HFF','FWD']]],['FORWARDS',[['FP','FWD'],['FF','FWD'],['FP','FWD']]],['INTERCHANGE',[['INT 1','INT'],['INT 2','INT'],['INT 3','INT'],['INT 4','INT']]]];
export const SLOTS=ROWS.flatMap(r=>r[1]).map(([label,role],i)=>({id:i,label,role}));
export const ERAS=[1990,2000,2010,2020];
export function hash(s){let n=2166136261;for(const c of String(s)){n^=c.charCodeAt(0);n=Math.imul(n,16777619)}return n>>>0}
export function random(seed){let a=hash(seed);return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
export function newGame(seed){return {version:1,seed:String(seed).slice(0,64),picks:[],roll:null,clubRerolls:3,eraRerolls:3,counter:0,complete:false}}
export function remaining(state,players){const used=new Set(state.picks.map(p=>p.id));return players.filter(p=>!used.has(p.id))}
export function roll(state,players,type='both'){
 if(state.picks.length>=22)return null;
 if(type!=='both'&&(!state.roll||state[type==='club'?'clubRerolls':'eraRerolls']<=0))return null;
 const pool=remaining(state,players);const groups=new Map();for(const p of pool){const k=`${p.club}|${p.era}`;if(!groups.has(k))groups.set(k,{club:p.club,era:p.era})}
 let choices=[...groups.values()];
 if(type==='club')choices=choices.filter(g=>g.era===state.roll.era&&g.club!==state.roll.club);
 if(type==='era')choices=choices.filter(g=>g.club===state.roll.club&&g.era!==state.roll.era);
 if(!choices.length)return null;
 const rng=random(`${state.seed}|${state.counter}|${type}`);
 if(type==='both'){
  const counts=Object.fromEntries(ERAS.map(e=>[e,state.picks.filter(p=>p.era===e).length]));
  const min=Math.min(...choices.map(g=>counts[g.era]));choices=choices.filter(g=>counts[g.era]===min);
  const eras=[...new Set(choices.map(g=>g.era))];const era=eras[Math.floor(rng()*eras.length)];choices=choices.filter(g=>g.era===era);
 }
 choices.sort((a,b)=>a.club.localeCompare(b.club)||a.era-b.era);
 const next=choices[Math.floor(rng()*choices.length)];state.counter++;state.roll=next;
 if(type==='club')state.clubRerolls--;if(type==='era')state.eraRerolls--;return next;
}
export function draft(state,player,slot){
 if(!Number.isInteger(slot)||slot<0||slot>=22)throw Error('Choose a valid position.');
 if(state.complete||!state.roll||state.picks.some(p=>p.slot===slot))throw Error('Choose an empty position.');
 if(state.picks.some(p=>p.id===player.id))throw Error('That player is already in your side.');
 if(player.club!==state.roll.club||player.era!==state.roll.era)throw Error('Choose a player from the current draw.');
 state.picks.push({key:player.key,id:player.id,club:player.club,era:player.era,slot});state.roll=null;
 return state;
}
export function swap(state,from,to,players){
 if(state.complete||!SLOTS[from]||!SLOTS[to])throw Error('Cannot move that player.');
 const a=state.picks.find(p=>p.slot===from),b=state.picks.find(p=>p.slot===to);if(!a)throw Error('No player to move.');a.slot=to;if(b)b.slot=from;
}
export function restore(raw,players){
 if(!raw||raw.version!==1||typeof raw.seed!=='string'||raw.seed.length>64||!Array.isArray(raw.picks)||raw.picks.length>22)throw Error('Invalid saved game.');
 const byKey=new Map(players.map(p=>[p.key,p]));const s=newGame(raw.seed);let ids=new Set(),slots=new Set();
 for(const pick of raw.picks){const p=byKey.get(pick.key);if(!p||!Number.isInteger(pick.slot)||pick.slot<0||pick.slot>21||ids.has(p.id)||slots.has(pick.slot))throw Error('Invalid saved lineup.');ids.add(p.id);slots.add(pick.slot);s.picks.push({key:p.key,id:p.id,club:p.club,era:p.era,slot:pick.slot})}
 for(const k of ['clubRerolls','eraRerolls']){if(!Number.isInteger(raw[k])||raw[k]<0||raw[k]>3)throw Error('Invalid rerolls.');s[k]=raw[k]}
 if(!Number.isInteger(raw.counter)||raw.counter<0||raw.counter>100)throw Error('Invalid draw count.');s.counter=raw.counter;
 if(raw.roll){if(!players.some(p=>p.club===raw.roll.club&&p.era===raw.roll.era&&!ids.has(p.id)))throw Error('Invalid draw.');s.roll={club:raw.roll.club,era:raw.roll.era}}
 s.complete=raw.complete===true&&s.picks.length===22;return s;
}
export function score(state,players){
 if(state.picks.length!==22)throw Error('Draft all 22 players first.');
 const valid=restore(state,players),byKey=new Map(players.map(p=>[p.key,p]));let sum=0,weights=0;const lines={};
 for(const pick of valid.picks){const role=SLOTS[pick.slot].role,r=byKey.get(pick.key).ratings[role],w=role==='INT'?.65:1;sum+=r*w;weights+=w;(lines[role]??=[]).push(r)}
 const rating=sum/weights;const lineRatings=Object.fromEntries(Object.entries(lines).map(([r,a])=>[r,Math.round(10*a.reduce((s,v)=>s+v,0)/a.length)/10]));
 // Fixed fictional opposition ladder. No random luck or live AFL prediction.
 const thresholds=Array.from({length:23},(_,i)=>55+i*1.75);const games=thresholds.map((opposition,i)=>({round:i+1,opposition,win:rating>=opposition}));
 const rng=random('schedule-v1');for(let i=games.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[games[i],games[j]]=[games[j],games[i]]}games.forEach((g,i)=>g.round=i+1);
 const wins=games.filter(g=>g.win).length;return{rating:Math.round(rating*10)/10,wins,losses:23-wins,lineRatings,games};
}
