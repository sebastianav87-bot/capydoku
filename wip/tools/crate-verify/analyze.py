"""Review metrics for crate levels. Uses the Designer solver (copied, unchanged) for optimal moves/pushes,
plus a push-level state-graph analysis for traps (states from which the level is no longer solvable)."""
import json,sys,time
from collections import deque
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
from solver import parse,solve_moves,solve_pushes,replay
D=[(-1,0),(1,0),(0,-1),(0,1)]
def floor_cells(rows,walls,player):
    seen={player};q=deque([player])
    while q:
        r,c=q.popleft()
        for dr,dc in D:
            n=(r+dr,c+dc)
            if n not in walls and n not in seen and 0<=n[0]<len(rows) and 0<=n[1]<len(rows[0]):seen.add(n);q.append(n)
    return seen
def live_cells(floor,walls,goals):
    # cells from which a lone box can reach some goal (reverse pulls from goals)
    live=set(goals);q=deque(goals)
    while q:
        b=q.popleft()
        for dr,dc in D:
            nb=(b[0]-dr,b[1]-dc);pl=(b[0]-2*dr,b[1]-2*dc)  # box pulled from b to nb, player at pl after
            if nb in floor and pl in floor and nb not in live:live.add(nb);q.append(nb)
    return live
def region(p,boxes,floor):
    seen={p};q=deque([p])
    while q:
        r,c=q.popleft()
        for dr,dc in D:
            n=(r+dr,c+dc)
            if n in floor and n not in boxes and n not in seen:seen.add(n);q.append(n)
    return seen
def make_hint(rows,walls,goals):
    # Python port of app crates.js deadlocks(): corner, dead wall line, frozen 2x2 (what the in-game hint can flag)
    H,W=len(rows),len(rows[0])
    solid=lambda c:c in walls or not(0<=c[0]<H and 0<=c[1]<W)
    nb={'up':(-1,0),'down':(1,0),'left':(0,-1),'right':(0,1)}
    N=lambda c,d:(c[0]+nb[d][0],c[1]+nb[d][1])
    def corner(i):return (solid(N(i,'up')) or solid(N(i,'down'))) and (solid(N(i,'left')) or solid(N(i,'right')))
    def line(i):
        for side,along in [('up',('left','right')),('down',('left','right')),('left',('up','down')),('right',('up','down'))]:
            if not solid(N(i,side)):continue
            ok=True;hg=False
            for d in along:
                j=i
                while True:
                    if j in goals:hg=True
                    if not solid(N(j,side)):ok=False;break
                    nx=N(j,d)
                    if solid(nx):break
                    j=nx
                if not ok:break
            if ok and not hg:return True
        return False
    deadsq={(r,c) for r in range(H) for c in range(W) if not solid((r,c)) and (r,c) not in goals and (corner((r,c)) or line((r,c)))}
    def hinted(b):
        if any(c in deadsq for c in b):return True
        occ=lambda c:solid(c) or c in b
        for (r,c) in b:
            for dr,dc in [(0,0),(-1,0),(0,-1),(-1,-1)]:
                sq=[(r+dr,c+dc),(r+dr,c+dc+1),(r+dr+1,c+dc),(r+dr+1,c+dc+1)]
                if all(occ(x) for x in sq) and any(x in b and x not in goals for x in sq):return True
        return False
    return hinted,deadsq
