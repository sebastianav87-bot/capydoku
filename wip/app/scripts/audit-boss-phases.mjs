// Produce checkable deduction witnesses, not a hand-written difficulty label.
import fs from 'node:fs';
import {logic,enumerate,solutionCells,peers} from '../core.js';
import {scoreBoard} from '../difficulty.js';
const read=f=>JSON.parse(fs.readFileSync(new URL('../'+f,import.meta.url)));
const data=read('levels.json'),pairs=read('boss-levels.json').levels;
if(pairs.length!==15)throw Error('Expected all 15 boss pairs');
const reports=[];
for(const p of pairs){
 const original=data.levels[p.id-1],a=scoreBoard(p),anchor=p.fixed[0],seeded=new Set(Array.from({length:p.n**2},(_,i)=>i).filter(i=>!p.rocks.includes(i)&&i!==anchor&&!peers(p,i,anchor)));
 const unit=house=>house<p.n?Array.from({length:p.n},(_,c)=>house*p.n+c):house<2*p.n?Array.from({length:p.n},(_,r)=>r*p.n+house-p.n):p.zones.flatMap((z,i)=>z===house-2*p.n?[i]:[]);
 const pointings=a.trace.flatMap((t,index)=>t.interactions.filter(i=>i.kind.includes('pointing')).map(i=>({index,house:t.house,options:t.options,kind:i.kind,removed:i.removed})));
 const links=[];
 for(const from of pointings)for(let j=from.index+1;j<a.trace.length;j++){
  const t=a.trace[j];if(t.house>=2*p.n&&t.house!==from.house&&from.removed.some(i=>unit(t.house).includes(i)))links.push({from,then:{index:j,house:t.house,technique:t.technique,options:t.options||[t.cell]}});
 }
 const diagonals=a.trace.flatMap((t,index)=>t.rank===3?t.adjacency.flatMap(removed=>t.options.filter(option=>Math.abs(Math.floor(option/p.n)-Math.floor(removed/p.n))===1&&Math.abs(option%p.n-removed%p.n)===1&&p.zones[option]!==p.zones[removed]).map(option=>({index,house:t.house,removed,option}))):[]);
 const openingHouse=unit(a.trace[0].house);
 const openingRemovedByFriend=openingHouse.filter(i=>!p.rocks.includes(i)&&peers(p,i,anchor));
 if(!openingRemovedByFriend.length)throw Error(`Opening doesn't use the survivor: ${p.id}`);
 const preferred=Math.floor(p.id/10)%2?'region-column-pointing':'region-row-pointing';
 const decisive=p.id<39?(pointings.find(t=>t.kind===preferred)||pointings[0]):(links.find(l=>l.from.kind===preferred)||links[0]);
 if(!decisive||p.id>=99&&!diagonals.length)throw Error(`Missing deduction witness for ${p.id}`);
 if(enumerate(p).length!==1||!logic(p).ok||!solutionCells(original).includes(anchor)||a.score<=scoreBoard(original).score)throw Error(`Invalid pair ${p.id}`);
 reports.push({id:p.id,anchor:{cell:anchor,row:Math.floor(anchor/p.n)+1,column:anchor%p.n+1},size:p.n,
  phase1Score:scoreBoard(original).score,phase2ScoreWithClue:a.score,opening:{eliminatedByFriend:p.n**2-p.rocks.length-seeded.size-1,firstDeduction:a.trace[0],openingRemovedByFriend},
  decisive,regionToRegionChains:links.length,diagonalWitnesses:diagonals,unique:true,noGuess:true});
}
fs.mkdirSync(new URL('../reports/boss-phases/',import.meta.url),{recursive:true});
fs.writeFileSync(new URL('../reports/boss-phases/pair-verification.json',import.meta.url),JSON.stringify(reports,null,1)+'\n');
console.table(reports.map(r=>({boss:r.id,phase1:r.phase1Score,phase2:r.phase2ScoreWithClue,chains:r.regionToRegionChains,diagonal:r.diagonalWitnesses.length,anchor:`r${r.anchor.row}c${r.anchor.column}`})));
