from pathlib import Path
import random,json
from generate import candidate,logic
R=Path(__file__).resolve().parents[1];p=R/'reports/v4.1/candidate-pool.json';pool=json.loads(p.read_text())
for rocks in [1,2,3]:
 rng=random.Random(410700+rocks);found=0;tries=0
 while found<180:
  tries+=1;b=candidate(7,rng,rocks)
  if b and logic(b)[0]:pool.append({'source':f'seeded-7-rocks-{rocks}','sourceIndex':tries,'puzzle':b});found+=1
p.write_text(json.dumps(pool));print(len(pool))
