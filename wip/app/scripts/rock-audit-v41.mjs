import fs from 'node:fs';
import {enumerate,logic,solved,violations,dailyPuzzle,move,paintMark} from '../core.js';
import {newAttempt,attemptMove} from '../powers.js';
const data=JSON.parse(fs.readFileSync(new URL('../levels.json',import.meta.url)));
let boards=[];data.levels.forEach(p=>{if(p.rocks.length)boards.push(['pond-'+p.id,p])});
const start=new Date(2026,0,1);const seen=new Set();
for(let d=0;d<365*8;d++){const dt=new Date(2026,0,1+d);for(const e of [true,false]){const p=dailyPuzzle(data,dt,e);if(!p.rocks.length)continue;const k=p.zones.join('')+p.rocks;if(seen.has(k))continue;seen.add(k);boards.push([p.id,p])}}
let bad=[];let stats={boards:boards.length,rockCells:0,zonesWithRock:0};
for(const [id,p] of boards){const sols=enumerate(p);if(sols.length!==1){bad.push([id,'sols',sols.length]);continue}
 const sol=sols[0];if(sol.some(i=>p.rocks.includes(i)))bad.push([id,'sol on rock']);
 if(!logic(p).ok)bad.push([id,'noguess']);
 stats.rockCells+=p.rocks.length;
 // play: drag X all non-solution cells (paintMark skips rocks), then place capys
 let s=newAttempt(p.n);let cells=s.cells;for(let i=0;i<p.n*p.n;i++)if(!sol.includes(i))cells=paintMark(p,cells,i,1);
 if(p.rocks.some(i=>cells[i]!==0))bad.push([id,'rock painted']);
 s={...s,cells};for(const i of sol)s=attemptMove(p,s,i,2);
 if(!solved(p,s.cells)||s.lives!==3)bad.push([id,'not solved via play',s.lives]);
 // rock taps are no-ops
 for(const r of p.rocks){if(attemptMove(p,s,r,1)!==s||attemptMove(p,s,r,2)!==s)bad.push([id,'rock mutable'])}
 // zone with only rocks? zone count
 for(let z=0;z<p.n;z++){const cs=p.zones.map((v,i)=>v===z?i:-1).filter(i=>i>=0);if(cs.every(i=>p.rocks.includes(i)))bad.push([id,'zone all rock',z]);if(cs.some(i=>p.rocks.includes(i)))stats.zonesWithRock++}
 for(let r=0;r<p.n;r++){if(Array.from({length:p.n},(_,c)=>r*p.n+c).every(i=>p.rocks.includes(i)))bad.push([id,'row all rock'])}
 // rock adjacent constraints: does solution have capy orthogonally adjacent to rock? (fine) count
}
console.log(JSON.stringify({stats,bad:bad.slice(0,20),badCount:bad.length}));
