export const ROWS=[['BACKS',[['BP','DEF'],['FB','DEF'],['BP','DEF']]],['HALF BACKS',[['HBF','DEF'],['CHB','DEF'],['HBF','DEF']]],['CENTRES',[['W','MID'],['C','MID'],['W','MID']]],['FOLLOWERS',[['RUC','RUC'],['RR','MID'],['ROV','MID']]],['HALF FORWARDS',[['HFF','FWD'],['CHF','FWD'],['HFF','FWD']]],['FORWARDS',[['FP','FWD'],['FF','FWD'],['FP','FWD']]],['INTERCHANGE',[['INT 1','INT'],['INT 2','INT'],['INT 3','INT'],['INT 4','INT']]]];
export const SLOTS=ROWS.flatMap(r=>r[1]).map(([label,role],i)=>({id:i,label,role}));
export const ERAS=[1990,2000,2010,2020];
export function hash(s){let n=2166136261;for(const c of String(s)){n^=c.charCodeAt(0);n=Math.imul(n,16777619)}return n>>>0}
export function random(seed){let a=hash(seed);return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
export const CLASSIC_SLOTS=['DEF','MID','RUC','FWD','UTL'].map((role,id)=>({id,label:role,role}));
export const slotsFor=state=>state.mode==='classic'?CLASSIC_SLOTS:SLOTS;
export const eligible=(player,role)=>['INT','UTL'].includes(role)||(player.eligiblePositions||[player.role]).includes(role);
export function newGame(seed,mode='full'){return {version:2,mode,seed:String(seed).slice(0,64),picks:[],roll:null,clubRerolls:1,eraRerolls:1,counter:0,complete:false}}
export function remaining(state,players){const used=new Set(state.picks.map(p=>p.id));return players.filter(p=>!used.has(p.id))}
export function roll(state,players,type='both'){
 if(state.complete||state.picks.length>=slotsFor(state).length||!['both','club','era'].includes(type))return null;
 if(type==='both'&&state.roll)return null;
 if(type!=='both'&&(!state.roll||state[type==='club'?'clubRerolls':'eraRerolls']<=0))return null;
 const open=slotsFor(state).filter(s=>!state.picks.some(p=>p.slot===s.id));
 const pool=remaining(state,players).filter(p=>open.some(s=>eligible(p,s.role)));
 const groups=new Map();for(const p of pool){const k=`${p.club}|${p.era}`;if(!groups.has(k))groups.set(k,{club:p.club,era:p.era})}
 let choices=[...groups.values()];
 if(type==='club')choices=choices.filter(g=>g.era===state.roll.era&&g.club!==state.roll.club);
 if(type==='era'){const sameClub=choices.filter(g=>g.club===state.roll.club&&g.era!==state.roll.era);choices=sameClub.length?sameClub:choices.filter(g=>g.era!==state.roll.era&&!state.picks.some(p=>p.club===g.club));}
 if(!choices.length)return null;
 // Classic avoids repeat clubs. A full side exhausts clubs, then reuses them.
 if(type!=='era'){const unused=choices.filter(g=>!state.picks.some(p=>p.club===g.club));if(unused.length)choices=unused;}
 const rng=random(`${state.seed}|${state.counter}|${type}`);
 if(type!=='club'){
  const unused=choices.filter(g=>!state.picks.some(p=>p.era===g.era));if(unused.length)choices=unused;
  const eras=[...new Set(choices.map(g=>g.era))];const era=eras[Math.floor(rng()*eras.length)];choices=choices.filter(g=>g.era===era);
 }
 const specialist=open.filter(s=>!['UTL','INT'].includes(s.role));
 const preferred=choices.filter(g=>pool.some(p=>p.club===g.club&&p.era===g.era&&specialist.some(s=>eligible(p,s.role))));if(preferred.length)choices=preferred;
 choices.sort((a,b)=>a.club.localeCompare(b.club)||a.era-b.era);
 const next=choices[Math.floor(rng()*choices.length)];state.counter++;state.roll=next;
 if(type==='club')state.clubRerolls--;if(type==='era')state.eraRerolls--;return next;
}
export function draft(state,player,slot){
 const position=slotsFor(state)[slot];
 if(!Number.isInteger(slot)||!position)throw Error('Choose a valid position.');
 if(state.complete||!state.roll)throw Error('Spin before choosing your next player.');
 if(state.picks.some(p=>p.slot===slot))throw Error('Choose an empty position.');
 if(!eligible(player,position.role))throw Error('That player is not eligible for this position.');
 if(state.picks.some(p=>p.id===player.id))throw Error('That player is already in your side.');
 if(player.club!==state.roll.club||player.era!==state.roll.era)throw Error('Choose a player from the current draw.');
 state.picks.push({key:player.key,id:player.id,club:player.club,era:player.era,slot});state.roll=null;
 state.complete=state.picks.length===slotsFor(state).length;return state;
}
export function swap(state,from,to,players){
 const slots=slotsFor(state),pick=state.picks.find(p=>p.slot===from),player=pick&&players.find(p=>p.key===pick.key);
 if(state.complete||!slots[to]||!player)throw Error('Cannot move that player.');
 if(from===to)return;
 if(state.picks.some(p=>p.slot===to))throw Error('Choose an empty position.');
 if(!eligible(player,slots[to].role))throw Error('That player is not eligible for this position.');
 pick.slot=to;
}
export function restore(raw,players){
 if(!raw||raw.version!==2||!['classic','full'].includes(raw.mode)||typeof raw.seed!=='string'||raw.seed.length>64||!Array.isArray(raw.picks))throw Error('Invalid saved game.');
 const s=newGame(raw.seed,raw.mode),slots=slotsFor(s),byKey=new Map(players.map(p=>[p.key,p]));let ids=new Set(),usedSlots=new Set();
 if(raw.picks.length>slots.length)throw Error('Invalid lineup size.');
 for(const pick of raw.picks){const p=byKey.get(pick.key);if(!p||!Number.isInteger(pick.slot)||!slots[pick.slot]||!eligible(p,slots[pick.slot].role)||ids.has(p.id)||usedSlots.has(pick.slot))throw Error('Invalid saved lineup.');ids.add(p.id);usedSlots.add(pick.slot);s.picks.push({key:p.key,id:p.id,club:p.club,era:p.era,slot:pick.slot})}
 for(const k of ['clubRerolls','eraRerolls']){if(!Number.isInteger(raw[k])||raw[k]<0||raw[k]>1)throw Error('Invalid rerolls.');s[k]=raw[k]}
 if(!Number.isInteger(raw.counter)||raw.counter<0||raw.counter>slots.length+2)throw Error('Invalid draw count.');s.counter=raw.counter;
 s.complete=s.picks.length===slots.length;
 if(raw.roll&&!s.complete){if(!players.some(p=>p.club===raw.roll.club&&p.era===raw.roll.era&&!ids.has(p.id)&&slots.some(slot=>!usedSlots.has(slot.id)&&eligible(p,slot.role))))throw Error('Invalid draw.');s.roll={club:raw.roll.club,era:raw.roll.era}}
 return s;
}
export function score(state,players){
 if(state.picks.length!==slotsFor(state).length)throw Error('Fill every position first.');
 const valid=restore(state,players),byKey=new Map(players.map(p=>[p.key,p]));let sum=0,weights=0;const lines={};
 for(const pick of valid.picks){const role=slotsFor(state)[pick.slot].role,r=byKey.get(pick.key).ratings[role==='UTL'?'INT':role],w=role==='INT'?.65:1;sum+=r*w;weights+=w;(lines[role]??=[]).push(r)}
 const rating=sum/weights;const lineRatings=Object.fromEntries(Object.entries(lines).map(([r,a])=>[r,Math.round(10*a.reduce((s,v)=>s+v,0)/a.length)/10]));
 // Fixed fictional opposition ladder. No random luck or live AFL prediction.
 const thresholds=Array.from({length:23},(_,i)=>55+i*1.75);const games=thresholds.map((opposition,i)=>({round:i+1,opposition,win:rating>=opposition}));
 const rng=random('schedule-v1');for(let i=games.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[games[i],games[j]]=[games[j],games[i]]}games.forEach((g,i)=>g.round=i+1);
 const wins=games.filter(g=>g.win).length;return{rating:Math.round(rating*10)/10,wins,losses:23-wins,lineRatings,games};
}
