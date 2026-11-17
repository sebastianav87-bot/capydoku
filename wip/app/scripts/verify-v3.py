#!/usr/bin/env python3
"""Read-only v3 content audit: no regeneration, no mockup / backup writes."""
from pathlib import Path
import json,hashlib,datetime,time,runpy
from generate import logic,solutions,record
ROOT=Path(__file__).resolve().parents[1]
start=time.time();data=json.loads((ROOT/'levels.json').read_text());v2=json.loads((ROOT.parent/'app-v2-backup/levels.json').read_text());assert data==v2
old=json.loads((ROOT/'reports/verification.json').read_text());effort=runpy.run_path(str(ROOT/'scripts/retune-v2.py'))['effort']
report={k:old[k] for k in ['deduction_set','mockup_independent']};report.update(schema=3,generated_at=datetime.datetime.now().astimezone().isoformat(),dataset_sha256=hashlib.sha256((ROOT/'levels.json').read_bytes()).hexdigest(),v2_content_unchanged=True,independent_oracle='Python exhaustively enumerates every column permutation with separate adjacency, rock and zone constraints. Separate JavaScript row DFS cross-checks every source and actual date/eligibility outputs; it checks every logical deduction against the unique solution.')
for key,bank in [('levels',data['levels']),('daily_sample',data['daily']),('daily_safe_sample',data['dailySafe'])]:
 report[key]=[]
 for i,p in enumerate(bank):
  ok,tr=logic(p);assert ok;assert len(solutions(p))==1
  for z in range(p['n']):
   cells=[j for j,v in enumerate(p['zones']) if v==z];seen={cells[0]};queue=[cells[0]]
   for a in queue:
    for b in cells:
     if b not in seen and abs(a//p['n']-b//p['n'])+abs(a%p['n']-b%p['n'])==1:seen.add(b);queue.append(b)
   assert len(seen)==len(cells)
  label=f'pond-{i+1:02}' if key=='levels' else (datetime.date(2026,1,1)+datetime.timedelta(days=i)).isoformat()
  row=record(p,tr,label,0);row['effort']=effort(p);report[key].append(row)
report['approved_design_puzzles']=[]
for version in ['v3','v4-cast','v5-starters']:
 m=json.loads((ROOT.parent/'mockup'/version/'verify/puzzle.json').read_text());labels=sorted({v for row in m['zones'] for v in row});q={'n':m['n'],'zones':[labels.index(v)for row in m['zones']for v in row],'rocks':[r*m['n']+c for r,c in m['rocks']]};sol=solutions(q);ok,_=logic(q);assert len(sol)==1 and set(sol[0])=={r*m['n']+c for r,c in m['solution']};report['approved_design_puzzles'].append({'version':version,'solution_count':1,'logic_solvable_with_shipped_deductions':ok,'shipped_as_level':False,'agrees_with_supplied':True})
report['summary']={'campaign':30,'daily_dates_per_state':365,'daily_states':2,'source_boards_checked':760,'all_unique':True,'all_logic':True,'all_regions_connected':True,'elapsed_seconds':round(time.time()-start,2)}
(ROOT/'reports/verification.json').write_text(json.dumps(report,indent=2))
lines=['# Capydoku v3 verification','','**760/760 unique, complete pure-logic proofs, connected zones.** Campaign and both daily banks are unchanged from the immutable v2 snapshot. No powers are required for any proof.','','## Independent checks','','Python exhaustively enumerates all n! column permutations, separately applying zone / rock / adjacent-row constraints. The JavaScript row DFS shares neither the oracle algorithm nor the generation seed. JS checks each deduction against the unique solution. Actual daily outputs are tested for 365 consecutive local dates in both eligibility states; the additional dihedral audit covers all 8 transform cycles (5,840 date/state outputs).','','## Deduction set']
for k,v in report['deduction_set'].items():lines.append(f'- **{k}**: {v}')
lines+=['','Levels 1–5 have one-cell zones; first forced capy requires **0 preliminary eliminations** and all five proofs use house-single only. Rocks begin at 21. Bosses are 10/20/30. See proof-effort-v1-v2-v3.md for every campaign level.','','Daily uses local calendar date + rock eligibility, 365 source boards per state with 8 dihedral transforms. Streak is date-only, idempotent across both states. This is a finite deterministic bank, not infinite novelty.','','The supplied v5 static visual puzzle is unique but not solvable from empty by this two-technique set. It is NOT shipped as a campaign/daily board. Its fixed Doze example is not added to the unchanged campaign rules.']
for title,key in [('Campaign','levels'),('Daily — eligible','daily_sample'),('Daily — no rocks','daily_safe_sample')]:
 lines+=['',f'## {title}','','|ID / date|Size|Rocks|Solutions|Logic|Deductions|Techniques|','|--|--|--|--|--|--|--|']
 for r in report[key]:lines.append(f"|{r['id']}|{r['size']}×{r['size']}|{r['rocks']}|{r['solution_count']}|{r['logic_solvable']}|{r['deductions']}|{', '.join(r['techniques'])}|")
(ROOT/'reports/verification.md').write_text('\n'.join(lines)+'\n')
prior=json.loads((ROOT/'reports/proof-effort-v1-v2.json').read_text());rows=[]
for i,r in enumerate(prior['levels']):rows.append({'level':i+1,'size':data['levels'][i]['n'],'v1':r['before'],'v2':r['after'],'v3':effort(data['levels'][i]),'v2_to_v3_changed':False});assert rows[-1]['v2']==rows[-1]['v3']
metric=prior['metric'];(ROOT/'reports/proof-effort-v1-v2-v3.json').write_text(json.dumps({'schema':3,'metric':metric,'levels':rows},indent=2))
lines=['# Proof effort: v1 → v2 → v3','','Metric: weighted = n + 2 × shared-conflict deductions. Deterministic house scan, no guessing. This is proof effort, not human-rated difficulty. v3 changes powers / UI only: every v2 and v3 metric is identical.','','|Pond|Size|Hardest v1 → v2/v3|Deductions v1 → v2/v3|Steps before first v1 → v2/v3|Weighted v1 → v2/v3|','|--|--|--|--|--|--|']
for r in rows:
 b=r['v1'];a=r['v3'];lines.append(f"|{r['level']}|{r['size']}|{b['hardest_technique']} → {a['hardest_technique']}|{b['deduction_steps']} → {a['deduction_steps']}|{b['steps_before_first_capy']} → {a['steps_before_first_capy']}|{b['weighted_effort']} → {a['weighted_effort']}|")
(ROOT/'reports/proof-effort-v1-v2-v3.md').write_text('\n'.join(lines)+'\n');print(report['summary'])
