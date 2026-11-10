import{move,violations,enumerate,peers,cleanAttempt,solved}from './core.js';
import{CHARACTERS}from './characters.js';import{GAME_CONFIG}from './config.js';
export const POWER_NAMES={peek:'Peek',secondChance:'Second chance',nap:'Nap'};
export function newAttempt(n){return{cells:Array(n*n).fill(0),lives:3,...cleanAttempt(null,n*n)}}
export function effectivePower(selected,chill,config=GAME_CONFIG){return chill&&config.relaxPowersAsPeek?'peek':(CHARACTERS[selected]||CHARACTERS.Jun).power}
export function peekCandidates(p,s){const solutions=enumerate(p),solution=solutions[0]||[];return solution.filter(i=>solutions.every(sol=>sol.includes(i))&&s.cells[i]===0&&!p.rocks.includes(i)&&!p.fixed?.includes(i)&&!s.cells.some((v,j)=>v===2&&peers(p,i,j)))}
export function canUsePower(p,s,selected,chill,config=GAME_CONFIG){if(s.power.used||solved(p,s.cells))return false;const kind=effectivePower(selected,chill,config);if(chill&&kind!=='peek')return false;if(kind==='peek')return peekCandidates(p,s).length>0;if(kind==='secondChance')return !!s.lastMistake&&s.lives<3;return s.lives>0}
export function usePower(p,s,selected,chill,rng=Math.random,config=GAME_CONFIG){if(!canUsePower(p,s,selected,chill,config))return s;const kind=effectivePower(selected,chill,config),next={...s,cells:[...s.cells],power:{used:true,kind,napRemaining:0,peekCell:null}};
 if(kind==='peek'){const candidates=peekCandidates(p,s);next.power.peekCell=candidates[Math.min(candidates.length-1,Math.max(0,Math.floor(rng()*candidates.length)))];}
 if(kind==='nap')next.power.napRemaining=3;
 if(kind==='secondChance'){const i=s.lastMistake.cell;if(next.cells[i]===2&&violations(p,next.cells).has(i))next.cells[i]=0;next.lives=Math.min(3,s.lives+1);next.lastMistake=null;}
 return next;
}
// Charges and power use are attempt resources: Undo never refunds them.
export function attemptMove(p,s,i,value,chill){if(s.lives===0&&!chill)return s;const charge=(value===2&&s.cells[i]!==2)||(value===1&&s.cells[i]===0),protectedMove=charge&&s.power.napRemaining>0;
 const result=move(p,s,i,value,chill||protectedMove);if(result===s)return s;
 const next={...s,...result,power:{...s.power}};if(protectedMove)next.power.napRemaining--;
 if(result.lives<s.lives)next.lastMistake={cell:i};
 if(next.power.peekCell!==null&&next.cells[next.power.peekCell]!==0)next.power.peekCell=null;
 return next;
}
export function undoAttempt(s,cells){return{...s,cells:[...cells],power:{...s.power,peekCell:s.power.peekCell!==null&&cells[s.power.peekCell]===0?s.power.peekCell:null}}}
export function awardPureBoss(progress,p,s,daily=false){if(solved(p,s.cells)&&!daily&&[10,20,30].includes(p.id)&&!s.power.used&&!progress.goldenLilies.includes(p.id)){progress.goldenLilies.push(p.id);return true}return false}

// Forgiving recovery: remove every currently conflicting capy, never consult the solution.
// Undo can restore them; lives, Peek use and Nap charges are never refunded.
export function clearConflicts(p,s){const bad=violations(p,s.cells);return bad.size?{...s,cells:s.cells.map((v,i)=>bad.has(i)?0:v)}:s}
