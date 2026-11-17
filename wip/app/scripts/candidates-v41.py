from pathlib import Path
import json,random
from generate import candidate,logic
from retune_v41_helpers import intro_candidate
R=Path(__file__).resolve().parents[1];old=json.loads((R.parent/'app-v4-backup/levels.json').read_text());pool=[]
for src,boards in [('v4',old['levels']),('daily',old['daily']),('safe',old['dailySafe'])]:
 for i,p in enumerate(boards):pool.append({'source':src,'sourceIndex':i+1,'puzzle':p})
for singles in [0,1,2]:
 rng=random.Random(410030+singles);found=0;tries=0
 while found<180:
  tries+=1;p=intro_candidate(5,rng,singles)if singles else candidate(5,rng,0)
  if p and logic(p)[0]:pool.append({'source':f'seeded-5-singletons-{singles}','sourceIndex':tries,'puzzle':p});found+=1
print('Candidate pool',len(pool),flush=True);(R/'reports/v4.1/candidate-pool.json').write_text(json.dumps(pool))
