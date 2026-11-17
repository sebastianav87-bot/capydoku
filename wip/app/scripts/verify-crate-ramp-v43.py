#!/usr/bin/env python3
"""v4.3 planning: verify the DRAFT 6-level crate ramp with the Designer's approved solver (imported read-only).
Writes reports/v4.3/crate-ramp-draft.json only; crate-levels.json (live data) is NOT touched in phase 1."""
import json,sys,hashlib,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];V=Path('/workspace/capydoku/mockup/boxworld-concept/v3/verify')
sys.path.insert(0,str(V));import solver
live={L['name']:L['rows'] for L in json.loads((ROOT/'crate-levels.json').read_text())['levels']}
picks=json.loads((ROOT/'reports/v4.3/crates/picks.json').read_text())
RAMP=[
 dict(slot='C1',pond=5,source='NEW draft (seeded scripts/gen-crate-levels.mjs 7x7)',rows=picks['C1']),
 dict(slot='C2',pond=10,source='live Crate Cove 3 (Designer v3 level, unchanged)',rows=live['Crate Cove 3']),
 dict(slot='C3',pond=15,source='NEW draft (seeded 7x7)',rows=picks['C3']),
 dict(slot='C4',pond=20,source='live Crate Cove 5 (unchanged)',rows=live['Crate Cove 5']),
 dict(slot='C5',pond=25,source='NEW draft (seeded 8x8 + capped hill-climb, scripts/climb-crates-v43.mjs)',rows=picks.get('C5')),
 dict(slot='C6',pond=30,source='NEW draft (seeded 8x8 + capped hill-climb, scripts/climb-crates-v43.mjs)',rows=picks.get('C6')),
]
out=[]
for L in RAMP:
 rows=L['rows']
 if not rows: out.append(dict(slot=L['slot'],pond=L['pond'],status='to-be-built'));continue
 walls,goals,boxes,player=solver.parse(rows);assert len(boxes)==len(goals)==3 and player
 t=time.time();mp,explored=solver.solve_moves(rows);assert mp,L['slot']+' unsolvable'
 _,mpushes=solver.replay(rows,mp);pp,pmin,pmoves=solver.solve_pushes(rows);solver.replay(rows,pp)
 par=(len(mp)*29+50)//100*5;  # v4.3 par rule (moves × 1.45, nearest 5)
 n=len(rows)-2
 out.append(dict(slot=L['slot'],pond=L['pond'],status='solver-verified',source=L['source'],board=f'{n}x{n}',rocks=sum(r[1:-1].count('#') for r in rows[1:-1]),optimal_moves=len(mp),pushes_in_move_optimal=mpushes,optimal_pushes=pmin,par=par,states_explored_bfs=explored,solve_seconds=round(time.time()-t,2),solution=mp.upper(),rows=rows))
 print(L['slot'],L['pond'],f'{n}x{n}','moves',len(mp),'pushes',mpushes,'opt pushes',pmin,'par',par,'explored',explored,flush=True)
(ROOT/'reports/v4.3/crate-ramp-draft.json').write_text(json.dumps(dict(solver=str(V/'solver.py'),solver_sha256=hashlib.sha256((V/'solver.py').read_bytes()).hexdigest(),levels=out),indent=1)+'\n')
