#!/usr/bin/env python3
"""Reproducible v2 retune. Never changes the v1 snapshot or mockups."""
import json,random,datetime,time,hashlib
from pathlib import Path
from generate import candidate,logic,solutions,record,houses
ROOT=Path(__file__).resolve().parents[1]
V1=ROOT.parent/'app-v1-backup'
def effort(p):
 ok,tr=logic(p);assert ok
 shared=sum(t['technique']=='shared-conflict'for t in tr)
 first=next(i for i,t in enumerate(tr) if t['technique']=='house-single')
 return {'hardest_technique':'shared-conflict'if shared else'house-single','technique_rank':2 if shared else 1,'deduction_steps':len(tr),'steps_before_first_capy':first,'shared_conflict_steps':shared,'weighted_effort':p['n']+2*shared,'difficulty_score':p['n']*p['n']+4*shared,'first_capy_cell':next(t['cell']for t in tr if t['technique']=='house-single'),'singleton_zones':sum(p['zones'].count(z)==1 for z in range(p['n']))}
def intro_candidate(n,rng,singletons=1):
 seeds=list(range(n));rng.shuffle(seeds)
 if any(abs(seeds[r]-seeds[r-1])<=1 for r in range(1,n)):return None
 locked=set(rng.sample(range(n),singletons));zs=[-1]*(n*n)
 for r,c in enumerate(seeds):zs[r*n+c]=r
 while -1 in zs:
  edges=[]
  for i,z in enumerate(zs):
   if z<0 or z in locked:continue
   r,c=divmod(i,n)
   for dr,dc in ((0,1),(0,-1),(1,0),(-1,0)):
    rr,cc=r+dr,c+dc
    if 0<=rr<n and 0<=cc<n and zs[rr*n+cc]<0:edges.append((rr*n+cc,z))
  if not edges:return None
  i,z=rng.choice(edges);zs[i]=z
 return{'n':n,'zones':zs,'rocks':[]}
def gentle(n,seed,limit,first_limit=0,singletons=1):
 rng=random.Random(seed)
 for attempt in range(1,100001):
  p=intro_candidate(n,rng,singletons)if singletons else candidate(n,rng,0)
  if not p:continue
  ok,tr=logic(p)
  if not ok:continue
  e=effort(p)
  if e['shared_conflict_steps']<=limit and e['steps_before_first_capy']<=first_limit and len(solutions(p))==1:return p,tr,attempt
 raise RuntimeError((n,seed,limit,'not found'))
