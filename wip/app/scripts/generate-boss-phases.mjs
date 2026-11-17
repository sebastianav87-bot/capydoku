// Seeded search for connected second-phase regions. Rocks, size and one survivor stay in place.
// A constructive no-guess proof from the survivor is required, then independent enumeration verifies uniqueness.
import fs from 'node:fs';
import { logic, enumerate, solutionCells, peers } from '../core.js';
import { scoreBoard } from '../difficulty.js';
const data=JSON.parse(fs.readFileSync(new URL('../levels.json',import.meta.url)));
const bosses=data.levels.filter(p=>p.id%10===9);
let seed=7350901;
const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
const pick=a=>a[Math.floor(rnd()*a.length)];
const from = Number(process.argv[2] || 0);
const output=from ? JSON.parse(fs.readFileSync(new URL('../boss-levels.json',import.meta.url))).levels.filter(p=>p.id<from) : [];
const audits=from ? JSON.parse(fs.readFileSync(new URL('../reports/boss-phases/design-audit.json',import.meta.url))).filter(p=>p.id<from) : [];
for(const old of bosses){
 if(old.id<from)continue;
 if(from)seed=7350901+old.id*631;
 const n=old.n,N=n*n,first=solutionCells(old),threshold=scoreBoard(old).score;
 const nb=i=>[i-n,i+n,i%n?i-1:-1,i%n<n-1?i+1:-1].filter(j=>j>=0&&j<N);
 let best=null,bestAudit=null;
 for(let attempt=0;attempt<1800 && (!best || bestAudit.score<threshold+60);attempt++){
  const anchor=first[(attempt+Math.floor(old.id/10))%first.length];
  function plant(r=0,path=[]){
   if(r===n)return path;
   const candidates=Array.from({length:n},(_,c)=>r*n+c).sort(()=>rnd()-.5);
   for(const i of candidates){
    if((Math.floor(anchor/n)===r&&i!==anchor)||old.rocks.includes(i)||path.some(j=>i%n===j%n)||r&&Math.abs(i%n-path.at(-1)%n)<=1)continue;
    const sol=plant(r+1,[...path,i]);if(sol)return sol;
   }
   return null;
  }
  const sol=plant();if(!sol||sol.filter(i=>first.includes(i)).length>Math.ceil(n/2))continue;
  const z=Array(N).fill(-1);sol.forEach((i,k)=>z[i]=k);let left=N-n;
  while(left){const frontier=[];for(let i=0;i<N;i++)if(z[i]>=0)for(const j of nb(i))if(z[j]<0)frontier.push([j,z[i]]);const[j,k]=pick(frontier);z[j]=k;left--;}
  const p={id:old.id,n,zones:z,rocks:[...old.rocks],fixed:[anchor]};
  const protectedCells=new Set(sol);
  function connected(zone,cut){const cells=z.flatMap((v,i)=>v===zone&&i!==cut?[i]:[]);if(cells.length<2)return false;const seen=new Set([cells[0]]),q=[cells[0]];for(let k=0;k<q.length;k++)for(const j of nb(q[k]))if(j!==cut&&z[j]===zone&&!seen.has(j)){seen.add(j);q.push(j);}return seen.size===cells.length;}
  function quality(){const proof=logic(p);return proof.ok?1e6+scoreBoard(p).score:proof.fixed.length*1000+proof.trace.length;}
  let score=quality(),stale=0;
  for(let step=0;step<2600&&stale<800;step++){
   const i=Math.floor(rnd()*N);if(protectedCells.has(i))continue;
   const options=nb(i).filter(j=>z[j]!==z[i]);if(!options.length)continue;
   const from=z[i],to=z[pick(options)];if(!connected(from,i))continue;
   z[i]=to;const q=quality();
   if(q>=score){stale=q>score?0:stale+1;score=q;}else{z[i]=from;stale++;}
   if(score>=1e6 && (!bestAudit || score-1e6>bestAudit.score)){
    const a=scoreBoard(p);
    if(a.pointingSteps<1 || a.commonConflictSteps<2)continue;
    const all=enumerate(p);if(all.length!==1||!all[0].includes(anchor))continue;
    best=structuredClone(p);bestAudit={score:a.score,phase1Score:threshold,anchor,changedCapys:n-sol.filter(i=>first.includes(i)).length,pointingSteps:a.pointingSteps,commonConflictSteps:a.commonConflictSteps,trace:a.trace};
   }
  }
 }
 if(!best||bestAudit.score<=threshold)throw Error(`No harder phase for ${old.id}: ${bestAudit?.score} <= ${threshold}`);
 output.push(best);audits.push({id:old.id,...bestAudit});
 fs.writeFileSync(new URL('../boss-levels.json',import.meta.url),JSON.stringify({schema:1,levels:output},null,1)+'\n');
 fs.mkdirSync(new URL('../reports/boss-phases/',import.meta.url),{recursive:true});
 fs.writeFileSync(new URL('../reports/boss-phases/design-audit.json',import.meta.url),JSON.stringify(audits,null,1)+'\n');
 console.log(`Boss ${old.id}: ${threshold} → ${bestAudit.score}, survivor ${best.fixed[0]}, pointing ${bestAudit.pointingSteps}`);
}
