import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { fresh, KEY, solutionCells, boardSignature } from '../core.js';
import { newAttempt } from '../powers.js';
const data=JSON.parse(fs.readFileSync(new URL('../levels.json',import.meta.url)));
const second=JSON.parse(fs.readFileSync(new URL('../boss-levels.json',import.meta.url))).levels;
const read=page=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
let errors;
test.beforeEach(async({page})=>{errors=[];page.on('pageerror',e=>errors.push(e.message));});
test.afterEach(()=>expect(errors).toEqual([]));
async function seed(page,id,extra={}){
 const first=data.levels[id-1],state=newAttempt(first.n),sol=solutionCells(first);
 sol.slice(0,-1).forEach(i=>state.cells[i]=2);
 state.metrics={known:true,started:true,elapsedMs:45000,mistakes:0};
 Object.assign(state,extra);
 await page.goto('/?lb=none');
 await page.evaluate(({key,p})=>{localStorage.clear();sessionStorage.clear();localStorage.setItem(key,JSON.stringify(p));},{key:KEY,p:{...fresh(),nickname:'Boss tester',starterChosen:true,tutorialSeen:true,rockIntroSeen:true,music:false,audio:false,completed:Array.from({length:id-1},(_,i)=>i+1),sessions:{[`pond-${id}`]:{...state,signature:boardSignature(first)}}}});
 await page.reload();await expect(page.locator('.screen[data-boss-phase="1"]')).toBeVisible();
 return {first,sol,board:second.find(p=>p.id===id)};
}
async function capyTool(page){const tool=page.getByRole('button',{name:'Capy tool',exact:true});if(await tool.getAttribute('aria-pressed')!=='true')await tool.tap();}
async function finishFirst(page,sol){await capyTool(page);await page.locator(`[data-cell="${sol.at(-1)}"]`).tap();}
async function phase2(page){await expect(page.locator('.screen[data-boss-phase="2"]:not(.boss-shifting)')).toBeVisible({timeout:10000});await expect(page.locator('.boss-phase')).toContainText('Phase 2 of 2');}
async function finishSecond(page,board){await capyTool(page);for(const i of solutionCells(board).filter(i=>!board.fixed.includes(i)))await page.locator(`[data-cell="${i}"]`).tap();await expect(page.locator('.screen.solved')).toBeVisible();}
for(const id of [9,149]){
 test(`boss ${id}: full transformation, shared survivor, combined score and one reward`,async({page},info)=>{
  const {first,sol,board}=await seed(page,id);
  await expect(page.locator('.boss-phase')).toHaveText('Phase 1 of 2');
  const colors=await page.locator('.cell').evaluateAll(nodes=>nodes.map(n=>n.style.getPropertyValue('--zone-gradient')));
  await finishFirst(page,sol);
  await expect(page.locator('.boss-shifting')).toBeVisible();
  await expect(page.locator('.boss-sinking')).toHaveCount(first.n-1);
  await expect(page.locator('.boss-earth[aria-hidden="true"]')).toHaveCount(first.n-1);
  await expect(page.locator('.boss-earth .dust-puff')).toHaveCount((first.n-1)*7);
  await expect(page.locator('.boss-earth .earth-crumb')).toHaveCount((first.n-1)*4);
  const delays=await page.locator('.boss-sinking').evaluateAll(nodes=>nodes.map(n=>parseFloat(n.style.getPropertyValue('--sink-delay'))));expect(delays).toEqual(Array.from({length:first.n-1},(_,i)=>300+90*i));await expect(page.locator('.boss-staying')).toHaveCount(1);
  await expect(page.locator('.spring,.pond-score')).toHaveCount(0);
  const checkpoint=await read(page);expect(checkpoint.completed).not.toContain(id);expect(checkpoint.scores[id]).toBeUndefined();expect(checkpoint.sessions[`pond-${id}`].boss.phase).toBe(2);
  await page.screenshot({path:`reports/boss-phases/screens/${info.project.name}-${id}-transform.png`});
  await phase2(page);
  expect(await page.locator('.cell').evaluateAll(nodes=>nodes.map(n=>n.style.getPropertyValue('--zone-gradient')))).not.toEqual(colors);
  await expect(page.locator('.cell[data-value="2"]')).toHaveCount(1);await expect(page.locator('.cell[data-value="1"]')).toHaveCount(0);
  await expect(page.locator(`[data-cell="${board.fixed[0]}"]`)).toHaveClass(/boss-survivor/);
  await expect(page.locator('.lives')).toHaveAttribute('data-lives','3');
  await page.screenshot({path:`reports/boss-phases/screens/${info.project.name}-${id}-phase2.png`});
  await finishSecond(page,board);
  const after=await read(page);expect(after.completed.filter(i=>i===id)).toHaveLength(1);expect(after.goldenLilies.filter(i=>i===id)).toHaveLength(1);
  expect(after.lilies[id].noMistakes).toBe(true);expect(after.lilies[id].bestMs).toBeGreaterThanOrEqual(45000);
  expect(after.scores[id].best).toBeGreaterThan(0);expect(after.scores[id].best).toBeLessThanOrEqual(3150);
  expect(after.sessions[`pond-${id}`].boss.rewarded).toBe(true);
  await page.reload();const reloaded=await read(page);expect(reloaded.lilies[id]).toEqual(after.lilies[id]);expect(reloaded.scores[id]).toEqual(after.scores[id]);expect(reloaded.goldenLilies).toEqual(after.goldenLilies);
 });
 test(`boss ${id}: reload during transformation, offline phase 2, loss/retry retains errors and spent power`,async({page,context})=>{
  const {sol,board}=await seed(page,id,{metrics:{known:true,started:true,elapsedMs:45000,mistakes:1},power:{used:true,kind:'secondChance',napRemaining:0,peekCell:null}});
  await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  await finishFirst(page,sol);await expect(page.locator('.boss-shifting')).toBeVisible();
  await context.setOffline(true);await page.reload();await phase2(page);
  await expect(page.locator('.cell[data-value="2"]')).toHaveCount(1);
  await capyTool(page);
  const wrong=Array.from({length:board.n**2},(_,i)=>i).find(i=>!board.rocks.includes(i)&&!solutionCells(board).includes(i));
  for(let k=0;k<3;k++)await page.locator(`[data-cell="${wrong}"]`).tap();
  await expect(page.getByRole('heading',{name:'Out of oranges'})).toBeVisible();
  await page.reload();await expect(page.getByRole('heading',{name:'Out of oranges'})).toBeVisible();
  await page.getByRole('button',{name:'Try again',exact:true}).tap();await phase2(page);
  await expect(page.locator('.lives')).toHaveAttribute('data-lives','3');await expect(page.locator('.cell[data-value="2"]')).toHaveCount(1);
  let stored=(await read(page)).sessions[`pond-${id}`];expect(stored.metrics.mistakes).toBe(4);expect(stored.power.used).toBe(true);expect(stored.metrics.elapsedMs).toBeGreaterThanOrEqual(45000);
  await page.reload();await phase2(page);await finishSecond(page,board);
  const p=await read(page);expect(p.lilies[id].cleared).toBe(true);expect(p.lilies[id].noMistakes).toBe(false);expect(p.goldenLilies).not.toContain(id);
  expect(p.sessions[`pond-${id}`].metrics.mistakes).toBe(4);expect(p.sessions[`pond-${id}`].power.used).toBe(true);expect(p.scores[id].best).toBeLessThanOrEqual(1575);expect(await page.evaluate(()=>navigator.onLine)).toBe(false);
 });
 test(`boss ${id}: reduced motion keeps a clear survivor and changes the regions without sinking animation`,async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  const {sol,board}=await seed(page,id);await capyTool(page);
  const state=await page.locator(`[data-cell="${sol.at(-1)}"]`).evaluate(el=>{el.click();return {reduced:document.querySelector('.screen').dataset.reduced,sinks:[...document.querySelectorAll('.boss-sinking .capy')].map(n=>getComputedStyle(n).animationName),survivors:document.querySelectorAll('.boss-staying').length,dust:document.querySelectorAll('.boss-earth').length};});
  expect(state.dust).toBe(0);expect(state.reduced).toBe('true');expect(state.survivors).toBe(1);expect(state.sinks.every(a=>a==='none')).toBe(true);
  await phase2(page);await expect(page.locator(`[data-cell="${board.fixed[0]}"]`)).toHaveAttribute('data-value','2');await expect(page.locator('.spring,.flyer')).toHaveCount(0);
 });
}
test('an already completed legacy boss keeps rewards, and Replay starts both phases',async({page})=>{
 await seed(page,9);
 await page.getByRole('button',{name:'Back to home',exact:true}).tap();
 await expect(page.locator('.hub')).toBeVisible();
 await page.evaluate(k=>{const p=JSON.parse(localStorage.getItem(k));p.completed.push(9);p.lilies[9]={cleared:true,noMistakes:true,underTarget:true,bestMs:2000,bestMistakes:0};p.goldenLilies=[9];p.scores={9:{best:3150,at:1}};delete p.sessions['pond-9'];localStorage.setItem(k,JSON.stringify(p));},KEY);
 await page.reload();await page.locator('[data-action="settings"]').tap();await page.locator('[data-action="progress"]').tap();await page.locator('[data-action="replayPond"][data-level="9"]').tap();
 await expect(page.locator('.boss-phase')).toHaveText('Phase 1 of 2');await expect(page.locator('.cell[data-value="2"]')).toHaveCount(0);
 const p=await read(page);expect(p.goldenLilies).toEqual([9]);expect(p.scores[9].best).toBe(3150);expect(p.lilies[9].underTarget).toBe(true);
 await capyTool(page);for(const i of solutionCells(data.levels[8]))await page.locator(`[data-cell="${i}"]`).tap();
 await expect(page.locator('.boss-shifting')).toBeVisible();await page.reload();await phase2(page);
 await expect(page.locator('.pond-wrap')).toHaveAttribute('data-level','9');
 expect((await read(page)).scores[9].best).toBe(3150);
});
