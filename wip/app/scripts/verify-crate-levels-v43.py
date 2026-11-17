#!/usr/bin/env python3
"""v4.3: READ-ONLY re-verification of crate-levels.json (6 crate ponds) with the Designer's approved solver
(mockup/boxworld-concept/v3/verify/solver.py, imported read-only). Writes nothing unless a report path is given.
(The v4.2 scripts/verify-crate-levels.py REGENERATES crate-levels.json with the v4.2 levels; do not run it on v4.3.)"""
import json,sys,hashlib,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];V=Path('/workspace/capydoku/mockup/boxworld-concept/v3/verify')
sys.path.insert(0,str(V));import solver
data=json.loads((ROOT/'crate-levels.json').read_text())
assert data['solver_sha256']==hashlib.sha256((V/'solver.py').read_bytes()).hexdigest(),'solver changed'
rep=[]
for L in data['levels']:
 t=time.time();rows=L['rows'];walls,goals,boxes,player=solver.parse(rows);assert len(boxes)==len(goals)==3 and player
 mp,explored=solver.solve_moves(rows);assert mp,L['name']+' unsolvable'
 _,mpushes=solver.replay(rows,mp)
 assert len(mp)==L['optimalMoves'],(L['name'],len(mp),L['optimalMoves'])
 assert mpushes==L['pushesInMoveOptimal'],L['name']
 assert L['par']==(len(mp)*29+50)//100*5,L['name']  # one par rule: moves × 1.45, nearest 5
 solver.replay(rows,L['solution'].lower())
 rep.append(dict(pond=L['pond'],name=L['name'],n=L['n'],optimal_moves=len(mp),pushes=mpushes,par=L['par'],explored=explored,seconds=round(time.time()-t,2)))
 print(L['pond'],L['name'],L['n'],'moves',len(mp),'pushes',mpushes,'par',L['par'],'explored',explored,'%.2fs'%(time.time()-t))
if len(sys.argv)>1:Path(sys.argv[1]).write_text(json.dumps(rep,indent=1)+'\n')