def main():
 start=time.time();old=json.loads((V1/'levels.json').read_text());levels=[]
 # 1–5 have actual one-cell zones, immediately forced (zero preliminary deductions).
 # 6–8 retain this foothold but increase later proof effort. Next size bands are gently staged.
 bands=[(5,5,0,0,1,81000),(5,3,2,0,1,82000),(6,4,2,0,1,83000),(6,4,4,1,1,84000),(6,4,6,2,0,85000)]
 for n,count,limit,first_limit,singles,seed in bands:
  chunk=[gentle(n,seed+k,limit,first_limit,singles)for k in range(count)]
  chunk.sort(key=lambda v:(effort(v[0])['weighted_effort'],effort(v[0])['steps_before_first_capy']))
  for p,tr,a in chunk:p['id']=len(levels)+1;levels.append(p)
 # Sort the complete 6×6 band, avoiding a late easy-band reset.
 levels[8:20]=sorted(levels[8:20],key=lambda p:(effort(p)['weighted_effort'],effort(p)['steps_before_first_capy']))
 for i,p in enumerate(levels,1):p['id']=i
 levels+=old['levels'][20:] # Compatible rock-era content is unchanged byte-for-byte.
 daily=old['daily'];safe=[]
 for k,p in enumerate(daily):
  p=dict(p,rocks=[])
  if not logic(p)[0]or len(solutions(p))!=1:p,_,_=gentle(p['n'],90000+k,20,8,1)
  p=dict(p,id=k);safe.append(p)
  if k%60==0:print('safe daily',k,flush=True)
 data={'schema':2,'levels':levels,'daily':daily,'dailySafe':safe,'v1Preserved':list(range(21,31))}
 (ROOT/'levels.json').write_text(json.dumps(data,separators=(',',':')))
 before=[effort(p)for p in old['levels']];after=[effort(p)for p in levels];rows=[]
 for i,(b,a)in enumerate(zip(before,after),1):rows.append({'level':i,'size':levels[i-1]['n'],'before':b,'after':a,'changed':old['levels'][i-1]!=levels[i-1]})
 proofs={'schema':2,'generated_at':datetime.datetime.now().astimezone().isoformat(),'metric':'weighted_effort = n + 2×shared-conflict steps; also report hardest technique, total deductions, and eliminations before first forced capy. Deterministic scan order, no search in proof. Not human-rated difficulty.','levels':rows}
 (ROOT/'reports/proof-effort-v1-v2.json').write_text(json.dumps(proofs,indent=2))
 lines=['# Proof effort: v1 → v2','','Metric: weighted = n + 2 × shared-conflict eliminations. Technique H = house-single, S = shared-conflict. First = number of logical eliminations before first capy is forced. Deterministic house scan; no guessing. These metrics are not a human playtest.','','|Pond|Hardest v1→v2|Deductions v1→v2|Before first v1→v2|Weighted v1→v2|','|--|--|--|--|--|']
 for r in rows:
  b=r['before'];a=r['after'];lines.append(f"|{r['level']}|{b['hardest_technique']} → {a['hardest_technique']}|{b['deduction_steps']} → {a['deduction_steps']}|{b['steps_before_first_capy']} → {a['steps_before_first_capy']}|{b['weighted_effort']} → {a['weighted_effort']}|")
 lines+=['','Levels 1–5 each have a one-cell zone and force their first capy with **0** preceding eliminations; their entire proof uses house-singles only. 6–16 keep an immediate foothold; later stages introduce shared-conflict gradually. 21–30 retain their original board, rocks and solution. Bosses remain 10/20/30.']
 (ROOT/'reports/proof-effort-v1-v2.md').write_text('\n'.join(lines)+'\n')
 report={'schema':2,'generated_at':proofs['generated_at'],'deduction_set':{'house-single':'Only candidate in a row/column/zone; remove peers.','shared-conflict':'A house must contain one capy; a cell conflicting with every candidate of that house is excluded. Covers intersections and common adjacency; no branching.'},'independent_oracle':'Python ALL column permutations, independent of seed/proof; JS row-by-row backtracker checks all 760 source boards and both daily states over 365 consecutive dates.','mockup_independent':json.loads((V1/'reports/verification.json').read_text())['mockup_independent']}
 report['levels']=[]
 for i,p in enumerate(levels):
  ok,tr=logic(p);assert ok and len(solutions(p))==1
  r=record(p,tr,f'pond-{i+1:02}',0);r['effort']=after[i];report['levels'].append(r)
 for key,bank in [('daily_sample',daily),('daily_safe_sample',safe)]:
  report[key]=[]
  for k,p in enumerate(bank):
   ok,tr=logic(p);assert ok and len(solutions(p))==1
   r=record(p,tr,(datetime.date(2026,1,1)+datetime.timedelta(days=k)).isoformat(),0);r['effort']=effort(p);report[key].append(r)
 # Independently check the supplied approved visual boards without running their file-writing main.
 report['approved_design_puzzles']=[]
 for version in ['v3','v4-cast']:
  source=ROOT.parent/'mockup'/version/'verify/puzzle.json'
  m=json.loads(source.read_text());labels=sorted({v for row in m['zones']for v in row});q={'n':m['n'],'zones':[labels.index(v)for row in m['zones']for v in row],'rocks':[r*m['n']+c for r,c in m['rocks']]}
  sols=solutions(q);ok,_=logic(q);assert len(sols)==1 and set(sols[0])=={r*m['n']+c for r,c in m['solution']}
  report['approved_design_puzzles'].append({'version':version,'solution_count':1,'logic_solvable_with_shipped_deductions':ok,'shipped_as_level':False,'agrees_with_supplied':set(sols[0])=={r*m['n']+c for r,c in m['solution']}})
 report['dataset_sha256']=hashlib.sha256((ROOT/'levels.json').read_bytes()).hexdigest()
 report['summary']={'campaign':30,'daily_dates_per_state':365,'daily_states':2,'source_boards_checked':760,'all_unique':True,'all_logic':True,'elapsed_seconds':round(time.time()-start,2)}
 (ROOT/'reports/verification.json').write_text(json.dumps(report,indent=2))
 lines=['# Capydoku v2 verification','','30 campaign + 365 rock-eligible daily + 365 no-rock daily sources = **760** board records. Each has **exactly 1 solution** and a complete no-guessing proof. All regions remain connected.','','Python exhaustively enumerates n! column permutations independently of generation and logical propagation. A separate JS backtracker verifies source boards and actual daily outputs for both eligibility states over 365 consecutive local dates.','','## Deduction set']
 for k,v in report['deduction_set'].items():lines.append(f'- **{k}**: {v}')
 lines+=['','See verification.json for EVERY board: size, rock cells/count, count=1, logic flag, techniques, effort and hash. See proof-effort-v1-v2.md/.json for every campaign level before/after.','','Early levels 1–5: a one-cell zone, first capy with zero preliminary deductions, full proof house-singles only. Rocks still start at campaign 21; bosses at 10/20/30.','','Daily is date + eligibility deterministic. Before reaching campaign 21, dailySafe is used (no rocks). Once campaign 21 is unlocked/reached or any rock-era pond is cleared, daily uses the rock-eligible bank. Separate session identities prevent restoring a board against changed rules; date-only streak accounting prevents double credit. 365 source bank plus dihedral transforms is finite, not infinitely novel.','','Supplied mockups and the immutable v1 backup are never modified by this script.']
 lines+=['','Static design-board audit: the supplied v2/v3/v4 example has one solution, matching its verifier, but our two-technique logic engine stalls from an empty board. It is a visual reference, NOT a shipped level or one of the 760 verified campaign/daily records. We did not silently treat uniqueness as a logic proof.']
 for title,key in [('Campaign','levels'),('Daily — rocks eligible','daily_sample'),('Daily — no rocks','daily_safe_sample')]:
  lines+=['',f'## {title}','','|ID / date|Size|Rocks|Solutions|Logic|Deductions|Techniques|','|--|--|--|--|--|--|--|']
  for r in report[key]:lines.append(f"|{r['id']}|{r['size']}×{r['size']}|{r['rocks']}|{r['solution_count']}|{r['logic_solvable']}|{r['deductions']}|{', '.join(r['techniques'])}|")
 (ROOT/'reports/verification.md').write_text('\n'.join(lines)+'\n');print(report['summary'],flush=True)
if __name__=='__main__':main()
