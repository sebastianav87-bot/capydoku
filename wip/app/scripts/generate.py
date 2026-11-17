#!/usr/bin/env python3
"""Seeded connected-region generator + monotone no-guessing proof + independent permutation oracle."""
import itertools,json,random,hashlib,datetime,time,runpy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
TECH=['house-single','shared-conflict']
def conflicts(p,a,b):
 n=p['n']; ar,ac=divmod(a,n);br,bc=divmod(b,n)
 return a!=b and (ar==br or ac==bc or p['zones'][a]==p['zones'][b] or max(abs(ar-br),abs(ac-bc))<=1)
def houses(p):
 n=p['n'];return [[r*n+c for c in range(n)] for r in range(n)]+[[r*n+c for r in range(n)]for c in range(n)]+[[i for i,z in enumerate(p['zones']) if z==a] for a in range(n)]
def logic(p):
 n=p['n'];can=set(range(n*n))-set(p['rocks']);fixed=set();trace=[];hs=houses(p)
 peers={i:{j for j in range(n*n) if conflicts(p,i,j)} for i in range(n*n)}
 while len(fixed)<n:
  opts=[can.intersection(unit)for unit in hs]
  if any(not x for x in opts):return False,trace
  singles=[(h,next(iter(x)))for h,x in enumerate(opts)if len(x)==1 and next(iter(x))not in fixed]
  if singles:
   h,a=singles[0];fixed.add(a);gone=can&peers[a];can-=gone;trace.append({'technique':'house-single','house':h,'cell':a,'removed':len(gone)});continue
  change=False
  for h,choices in enumerate(opts):
   if len(choices)<2:continue
   gone=set.intersection(*(peers[a]for a in choices))&can
   if gone:
    can-=gone;trace.append({'technique':'shared-conflict','house':h,'removed':len(gone)});change=True;break
  if not change:return False,trace
 return True,trace
# Independent oracle: full permutation enumeration, not the logical solver or generation seed.
def solutions(p):
 n=p['n'];zs=p['zones'];rocks=set(p['rocks']);out=[]
 for cols in itertools.permutations(range(n)):
  if any(abs(cols[r]-cols[r-1])<=1 for r in range(1,n)):continue
  cells=[r*n+c for r,c in enumerate(cols)]
  if any(i in rocks for i in cells):continue
  if len({zs[i]for i in cells})!=n:continue
  out.append(cells)
 return out

def candidate(n,rng,rocks):
 seeds=list(range(n));rng.shuffle(seeds)
 if any(abs(seeds[i]-seeds[i-1])<=1 for i in range(1,n)):return None
 z=[-1]*(n*n);front=[]
 for r,c in enumerate(seeds):z[r*n+c]=r
 while -1 in z:
  edges=[]
  for i,x in enumerate(z):
   if x==-1:continue
   r,c=divmod(i,n)
   for dr,dc in ((0,1),(0,-1),(1,0),(-1,0)):
    rr,cc=r+dr,c+dc
    if 0<=rr<n and 0<=cc<n and z[rr*n+cc]==-1:edges.append((rr*n+cc,x))
  i,x=rng.choice(edges);z[i]=x
 # eliminate skinny tiny late puzzles; still allow introductory size-one seed regions.
 if min(z.count(x) for x in range(n))<2:return None
 sol={r*n+c for r,c in enumerate(seeds)}
 rock=rng.sample(sorted(set(range(n*n))-sol),rocks)
 return {'n':n,'zones':z,'rocks':sorted(rock)}
def generate(n,seed,rocks):
 rng=random.Random(seed)
 for attempt in range(1,50001):
  p=candidate(n,rng,rocks)
  if p:
   ok,tr=logic(p)
   if ok and len(solutions(p))==1:
    return p,tr,attempt
 raise RuntimeError((n,seed,'no acceptable puzzle'))
def record(p,tr,label,attempt):
 sol=solutions(p)
 assert len(sol)==1
 return {'id':label,'size':p['n'],'rocks':len(p['rocks']),'rock_cells':p['rocks'],'solution_count':len(sol),'logic_solvable':True,'techniques':sorted({t['technique']for t in tr}),'deductions':len(tr),'shared_conflict_steps':sum(t['technique']=='shared-conflict'for t in tr),'attempts':attempt,'puzzle_sha256':hashlib.sha256(json.dumps(p,sort_keys=True).encode()).hexdigest()}
