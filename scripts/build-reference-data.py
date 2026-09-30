"""Adapt the public 23-0 catalogue for gameplay parity; scores remain independent.
Usage: python3 scripts/build-reference-data.py /path/to/23-0-players.json
Public source: https://23-0.com/data/players/players.json (snapshot 2026-10-01).
"""
import json,sys,bisect
from pathlib import Path
raw=json.load(open(sys.argv[1]));players=[]
aliases={'Adelaide Crows':'Adelaide','Fitzroy Lions':'Fitzroy','GWS Giants':'Greater Western Sydney','Geelong Cats':'Geelong','Gold Coast Suns':'Gold Coast','Sydney Swans':'Sydney','West Coast Eagles':'West Coast'}
fields={'disposals':'avgDisposals','goals':'avgGoals','marks':'avgMarks','tackles':'avgTackles','hitouts':'avgHitouts','rebounds':'avgRebound50s','onePercenters':'avgOnePercenters','clearances':'avgClearances'}
for x in raw['players']:
 p={'id':x['playerId'],'name':x['name'],'club':aliases.get(x['team'],x['team']),'era':x['decade'],'games':x['games'],'votes':x.get('brownlowVotes',0),'eligiblePositions':x['eligiblePositions'],'role':x['primaryPosition'],'source':'https://23-0.com/data/players/players.json'}
 p.update({k:x.get(v) for k,v in fields.items()});p['key']=f"{p['id']}:{p['club']}:{p['era']}";players.append(p)
weights={'DEF':{'rebounds':.40,'onePercenters':.25,'marks':.20,'disposals':.15},'MID':{'disposals':.55,'clearances':.25,'tackles':.20},'RUC':{'hitouts':.75,'disposals':.15,'marks':.10},'FWD':{'goals':.75,'marks':.15,'tackles':.10}}
for era in [1990,2000,2010,2020]:
 group=[p for p in players if p['era']==era]
 # Compare a ruck with eligible rucks, not midfielders with zero hitouts.
 distributions={role:{k:sorted(p[k] for p in group if role in p['eligiblePositions'] and p[k] is not None) for k in fields} for role in weights}
 for p in group:
  p['ratings']={}
  for role,ws in weights.items():
   dist=distributions[role]
   valid=[(k,w) for k,w in ws.items() if p[k] is not None and dist[k]]
   q=sum(w*(bisect.bisect_left(dist[k],p[k])+bisect.bisect_right(dist[k],p[k]))/(2*len(dist[k])) for k,w in valid)/sum(w for k,w in valid)
   p['ratings'][role]=round(5+90*q+3*min(p['games']/100,1)+2*min(p['votes']/max(p['games'],1)/.65,1),1)
  p['ratings']['INT']=max(p['ratings'][role] for role in p['eligiblePositions']);p['limitedDefenceData']=p['rebounds'] is None or p['onePercenters'] is None
out=Path(__file__).resolve().parents[1]/'public'/'game-players.json'
out.write_text(json.dumps({'meta':{'source':'23-0 public player catalogue','sourceUrl':'https://23-0.com/data/players/players.json','snapshot':'2026-10-01','entries':len(players),'ratingVersion':'role-era-percentile-v2'},'players':players},separators=(',',':')))
print(len(players),'records adapted; position eligibility and visible stats retained; scores independently calculated')