def push_graph(rows,cap=3_000_000):
    walls,goals,boxes,player=parse(rows);floor=floor_cells(rows,walls,player);live=live_cells(floor,walls,goals);hinted,_=make_hint(rows,walls,goals)
    def norm(p,b):reg=region(p,b,floor);return min(reg),reg
    s0p,_=norm(player,boxes);start=(s0p,boxes)
    succ={};depth={start:0};q=deque([start]);order=[start]
    while q:
        s=q.popleft();p,b=s;_,reg=norm(p,b);out=[]
        for bx in b:
            for dr,dc in D:
                pl=(bx[0]-dr,bx[1]-dc);t=(bx[0]+dr,bx[1]+dc)
                if pl in reg and t in floor and t not in b:
                    nb=frozenset((b-{bx})|{t});np_,_=norm(bx,nb);ns=(np_,nb);out.append(ns)
                    if ns not in depth:
                        depth[ns]=depth[s]+1;q.append(ns);order.append(ns)
                        if len(depth)>cap:raise RuntimeError('cap')
        succ[s]=out
    solved={s for s in depth if s[1]==goals}
    pred={}
    for s,o in succ.items():
        for t in o:pred.setdefault(t,[]).append(s)
    good=set(solved);q=deque(solved)
    while q:
        s=q.popleft()
        for t in pred.get(s,[]):
            if t not in good:good.add(t);q.append(t)
    dist={}  # pushes-to-go from good states
    for s in solved:dist[s]=0
    q=deque(solved)
    while q:
        s=q.popleft()
        for t in pred.get(s,[]):
            if t in good and t not in dist:dist[t]=dist[s]+1;q.append(t)
    # trap analysis: pushes from good states that lead to bad states
    trap_moves=0;good_moves=0;branch=0;first_trap_depth=None;forcing=0
    early=[]  # (depth, n_options, n_traps) for good states on an optimal line? use all good states with depth<=4
    for s in good:
        o=succ[s];bad=[t for t in o if t not in good];g=[t for t in o if t in good]
        trap_moves+=len(bad);good_moves+=len(g)
        if len(set(g))>1:branch+=1
        if bad and (first_trap_depth is None or depth[s]<first_trap_depth):first_trap_depth=depth[s]
    st=start;opts=succ[start];start_traps=[t for t in opts if t not in good]
    # "obvious" deadlock = bad state where some box sits on a dead (non-live) cell; subtle = bad without that
    subtle=sum(1 for s in depth if s not in good and all(bb in live for bb in s[1]))
    bad_total=len(depth)-len(good)
    silent={s for s in depth if s not in good and not hinted(s[1])}
    sil_moves=0;sil_first=None;early_sil=0;tot=0
    for s in good:
        o=succ[s];tot+=len(o);k=sum(1 for t in o if t in silent);sil_moves+=k
        if k and (sil_first is None or depth[s]<sil_first):sil_first=depth[s]
        if k and depth[s]<=3:early_sil+=1
    # how long can a player wander inside a silent dead region before being fully stuck (max pushes, BFS depth within silent set)
    def wander(seed):
        seen={seed};q=deque([seed])
        while q:
            x=q.popleft()
            for t in succ.get(x,[]):
                if t in silent and t not in seen:seen.add(t);q.append(t)
        return len(seen)
    sil_region=max((wander(t) for s in good for t in succ[s] if t in silent),default=0)
    return dict(push_states=len(depth),solvable_states=len(good),dead_states=bad_total,subtle_dead_states=subtle,
        trap_push_rate=round(trap_moves/max(1,trap_moves+good_moves),3),branch_points=branch,first_trap_at_push=first_trap_depth,
        start_push_options=len(opts),silent_dead_states=len(silent),silent_trap_push_rate=round(sil_moves/max(1,tot),3),silent_first_at_push=sil_first,early_silent_trap_states_le3=early_sil,max_silent_region=sil_region,start_trap_options=len(start_traps),optimal_pushes_graph=dist.get(start)),floor,live
def box_lines(rows,path):
    walls,goals,boxes,player=parse(rows);s=(player,boxes);lines=0;last=None;switches=0;lastbox=None
    Dm={'u':(-1,0),'d':(1,0),'l':(0,-1),'r':(0,1)}
    for k in path.lower():
        p,b=s;dr,dc=Dm[k];n=(p[0]+dr,p[1]+dc)
        if n in b:
            key=(n,k)
            if last!=(n,k):lines+=1
            last=((n[0]+dr,n[1]+dc),k)
            bid=n
        else:
            if last and last[1]!=k:pass
        s=__import__('solver').step(s,k,walls)[0]
    return lines
def par(m):import math;return int(5*round(m*1.45/5))
def analyze(rows):
    t=time.time();walls,goals,boxes,player=parse(rows)
    mp,explored=solve_moves(rows);_,mpu=replay(rows,mp);pp,pmin,pmoves=solve_pushes(rows)
    g,floor,live=push_graph(rows)
    dead=sorted(floor-live);inner=len(rows)-2
    on_goal=sorted(boxes&goals)
    against=[b for b in boxes if sum((b[0]+dr,b[1]+dc) in walls for dr,dc in D)>=1]
    return dict(rows=rows,size=f'{len(rows[0])-2}x{inner}',rocks=sum(1 for r in range(1,len(rows)-1) for c in range(1,len(rows[0])-1) if rows[r][c]=='#'),
        floor=len(floor),optimal_moves=len(mp),pushes_in_move_optimal=mpu,optimal_pushes=pmin,moves_in_push_optimal=pmoves,
        states_explored_bfs=explored,solution=mp.upper(),push_optimal_solution=pp.upper(),box_lines_move_opt=box_lines(rows,mp),box_lines_push_opt=box_lines(rows,pp),
        dead_squares=len(dead),dead_square_cells=dead,crates_on_fruit_at_start=on_goal,crates_touching_wall_at_start=len(against),
        par_suggested=par(len(mp)),seconds=round(time.time()-t,2),**g)
if __name__=='__main__':
    d=json.loads(Path(sys.argv[1]).read_text());out=[]
    for l in d['levels']:
        a=analyze(l['rows']);a.update(slot=l['slot'],pond=l['pond'],par_draft=l.get('par'));out.append(a)
        print(l['slot'],{k:a[k] for k in ['size','rocks','floor','optimal_moves','pushes_in_move_optimal','optimal_pushes','box_lines_move_opt','states_explored_bfs','push_states','dead_states','subtle_dead_states','trap_push_rate','branch_points','first_trap_at_push','start_push_options','start_trap_options','silent_dead_states','silent_trap_push_rate','silent_first_at_push','early_silent_trap_states_le3','max_silent_region','dead_squares','crates_on_fruit_at_start','crates_touching_wall_at_start','par_draft','par_suggested','seconds']},flush=True)
    Path(sys.argv[2]).write_text(json.dumps(out,indent=1))
