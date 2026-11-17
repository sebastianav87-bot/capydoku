import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import {fresh,KEY,solutionCells,boardSignature} from '../core.js';
import {newAttempt} from '../powers.js';
const data=JSON.parse(fs.readFileSync(new URL('../levels.json',import.meta.url))),bosses=JSON.parse(fs.readFileSync(new URL('../boss-levels.json',import.meta.url))).levels;
const url='/?lb=http://127.0.0.1:8791';
const done=n=>Array.from({length:n},(_,i)=>i+1);
async function seed(page,extra){await page.goto(url);await page.evaluate(({k,p})=>{localStorage.clear();sessionStorage.clear();localStorage.setItem(k,JSON.stringify(p));},{k:KEY,p:{...fresh(),nickname:'Sebas',starterChosen:true,tutorialSeen:true,rockIntroSeen:true,music:false,audio:false,bonus:{...fresh().bonus,controlsSeen:true},...extra}});await page.reload();await page.locator('.hub,.game,.crate-screen').first().waitFor();}
async function open(page){if(await page.locator('.pause-btn,[aria-label="Pause"]').first().isVisible()){await page.getByRole('button',{name:/Pause/}).first().tap();await page.getByRole('button',{name:'🏆 Leaderboard',exact:true}).tap();}else await page.getByRole('button',{name:'🏆 Leaderboard',exact:true}).first().tap();await expect(page.getByRole('dialog',{name:'Leaderboard',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Overall',exact:true})).toHaveAttribute('aria-pressed','true');}
async function join(page,name){await page.getByRole('button',{name:'Join leaderboard',exact:true}).tap();await expect(page.locator('#lb-name')).toHaveValue(name);await expect(page.locator('.lb-preview')).toContainText(name);await page.getByRole('button',{name:'Join leaderboard',exact:true}).tap();await expect(page.getByRole('button',{name:'Leave and delete my entry',exact:true})).toBeVisible();}
async function refreshUntil(page,text){await expect.poll(async()=>{await page.getByRole('button',{name:'Refresh',exact:true}).tap();return page.locator('.top10-list').innerText().catch(()=> '');},{timeout:15000,intervals:[500,1000,1500]}).toContain(text);}
async function capy(page){const tool=page.getByRole('button',{name:'Capy tool',exact:true});if(await tool.getAttribute('aria-pressed')!=='true')await tool.tap();}

test('two independent profiles share progress/points; anonymous browse, replay, offline queue and leave',async({browser},info)=>{
 const a=await browser.newContext({baseURL:'http://127.0.0.1:8765',isMobile:true,hasTouch:true,viewport:{width:390,height:750}}),b=await browser.newContext({baseURL:'http://127.0.0.1:8765',isMobile:true,hasTouch:true,viewport:{width:390,height:750}});
 try{
 const pa=await a.newPage(),pb=await b.newPage(),errors=[];pa.on('pageerror',e=>errors.push(e.message));pb.on('pageerror',e=>errors.push(e.message));
 const p=data.levels[41],sol=solutionCells(p),partial=newAttempt(p.n);for(const i of sol.slice(0,-1))partial.cells[i]=2;partial.metrics={known:true,started:true,mistakes:0,elapsedMs:45000};
 await seed(pa,{completed:done(41),scores:{1:{best:1800,at:1},2:{best:1800,at:2}},sessions:{'pond-42':{...partial,signature:boardSignature(p)}}});
 await open(pa);await expect(pa.getByRole('columnheader',{name:'Last cleared'})).toBeVisible();await join(pa,'Sebas');await refreshUntil(pa,'Pond 41');await expect(pa.locator('.top10-row.me')).toContainText('3,600 pts');
 await pa.getByRole('button',{name:'Close leaderboard'}).tap();await expect(pa.locator('.pond-wrap')).toHaveAttribute('data-level','42');await expect(pa.locator('.cell[data-value="2"]')).toHaveCount(p.n-1);
 await seed(pb,{nickname:'Mossy',completed:done(10)});await open(pb);await refreshUntil(pb,'Sebas');await expect(pb.locator('.top10-row').filter({hasText:'Sebas'})).toContainText('Pond 41');
 expect(await pb.evaluate(()=>JSON.parse(localStorage.getItem('capydoku.leaderboard')||'null')?.optIn||false)).toBe(false);
 await capy(pa);await pa.locator(`[data-cell="${sol.at(-1)}"]`).tap();await expect(pa.locator('.screen.solved')).toBeVisible();await refreshUntil(pb,'Pond 42');
 // A migrated pond gains a score on replay without advancing the contiguous campaign again.
 const before=(await pa.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY)).scores[42].best;
 await pa.getByRole('button',{name:'Back to home'}).tap();await pa.locator('[data-action="settings"]').tap();await pa.locator('[data-action="progress"]').tap();await pa.locator('[data-action="replayPond"][data-level="42"]').tap();await capy(pa);for(const i of sol)await pa.locator(`[data-cell="${i}"]`).tap();
 await expect(pa.locator('.screen.solved')).toBeVisible();const after=await pa.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);expect(after.scores[42].best).toBeGreaterThan(before);expect(after.completed.filter(id=>id===42)).toHaveLength(1);await refreshUntil(pb,'Pond 42');
 await pa.locator('[data-action="next"]').tap();await expect(pa.locator('.pond-wrap')).toHaveAttribute('data-level','43');await pa.evaluate(()=>navigator.serviceWorker.ready);await pa.waitForFunction(()=>!!navigator.serviceWorker.controller);
 await a.setOffline(true);await capy(pa);for(const i of solutionCells(data.levels[42]))await pa.locator(`[data-cell="${i}"]`).tap();await expect(pa.locator('.screen.solved')).toBeVisible();
 await pa.getByRole('button',{name:'Back to home'}).tap();await open(pa);await expect(pa.locator('.last-synced')).toContainText('Last synced');await pa.reload();await open(pa);await expect(pa.locator('.last-synced')).toBeVisible();
 await a.setOffline(false);await refreshUntil(pb,'Pond 43');
 await pb.getByRole('button',{name:'By world',exact:true}).tap();await pb.getByLabel('World',{exact:true}).selectOption('1');await refreshUntil(pb,'Pond 43');
 await join(pb,'Mossy');await refreshUntil(pb,'Mossy');await pb.screenshot({path:`reports/shared-leaderboard/${info.project.name}-by-world.png`});
 await pa.getByRole('button',{name:'Refresh',exact:true}).tap();await expect(pa.getByRole('button',{name:'Leave and delete my entry',exact:true})).toBeVisible();await pa.getByRole('button',{name:'Leave and delete my entry',exact:true}).tap();await expect(pa.getByRole('button',{name:'Join leaderboard',exact:true})).toBeVisible();
 await expect.poll(async()=>{await pb.getByRole('button',{name:'Refresh',exact:true}).tap();return pb.locator('.top10-list').innerText();},{timeout:15000}).not.toContain('Sebas');
 await pb.getByRole('button',{name:'Leave and delete my entry',exact:true}).tap();
 expect(errors).toEqual([]);
 }finally{await a.close();await b.close();}
});

test('Leaderboard closes to the same two-phase boss board and the same crate state',async({page})=>{
 const p=bosses[0],s=newAttempt(p.n);s.cells[p.fixed[0]]=2;s.cells[solutionCells(p).find(i=>i!==p.fixed[0])]=2;const mark=s.cells.findIndex((v,i)=>!v&&!p.rocks.includes(i));s.cells[mark]=1;s.boss={phase:2,rewarded:false};
 await seed(page,{completed:done(8),sessions:{'pond-9':{...s,signature:boardSignature(p)}}});await expect(page.locator('.boss-phase')).toContainText('Phase 2 of 2');
 const before=await page.locator('.cell').evaluateAll(nodes=>nodes.map(n=>n.dataset.value));await open(page);await page.getByRole('button',{name:'Close leaderboard'}).tap();await expect(page.locator('.boss-phase')).toContainText('Phase 2 of 2');expect(await page.locator('.cell').evaluateAll(nodes=>nodes.map(n=>n.dataset.value))).toEqual(before);
 await page.getByRole('button',{name:'Back to home'}).tap();await page.evaluate(({k,p})=>{localStorage.clear();sessionStorage.clear();localStorage.setItem(k,JSON.stringify(p));},{k:KEY,p:{...fresh(),nickname:'Crate tester',starterChosen:true,tutorialSeen:true,rockIntroSeen:true,music:false,completed:done(4),bonus:{...fresh().bonus,controlsSeen:true}}});await page.reload();await page.locator('[data-action="enterPond"]').tap();await page.keyboard.press('ArrowUp');const moves=await page.locator('[data-stat="moves"]').textContent();await open(page);await page.getByRole('button',{name:'Close leaderboard'}).tap();await expect(page.locator('[data-stat="moves"]')).toHaveText(moves);await expect(page.locator('.crate-board')).toBeVisible();
});
