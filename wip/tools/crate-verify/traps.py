import json,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
from solver import parse
from analyze import floor_cells,live_cells,region,make_hint
from collections import deque
D={'up':(-1,0),'down':(1,0),'left':(0,-1),'right':(0,1)}
def first_silent(rows,maxd=3,limit=6):
    # BFS on push level, report pushes from solvable states (depth<=maxd) into silent dead states
    from analyze import push_graph
    walls,goals,boxes,player=parse(rows);floor=floor_cells(rows,walls,player);hinted,_=make_hint(rows,walls,goals)
    # reuse push_graph internals by recomputing good set
    import analyze
    g,_,_=push_graph(rows)
    return g
