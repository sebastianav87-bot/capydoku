import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { logic, enumerate, solutionCells, boardSignature, fresh, load, KEY, sanitize, withLocks } from '../core.js';
import { bossBoard, phaseTwoAttempt, freshBossAttempt, restoreBoss } from '../bosses.js';
import { BOSS_PONDS } from '../roles.js';
import { attemptMove, newAttempt, awardPureBoss, usePower, undoAttempt } from '../powers.js';
import { scoreBoard } from '../difficulty.js';
import { awardLilies, pondTargetMs, targetMs, AttemptClock, totalLilies } from '../rewards.js';
import { logicScore, MAX_SCORE, TARGET_SECONDS } from '../score.js';
const read=f=>JSON.parse(fs.readFileSync(new URL('../'+f,import.meta.url)));
const data={...read('levels.json'),bosses:read('boss-levels.json').levels};
const published=JSON.parse(fs.readFileSync(new URL('../../../levels.json',import.meta.url)));
const mem=p=>({value:JSON.stringify(p),getItem(k){return k===KEY?this.value:null},setItem(k,v){if(k===KEY)this.value=v}});

test('all 15 pairs: unchanged phase 1; same rocks/size; unique, no-guess, harder second board and shared survivor',()=>{
 assert.deepEqual(data.bosses.map(p=>p.id),BOSS_PONDS);
 const evidence=read('reports/boss-phases/pair-verification.json');
 const dry=read('reports/v5.0/levels-dry.json');for(const id of BOSS_PONDS)assert.deepEqual(data.levels[id-1],dry.levels[id-1]);
 assert.deepEqual(data.levels.slice(0,30),published.levels);
 const seen=new Set(data.levels.filter(p=>!p.crate).map(boardSignature));
 for(const second of data.bosses){
  const first=data.levels[second.id-1],a=solutionCells(first),b=enumerate(second);
  assert.equal(second.n,first.n);assert.deepEqual(second.rocks,first.rocks);
  assert.equal(second.fixed.length,1);assert.ok(a.includes(second.fixed[0]));
  assert.equal(b.length,1,`boss ${first.id} unique with survivor`);assert.ok(b[0].includes(second.fixed[0]));
  assert.ok(logic(second).ok,`boss ${first.id} no guessing`);
  assert.ok(b[0].filter(i=>!a.includes(i)).length>=Math.floor(first.n/2),'new answer, not just a recolor');
  assert.ok(!seen.has(boardSignature(second)));seen.add(boardSignature(second));
  assert.ok(scoreBoard(second).score>scoreBoard(first).score,`boss ${first.id} seeded phase 2 harder`);
  assert.ok(scoreBoard(second).pointingSteps>0);
  const witness=evidence.find(p=>p.id===first.id);assert.ok(witness.opening.openingRemovedByFriend.length);
  if(first.id>=39)assert.ok(witness.regionToRegionChains>0);
  if(first.id>=99)assert.ok(witness.diagonalWitnesses.length>0);
  assert.ok(logic(second).trace[0].removed?.length||logic(second).trace[0].cell!==undefined);
  for(let z=0;z<second.n;z++){
   const cells=second.zones.flatMap((v,i)=>v===z?[i]:[]),visit=new Set([cells[0]]),q=[cells[0]];
   for(const i of q)for(const j of [i-second.n,i+second.n,i%second.n?i-1:-1,i%second.n<second.n-1?i+1:-1])if(cells.includes(j)&&!visit.has(j)){visit.add(j);q.push(j);}
   assert.equal(visit.size,cells.length,`boss ${first.id} connected region ${z}`);
  }
 }
});
test('phase checkpoint/refills keep whole-boss time, mistakes and power use; fixed friend cannot be undone',()=>{
 const first=bossBoard(data,9),second=bossBoard(data,9,2),s=freshBossAttempt(first);
 s.metrics={known:true,started:true,elapsedMs:55000,mistakes:2};s.power={used:true,kind:'secondChance',napRemaining:0,peekCell:null};s.lives=1;
 let next=phaseTwoAttempt(second,s);
 assert.equal(next.lives,3);assert.equal(next.cells.filter(v=>v===2).length,1);assert.equal(next.cells[second.fixed[0]],2);
 assert.deepEqual(next.metrics,s.metrics);assert.equal(next.power.used,true);
 next=withLocks(second,next);
 const wrong=next.cells.findIndex((_,i)=>!second.rocks.includes(i)&&!solutionCells(second).includes(i));
 for(let i=0;i<3;i++)next=attemptMove(second,next,wrong,2);
 assert.equal(next.lives,0);assert.equal(next.metrics.mistakes,5);
 const retry=withLocks(second,phaseTwoAttempt(second,next));
 assert.equal(retry.lives,3);assert.equal(retry.metrics.mistakes,5);assert.equal(retry.metrics.elapsedMs,55000);
 assert.equal(usePower(second,retry,'Jun'),retry,'spent power stays spent, even after changing companions');
 assert.equal(undoAttempt(retry,Array(second.n**2).fill(0),second).cells[second.fixed[0]],2);
 const nap=phaseTwoAttempt(second,{...s,power:{used:true,kind:'nap',napRemaining:2,peekCell:null}});
 const protectedMove=attemptMove(second,nap,wrong,2);assert.equal(protectedMove.lives,3);assert.equal(protectedMove.power.napRemaining,1);
 assert.equal(phaseTwoAttempt(second,protectedMove).power.napRemaining,1,'retry never refunds Nap charges');
});
test('phase 2 and its histories survive save/load even with zero oranges; old half-played bosses still use phase 1',()=>{
 const p=fresh(),first=bossBoard(data,149),second=bossBoard(data,149,2),s=phaseTwoAttempt(second,freshBossAttempt(first));
 s.lives=0;s.metrics.mistakes=4;s.power.used=true;s.power.kind='nap';
 p.sessions['pond-149']={...s,signature:boardSignature(second)};
 const r=load(mem(p),data);
 assert.deepEqual(r.contentMigration.dropped,[]);assert.equal(r.progress.sessions['pond-149'].boss.phase,2);
 assert.equal(r.progress.sessions['pond-149'].lives,0);assert.equal(r.progress.sessions['pond-149'].metrics.mistakes,4);
 assert.equal(r.progress.sessions['pond-149'].power.used,true);
 const old=newAttempt(first.n);old.cells[solutionCells(first)[0]]=2;
 p.sessions['pond-149']={...old,signature:boardSignature(data.levels[148])};
 const legacy=load(mem(p),data).progress.sessions['pond-149'];
 assert.equal(restoreBoss(first,legacy).boss.phase,1);assert.deepEqual(legacy.cells,old.cells);
});
test('old completed bosses, lilies, golden lilies and best scores stay untouched; replay starts in phase 1',()=>{
 const p=fresh();p.completed=[9,19,29];p.goldenLilies=[9,29];p.scores={9:{best:3150,at:1}};
 p.lilies={9:{cleared:true,noMistakes:true,underTarget:true,bestMs:1000,bestMistakes:0}};
 const r=load(mem(p),data).progress;
 assert.deepEqual(r.completed,p.completed);assert.deepEqual(r.goldenLilies,p.goldenLilies);assert.deepEqual(r.scores,p.scores);
 assert.equal(totalLilies(r),5);assert.equal(freshBossAttempt(bossBoard(data,9)).boss.phase,1);
});
test('two-board targets, final oranges and unchanged 3150 score ceiling; phase 1 grants no golden',()=>{
 const first=bossBoard(data,9),second=bossBoard(data,9,2),s=freshBossAttempt(first),p=fresh();
 s.cells=Array(first.n**2).fill(0);for(const i of solutionCells(first))s.cells[i]=2;
 assert.equal(awardPureBoss(p,first,s),false);assert.deepEqual(p.goldenLilies,[]);
 assert.equal(pondTargetMs(second),2*targetMs(second.n));
 assert.equal(logicScore({id:9,n:first.n,oranges:3,seconds:0,phases:2}),MAX_SCORE);
 const elapsed=TARGET_SECONDS[first.n]*1.5;
 assert.ok(logicScore({id:9,n:first.n,oranges:1,seconds:elapsed,phases:2})>1800);
 assert.equal(logicScore({id:9,n:first.n,oranges:3,seconds:0,phases:2,helped:true}),1575);
 const dirty=phaseTwoAttempt(second,{...s,metrics:{known:true,started:true,elapsedMs:1234,mistakes:1}});
 for(const i of solutionCells(second))dirty.cells[i]=2;
 assert.equal(awardLilies(p,second,dirty.metrics).after.noMistakes,false);
 dirty.power.used=true;assert.equal(awardPureBoss(p,second,dirty),false);
 dirty.power.used=false;assert.equal(awardPureBoss(p,second,dirty),true);assert.equal(awardPureBoss(p,second,dirty),false);
 const before=totalLilies(p);assert.deepEqual(awardLilies(p,second,dirty.metrics).newly,[false,false,false]);assert.equal(totalLilies(p),before);
});
test('transition and hidden time are not counted by the shared active clock',()=>{
 let now=0;const clock=new AttemptClock(()=>now),s=freshBossAttempt(bossBoard(data,9));
 clock.bind(s.metrics);clock.begin();clock.sync(true);now=1000;clock.pause();
 const next=phaseTwoAttempt(bossBoard(data,9,2),s);clock.bind(next.metrics);now+=2000;
 clock.sync(true);now+=3000;clock.pause();assert.equal(next.metrics.elapsedMs,4000);
 now+=50000;clock.sync(true);now+=1000;clock.pause();assert.equal(next.metrics.elapsedMs,5000);
});
test('new content and module are precached; unchanged remote ranking remains disabled',async()=>{
 const pre=read('reports/precache.json');for(const f of ['bosses.js','boss-levels.json'])assert.ok(pre.urls.includes(f));
 const {GAME_CONFIG}=await import('../config.js');assert.equal(GAME_CONFIG.leaderboardApi,'');
});
