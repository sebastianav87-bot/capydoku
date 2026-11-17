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
