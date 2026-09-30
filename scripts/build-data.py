"""Build a compact, independent AFL catalogue from fitzRoy's AFL Tables cache.
Usage: python scripts/build-data.py /path/to/afltables_player_stats.parquet
Requires duckdb. No 23-0 assets, ratings or data are used.
"""
import sys,json,hashlib,bisect
from pathlib import Path
import duckdb
src=Path(sys.argv[1]);con=duckdb.connect()
con.read_parquet(str(src)).create_view('raw_stats')
con.execute('''CREATE VIEW identity_map AS SELECT "First.name" fn, Surname sn, min(ID) resolved_id
 FROM raw_stats WHERE ID IS NOT NULL AND Season >= 1990 GROUP BY "First.name",Surname HAVING count(DISTINCT ID)=1''')
con.execute('''CREATE VIEW resolved_stats AS SELECT r.* REPLACE(
 coalesce(r.ID,m.resolved_id) AS ID,
 coalesce(r.Player,r."First.name" || ' ' || r.Surname) AS Player,
 CASE r."Playing.for" WHEN 'Footscray' THEN 'Western Bulldogs' WHEN 'Kangaroos' THEN 'North Melbourne' ELSE r."Playing.for" END AS "Playing.for")
 FROM raw_stats r LEFT JOIN identity_map m ON r."First.name"=m.fn AND r.Surname=m.sn''')
con.execute('''CREATE VIEW stats AS SELECT * FROM resolved_stats WHERE ID IS NOT NULL AND Player IS NOT NULL''')
fields={'disposals':'Disposals','goals':'Goals','marks':'Marks','tackles':'Tackles','hitouts':'Hit.Outs','rebounds':'Rebounds','onePercenters':'One.Percenters','clearances':'Clearances'}
sql='''SELECT ID id, first(Player) AS name, "Playing.for" club, (Season//10)*10 era, count(*) games, min(Season) firstYear, max(Season) lastYear, first(url) AS source, sum(coalesce("Brownlow.Votes",0)) votes, '''+', '.join(f'avg("{v}") "{k}"' for k,v in fields.items())+''' FROM stats WHERE Season >= 1990 GROUP BY ID,"Playing.for",era HAVING count(*)>=30 ORDER BY id,club,era'''
cur=con.execute(sql);names=[d[0] for d in cur.description];players=[dict(zip(names,r)) for r in cur.fetchall()]
for p in players:
 for k in fields:p[k]=round(p[k],2) if p[k] is not None else None
 p['key']=f"{p['id']}:{p['club']}:{p['era']}"
 # Roles are estimates; assignment is unrestricted and role-specific ratings are shown.
 p['role']='RUC' if (p['hitouts'] or 0)>=7 else 'FWD' if p['goals']>=1.1 else 'MID' if p['disposals']>=19 else 'DEF'
 if (p['rebounds'] or 0)>=3 and p['goals']<.6:p['role']='DEF'
# Compare each metric to player-club entries in the same decade, not across eras.
byera={e:[p for p in players if p['era']==e] for e in sorted({p['era'] for p in players})}
weights={'DEF':{'rebounds':.40,'onePercenters':.25,'marks':.20,'disposals':.15},'MID':{'disposals':.55,'clearances':.25,'tackles':.20},'RUC':{'hitouts':.75,'disposals':.15,'marks':.10},'FWD':{'goals':.75,'marks':.15,'tackles':.10}}
for era,group in byera.items():
 distributions={k:sorted(p[k] for p in group if p[k] is not None) for k in fields}
 for p in group:
  p['ratings']={}
  for role,ws in weights.items():
   valid=[(k,w) for k,w in ws.items() if p[k] is not None and distributions[k]]
   quality=sum(w*(bisect.bisect_left(distributions[k],p[k])+bisect.bisect_right(distributions[k],p[k]))/(2*len(distributions[k])) for k,w in valid)/sum(w for k,w in valid)
   experience=min(p['games']/100,1)
   honours=min(p['votes']/max(p['games'],1)/.65,1)
   p['ratings'][role]=round(35+60*quality+3*experience+2*honours,1)
  p['ratings']['INT']=max(p['ratings'].values())
  # Positional statistics missing before recording began reduce comparability.
  p['limitedDefenceData']=p['rebounds'] is None or p['onePercenters'] is None
meta={'source':'AFL Tables via fitzRoy data cache','sourceUrl':'https://github.com/jimmyday12/fitzroy_data/releases/tag/data','downloadUrl':'https://github.com/jimmyday12/fitzroy_data/releases/download/data/afltables_player_stats.parquet','built':'2026-10-01','lastMatch':str(con.execute('select max(Date) from stats').fetchone()[0]),'minYear':1990,'minGames':30,'unresolvedRowsExcluded':con.execute('select count(*) from resolved_stats where Season>=1990 and (ID is null or Player is null)').fetchone()[0],'resolvedIdentityRows':con.execute('select count(*) from raw_stats r join identity_map m on r."First.name"=m.fn and r.Surname=m.sn where r.Season>=1990 and r.ID is null').fetchone()[0],'matchRows':con.execute('select count(*) from stats where Season>=1990').fetchone()[0],'entries':len(players),'uniquePlayers':len({p['id'] for p in players}),'sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'ratingVersion':'full-side-v1'}
out=Path(__file__).resolve().parents[1]/'public'/'players.json';out.write_text(json.dumps({'meta':meta,'players':players},separators=(',',':'),allow_nan=False))
print(json.dumps(meta,indent=2));print('Clubs',sorted({p['club'] for p in players}))
