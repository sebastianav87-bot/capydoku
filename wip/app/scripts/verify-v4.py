#!/usr/bin/env python3
"""Read-only v4 verification: unchanged content plus independent actual-date oracle."""
from pathlib import Path
import sys,subprocess,json,datetime,os,time,hashlib
ROOT=Path(__file__).resolve().parents[1];R=ROOT/'reports';sys.path.insert(0,str(ROOT/'scripts'))
from generate import logic,solutions
start=time.monotonic();env={**os.environ,'TZ':'America/New_York'}
subprocess.run([sys.executable,'scripts/verify-v3.py'],cwd=ROOT,check=True,env=env)
subprocess.run(['node','scripts/verify-daily-v3.mjs'],cwd=ROOT,check=True,env=env)
# Runtime JS date selection / dihedral transform, then an independent n! Python oracle.
js="""import fs from'node:fs';import{dailyPuzzle,enumerate}from'./core.js';const data=JSON.parse(fs.readFileSync('levels.json'));for(const eligible of[false,true])for(let cycle=0;cycle<8;cycle++)for(let k=0;k<365;k++){const p=dailyPuzzle(data,new Date(2026,0,1+365*cycle+k,12),eligible);console.log(JSON.stringify({eligible,cycle,p,jsSolution:enumerate(p)[0]}))}"""
p=subprocess.Popen(['node','--input-type=module','-e',js],cwd=ROOT,env=env,stdout=subprocess.PIPE,text=True)
rows=[]
for line in p.stdout:
 v=json.loads(line);q=v['p'];sol=solutions(q);assert len(sol)==1
 ok,tr=logic(q);assert ok
 assert sorted(t['cell']for t in tr if 'cell'in t)==sorted(sol[0])==sorted(v['jsSolution'])
 if not v['eligible']:assert not q['rocks']
 rows.append({'date':q['date'],'eligible_for_rocks':v['eligible'],'cycle':v['cycle'],'size':q['n'],'rocks':len(q['rocks']),'solution_count':1,'logic_solvable':True,'techniques':sorted({t['technique']for t in tr}),'deductions':len(tr),'independent_python_agrees_with_js':True})
assert p.wait()==0 and len(rows)==5840
summary={'date_state_outputs':len(rows),'consecutive_dates_per_state':2920,'eligibility_states':2,'cycles':8,'all_unique':True,'all_pure_logic':True,'every_python_oracle_agrees_with_js':True,'timezone':'America/New_York','elapsed_seconds':round(time.monotonic()-start,2)}
(R/'daily-independent-v4.json').write_text(json.dumps({'summary':summary,'outputs':rows},indent=2)+'\n')
x=json.loads((R/'verification.json').read_text());x['round']='v4';x['progress_schema']=3;x['content_byte_identical_to_v3_1']=hashlib.sha256((ROOT/'levels.json').read_bytes()).hexdigest()==hashlib.sha256((ROOT.parent/'app-v3.1-backup/levels.json').read_bytes()).hexdigest();assert x['content_byte_identical_to_v3_1'];x['actual_date_crosscheck']=summary
x['tutorial']={'campaign_level':1,'size':5,'uses_unchanged_verified_campaign':True,'source_4x4_demonstration_not_substituted':True,'rationale':'Preserve campaign content, compatible partial games and valid real-player tutorial marks; guide derives safe targets on the current Level 1.'}
(R/'verification-v4.json').write_text(json.dumps(x,indent=2)+'\n')
s=(R/'verification.md').read_text().replace('# Capydoku v3 verification','# Capydoku v4 verification',1);s=s.replace('See proof-effort-v1-v2-v3.md','See proof-effort-v1-v2-v3-v4.md');s=s.replace('## Deduction set','Every one of the **5,840 actual daily date/state outputs** additionally agrees with independent Python permutation enumeration and a complete Python logic proof, not only its source board. Detailed rows: `daily-independent-v4.json`.\n\n## Deduction set',1);s+='\n## v4 tutorial\n\nThe interactive guide uses the unchanged, verified 5×5 campaign Pond 1. The source\'s static 4×4 demonstration is not substituted. Player marks persist; ghost effects do not.\n';(R/'verification-v4.md').write_text(s)
e=json.loads((R/'proof-effort-v1-v2-v3.json').read_text());e['round']='v4'
for r in e['levels']:r['v4']=r['v3'];r['v3_1_to_v4_changed']=False
(R/'proof-effort-v1-v2-v3-v4.json').write_text(json.dumps(e,indent=2)+'\n');s=(R/'proof-effort-v1-v2-v3.md').read_text().replace('v1 → v2 → v3','v1 → v2 → v3 → v4').replace('v2/v3','v2/v3/v4').replace('v3 changes powers / UI only: every v2 and v3 metric is identical.','v3/v3.1/v4 change presentation, powers and input only: every v2 through v4 content metric is identical.');(R/'proof-effort-v1-v2-v3-v4.md').write_text(s)
print(json.dumps(summary,indent=2))
