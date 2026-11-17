#!/usr/bin/env python3
"""Independent permutation oracle + monotone proofs; does not write puzzle content."""
from pathlib import Path
import sys,json,subprocess,os,time,datetime,hashlib
from generate import logic,solutions
R=Path(__file__).resolve().parents[1];start=time.monotonic();data=json.loads((R/'levels.json').read_text());old=json.loads((R.parent/'app-v4-backup/levels.json').read_text());assert data['daily']==old['daily'] and data['dailySafe']==old['dailySafe']
js="""import fs from'node:fs';import{dailyPuzzle,enumerate,logic}from'./core.js';const d=JSON.parse(fs.readFileSync('levels.json'));for(const [bank,boards]of[['campaign',d.levels],['daily',d.daily],['dailySafe',d.dailySafe]])for(const p of boards)console.log(JSON.stringify({bank,p,js:enumerate(p),proof:logic(p)}));for(const eligible of[false,true])for(let cycle=0;cycle<8;cycle++)for(let k=0;k<365;k++){const p=dailyPuzzle(d,new Date(2026,0,1+365*cycle+k,12),eligible);console.log(JSON.stringify({bank:'actualDaily',eligible,cycle,p,js:enumerate(p),proof:logic(p)}))}"""
proc=subprocess.Popen(['node','--input-type=module','-e',js],cwd=R,env={**os.environ,'TZ':'America/New_York'},stdout=subprocess.PIPE,text=True);rows=[];sources=[]
for line in proc.stdout:
 v=json.loads(line);p=v['p'];sol=solutions(p);assert len(sol)==1 and v['js']==sol;ok,tr=logic(p);assert ok and v['proof']['ok'];assert sorted(t['cell']for t in tr if 'cell'in t)==sorted(sol[0]);assert sorted(v['proof']['fixed'])==sorted(sol[0]);assert all(t['cell']in sol[0] if 'cell'in t else not set(t['removed']).intersection(sol[0])for t in v['proof']['trace'])
 n=p['n']
 for z in range(n):
  cells={i for i,x in enumerate(p['zones'])if x==z};seen={min(cells)};queue=list(seen)
  for i in queue:
   r,c=divmod(i,n)
   for rr,cc in[(r-1,c),(r+1,c),(r,c-1),(r,c+1)]:
    j=rr*n+cc
    if 0<=rr<n and 0<=cc<n and j in cells and j not in seen:seen.add(j);queue.append(j)
  assert seen==cells
 row={'bank':v['bank'],'id':p['id'],'n':n,'rocks':len(p['rocks']),'unique':True,'noGuess':True,'jsPythonAgree':True,'deductions':len(tr)}
 if v['bank']=='actualDaily':
  if not v['eligible']:assert not p['rocks']
  row.update(date=p['date'],eligible=v['eligible'],cycle=v['cycle']);rows.append(row)
 else:sources.append(row)
assert proc.wait()==0 and len(sources)==760 and len(rows)==5840
for i,p in enumerate(data['levels']):assert p['n']==old['levels'][i]['n'] and len(p['rocks'])==len(old['levels'][i]['rocks']);assert i>=20 or not p['rocks']
summary={'checked_at_EST':datetime.datetime.now().astimezone().isoformat(),'sourceBoards':len(sources),'campaign':30,'dailySources':730,'actualDailyOutputs':len(rows),'allUnique':True,'allNoGuess':True,'allZonesConnected':True,'pythonPermutationOracleAgreesWithJS':True,'everyJSDeductionRespectsUniqueSolution':True,'dailyBanksUnchanged':True,'gridAndRockCountsUnchanged':True,'runtimeContentSHA256':hashlib.sha256((R/'levels.json').read_bytes()).hexdigest(),'elapsedSeconds':round(time.monotonic()-start,2)}
(R/'reports/verification-v4.1.json').write_text(json.dumps({'summary':summary,'sources':sources,'actualDaily':rows},indent=2)+'\n');(R/'reports/verification-v4.1.md').write_text('# v4.1 independent verification\n\n760 source boards (30 campaign + 730 Daily) and 5,840 actual date/eligibility/transform outputs: exactly one solution, complete no-guess monotone proof, connected regions. Independent Python permutation enumeration agrees with JS on every board; every individual JS deduction is consistent with that unique answer.\n\nDaily banks, grid progression and per-pond rock counts are unchanged from frozen v4. All new campaign scoring traces are in `difficulty-v4.1.json`; before/after table in `DIFFICULTY-v4.1.md`.\n\nNo human difficulty calibration is claimed.\n');print(json.dumps(summary,indent=2),flush=True)
