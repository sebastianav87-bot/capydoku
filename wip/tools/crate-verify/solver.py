"""Tiny exact Sokoban solver for the concept level. BFS = optimal moves; 0-1 BFS = optimal pushes (tie: moves)."""
import json,sys,heapq
from collections import deque
from pathlib import Path
HERE=Path(__file__).parent
D={'u':(-1,0),'d':(1,0),'l':(0,-1),'r':(0,1)}
def parse(rows):
    walls=set();goals=set();boxes=set();player=None
    for r,row in enumerate(rows):
        for c,ch in enumerate(row):
            if ch=='#':walls.add((r,c))
            if ch in '.*+':goals.add((r,c))
            if ch in '$*':boxes.add((r,c))
            if ch in '@+':player=(r,c)
    return walls,goals,frozenset(boxes),player
def dead_squares(rows,walls,goals):
    # simple corner deadlocks (non-goal cell with walls on two orthogonal sides)
    dead=set()
    for r,row in enumerate(rows):
        for c,ch in enumerate(row):
            if (r,c) in walls or (r,c) in goals or ch==' ' and False:continue
            v=((r-1,c) in walls or (r+1,c) in walls);h=((r,c-1) in walls or (r,c+1) in walls)
            if v and h:dead.add((r,c))
    return dead
def step(state,k,walls):
    p,b=state;dr,dc=D[k];n=(p[0]+dr,p[1]+dc)
    if n in walls:return None
    if n in b:
        t=(n[0]+dr,n[1]+dc)
        if t in walls or t in b:return None
        return (n,frozenset((b-{n})|{t})),True
    return (n,b),False
def solve_moves(rows):
    walls,goals,boxes,player=parse(rows);dead=dead_squares(rows,walls,goals)
    start=(player,boxes);prev={start:None};q=deque([start])
    while q:
        s=q.popleft()
        if s[1]==goals:
            path=[];x=s
            while prev[x]:x,k=prev[x];path.append(k)
            return ''.join(reversed(path)),len(prev)
        for k in 'udlr':
            res=step(s,k,walls)
            if not res:continue
            ns,pushed=res
            if pushed and any(bb in dead for bb in ns[1]):continue
            if ns not in prev:prev[ns]=(s,k);q.append(ns)
    return None,len(prev)
def solve_pushes(rows):
    walls,goals,boxes,player=parse(rows);dead=dead_squares(rows,walls,goals)
    start=(player,boxes);best={start:(0,0)};prev={start:None};h=[(0,0,0,start)];i=0
    while h:
        pu,mo,_,s=heapq.heappop(h)
        if best[s]<(pu,mo):continue
        if s[1]==goals:
            path=[];x=s
            while prev[x]:x,k=prev[x];path.append(k)
            return ''.join(reversed(path)),pu,mo
        for k in 'udlr':
            res=step(s,k,walls)
            if not res:continue
            ns,pushed=res
            if pushed and any(bb in dead for bb in ns[1]):continue
            c=(pu+pushed,mo+1)
            if ns not in best or c<best[ns]:best[ns]=c;prev[ns]=(s,k);i+=1;heapq.heappush(h,(c[0],c[1],i,ns))
    return None
def replay(rows,path):
    walls,goals,boxes,player=parse(rows);s=(player,boxes);states=[s];pushes=0
    for k in path:
        res=step(s,k,walls);assert res,'illegal move';s,p=res;pushes+=p;states.append(s)
    assert s[1]==goals;return states,pushes
if __name__=='__main__':
    lvl=json.loads((HERE/'level.json').read_text());rows=lvl['rows']
    walls,goals,boxes,player=parse(rows);assert len(boxes)==len(goals)==3
    mp,explored=solve_moves(rows);assert mp,'unsolvable'
    _,mpushes=replay(rows,mp)
    pp,pmin,pmoves=solve_pushes(rows);replay(rows,pp)
    out={'level':lvl['name'],'rows':rows,'solvable':True,'optimal_moves':len(mp),'pushes_in_move_optimal_solution':mpushes,'move_optimal_solution':mp.upper(),
         'optimal_pushes':pmin,'moves_in_push_optimal_solution':pmoves,'push_optimal_solution':pp.upper(),'states_explored_bfs':explored,
         'method':'Exhaustive BFS over (player, box set) states; corner-deadlock pruning only removes provably dead pushes (non-target corner). Pushes optimum via 0-1 Dijkstra.'}
    (HERE/'solver-result.json').write_text(json.dumps(out,indent=2));print(json.dumps(out,indent=2))
