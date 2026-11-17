// Refine the recorded final-boss seed, keeping its rocks, survivor and planted answer.
import fs from 'node:fs';
import {logic,enumerate,solutionCells} from '../core.js';
import {scoreBoard} from '../difficulty.js';
const seedBoard=JSON.parse(fs.readFileSync(new URL('../reports/boss-phases/refinement-seed.json',import.meta.url))).best;
let random=149901;const rnd=()=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return random/2**32};
const p=structuredClone(seedBoard),n=p.n,N=n*n,sol=solutionCells(p),protectedCells=new Set(sol);
const nb=i=>[i-n,i+n,i%n?i-1:-1,i%n<n-1?i+1:-1].filter(j=>j>=0&&j<N);
function connected(zone,cut){const cells=p.zones.flatMap((z,i)=>z===zone&&i!==cut?[i]:[]);if(cells.length<2)return false;const seen=new Set([cells[0]]),q=[cells[0]];for(let k=0;k<q.length;k++)for(const j of nb(q[k]))if(j!==cut&&p.zones[j]===zone&&!seen.has(j)){seen.add(j);q.push(j)}return seen.size===cells.length;}
let current=scoreBoard(p).score,best=current;
for(let step=0;step<150000&&best<1380;step++){
 if(step%10000===0&&step){p.zones=[...JSON.parse(fs.readFileSync(new URL('../reports/boss-phases/refined-final.json',import.meta.url))).zones];current=scoreBoard(p).score;}
 const i=Math.floor(rnd()*N);if(protectedCells.has(i))continue;
 const targets=nb(i).filter(j=>p.zones[j]!==p.zones[i]);if(!targets.length)continue;
 const from=p.zones[i],to=p.zones[targets[Math.floor(rnd()*targets.length)]];if(!connected(from,i))continue;
 p.zones[i]=to;
 if(!logic(p).ok){p.zones[i]=from;continue;}
 const a=scoreBoard(p),temperature=45*(1-(step%10000)/10000)+3;
 if(a.score>=current||rnd()<Math.exp((a.score-current)/temperature))current=a.score;else{p.zones[i]=from;continue;}
 if(a.score>best&&a.pointingSteps>0&&enumerate(p).length===1){best=a.score;fs.writeFileSync(new URL('../reports/boss-phases/refined-final.json',import.meta.url),JSON.stringify(p,null,1)+'\n');console.log('Refined 149:',best);}
}
console.log('Final refined score:',best);