def main():
 start=time.time();pool={};levels=[];records=[]
 # Order each size band by proof effort. Boss = final (most deductions) in its band.
 for n,total,base in ((5,8,10000),(6,12,20000),(7,10,30000)):
  chunk=[]
  for k in range(total):
   p,tr,a=generate(n,base+k,(1+k//4) if n==7 else 0);chunk.append((p,tr,a))
  chunk.sort(key=lambda x:(len(x[1]),sum(t['technique']=='shared-conflict'for t in x[1])))
  for p,tr,a in chunk:
   i=len(levels)+1;p['id']=i;levels.append(p);records.append(record(p,tr,f'pond-{i:02}',a))
 daily=[];drec=[];day=datetime.date(2026,1,1)
 for k in range(365):
  n=6 if k%3 else 7;p,tr,a=generate(n,500000+k,1 if n==7 else 0);p['id']=k;daily.append(p)
  drec.append(record(p,tr,(day+datetime.timedelta(days=k)).isoformat(),a))
  if k%50==0:print('daily',k,flush=True)
 # Audit supplied static verifier without invoking its writing main.
 mock=runpy.run_path('/workspace/capydoku/mockup/v2/verify/solver.py')
 mp={'n':6,'zones':['ABCDEF'.index(x)for row in mock['ZONES']for x in row],'rocks':[r*6+c for r,c in mock['ROCKS']]}
 assert len(solutions(mp))==len(mock['enumerate_all']())==1
 ok,tr=logic(mp)
 data={'schema':1,'levels':levels,'daily':daily}
 (ROOT/'levels.json').write_text(json.dumps(data,separators=(',',':')))
 report={'schema':1,'generated_at':datetime.datetime.now().astimezone().isoformat(),'deduction_set':{'house-single':'The sole candidate in a row, column or zone is forced; remove all its row/column/zone/king-neighbor peers.','shared-conflict':'A house must contain one capy. A cell conflicting with EVERY remaining candidate of that house is impossible. Includes locked row/zone intersections and common adjacency exclusion. No branching, no search, no solution lookup.'},'independent_oracle':'Enumerates ALL column permutations; independently checks adjacent rows, zones and rocks. Generation and logic trace do not constrain this enumeration. Runtime JS backtracker cross-checks all 395 boards in unit tests.','mockup_independent':{'solution_count':1,'agrees_with_original':True,'logic_solvable':ok},'levels':records,'daily_sample':drec,'summary':{'levels':30,'daily_dates':365,'all_unique':True,'all_logic':True,'elapsed_seconds':round(time.time()-start,2)}}
 (ROOT/'reports/verification.json').write_text(json.dumps(report,indent=2))
 lines=['# Capydoku verification','', '30 campaign boards + 365 daily source boards. Every board has exactly **1** solution and a complete monotone, no-guessing proof.','', '## Deduction set']
 for k,v in report['deduction_set'].items():lines.append(f'- **{k}**: {v}')
 lines+=['','The independent oracle enumerates all n! column permutations, not the generator seed or logical proof. The supplied mockup agrees with our oracle (1 solution). Its original colorblind script contains a stale earlier palette; the application uses notes.md/assets/palette.json, not that script.','', 'Daily mapping: calendar day number modulo 365 selects a generated source board, followed by a year-cycle dihedral transform. 2026-01-01 through 2026-12-31 are independently verified here; runtime JS tests verify the actual transformed daily output on those 365 consecutive dates. Dates use local year/month/day, never UTC date slicing. Bank is finite (365 sources), not an infinite random-puzzle claim.','', 'Difficulty is a heuristic, not playtested: 5×5 ponds 1–8; 6×6 ponds 9–20; 7×7 ponds 21–30. Each size band is sorted by logical proof effort; rocks start at 21. Boss ponds 10/20/30 use the same rules and grant Beanie/Orange/Duck.','', '|Pond|Size|Rocks|Solutions|Logic|Deductions|Techniques|','|--|--|--|--|--|--|--|']
 for r in records:lines.append(f"|{r['id']}|{r['size']}×{r['size']}|{r['rocks']}|1|yes|{r['deductions']}|{', '.join(r['techniques'])}|")
 lines+=['','Daily: all 365 per-date rows (size, rock cells/count, count=1, logic flag, techniques, deductions, SHA-256) are in verification.json.','',f'Generation + exhaustive verification: {report["summary"]["elapsed_seconds"]} seconds.']
 (ROOT/'reports/verification.md').write_text('\n'.join(lines)+'\n')
 print(report['summary'],flush=True)
if __name__=='__main__':main()
