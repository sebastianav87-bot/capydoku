// Teaching targets are derived from the unchanged, independently verified live Level 1.
// Ghost demos never enter the attempt. Replay uses a disposable attempt and restores it.
import{enumerate}from'./core.js';
export const TUTORIAL_COPY=['Tap a tile to mark X','Double-tap to place a capy','Drag across tiles to mark X','You’re ready. Enjoy your pond!'];
export function tutorialPlan(p,cells=Array(p.n*p.n).fill(0)){const solution=enumerate(p)[0],safe=i=>!solution.includes(i)&&!p.rocks.includes(i)&&cells[i]===0;const mark=cells.findIndex((v,i)=>safe(i)),place=solution.find(i=>cells[i]===0);let drag=[];for(let r=0;r<p.n&&!drag.length;r++)for(let c=0;c<=p.n-3;c++){const a=[0,1,2].map(k=>r*p.n+c+k);if(a.every(i=>safe(i)&&i!==mark)){drag=a;break}}return{mark,place,drag,solution}}
export function tutorialAllows(t,i,v,drag=false){return t.step===0?i===t.plan.mark&&v===1&&!drag:t.step===1?i===t.plan.place&&v===2&&!drag:t.step===2?drag&&t.plan.drag.includes(i)&&v===1:false}
