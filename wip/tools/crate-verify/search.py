"""Local search for edited crate layouts. Fitness uses the Designer solver (optimal moves/pushes) and the
silent-trap metrics from analyze.py. Deterministic per seed."""
import json,random,sys,time
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
from solver import parse,solve_moves,solve_pushes,replay
from analyze import push_graph,floor_cells,live_cells
cfg=json.loads(sys.argv[1]);rng=random.Random(cfg['seed'])
rows=[list(r) for r in cfg['start']];H,W=len(rows),len(rows[0])
mlo,mhi=cfg['moves'];plo,phi=cfg['pushes'];maxrocks=cfg['maxrocks'];budget=cfg['seconds']
def interior():return [(r,c) for r in range(1,H-1) for c in range(1,W-1)]
def txt(g):return [''.join(r) for r in g]
cache={}
def evaluate(g):
    key=tuple(txt(g))
    if key in cache:return cache[key]
    R=txt(g);walls,goals,boxes,player=parse(R);res=None
    rocks=sum(1 for (r,c) in interior() if g[r][c]=='#')
    if len(goals)!=3 or len(boxes)!=3 or player is None or boxes&goals:res=(1e9,None)
    else:
        fl=floor_cells(R,walls,player)
        if len(fl)!=sum(1 for (r,c) in interior() if g[r][c]!='#'):res=(1e9,None)  # floor must be one region
        else:
            live=live_cells(fl,walls,goals)
            if any(b not in live for b in boxes):res=(1e9,None)
            else:
                t=time.time();mp,ex=solve_moves(R)
                if not mp:res=(1e9,None)
                else:
                    m=len(mp);pp=solve_pushes(R);pu=pp[1]
                    sc=max(0,mlo-m)+max(0,m-mhi)+2*(max(0,plo-pu)+max(0,pu-phi))+3*max(0,rocks-maxrocks)
                    info=dict(moves=m,pushes=pu,rocks=rocks,explored=ex)
                    if sc<=4:
                        gph,_,_=push_graph(R);info.update({k:gph[k] for k in ['silent_trap_push_rate','silent_first_at_push','max_silent_region','early_silent_trap_states_le3','branch_points']})
                        sc+=100*gph['silent_trap_push_rate']+0.05*gph['max_silent_region']+2*max(0,3-(gph['silent_first_at_push'] or 99))+0.5*gph['early_silent_trap_states_le3']
                    else:sc+=20
                    res=(sc,info)
    cache[key]=res;return res
def mutate(g):
    g=[r[:] for r in g];k=rng.random();cells=interior()
    if k<0.45:
        r,c=rng.choice(cells)
        if g[r][c]=='#':g[r][c]=' '
        elif g[r][c]==' ':g[r][c]='#'
    else:
        ch=rng.choice('$$..@') if k<0.95 else '$'
        src=[(r,c) for (r,c) in cells if g[r][c]==ch];dst=[(r,c) for (r,c) in cells if g[r][c]==' ']
        if src and dst:
            a=rng.choice(src);b=rng.choice(dst);g[a[0]][a[1]]=' ';g[b[0]][b[1]]=ch
    return g
cur=rows;cs,ci=evaluate(cur);best=(cs,txt(cur),ci);t0=time.time();it=0
while time.time()-t0<budget:
    it+=1;n=mutate(cur);
    if rng.random()<0.3:n=mutate(n)
    s,i=evaluate(n)
    if s<=cs or rng.random()<0.03 and s<1e8:cur,cs,ci=n,s,i
    if s<best[0]:best=(s,txt(n),i);print(round(time.time()-t0),it,round(s,2),i,flush=True)
print('BEST',json.dumps({'score':best[0],'rows':best[1],'info':best[2]}),flush=True)
