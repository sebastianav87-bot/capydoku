import{enterReplay,tapAndEnter,openPond}from './legacy-ui.js';
import{test,expect}from'./legacy-ui.js';import fs from'node:fs';import{fresh,KEY,enumerate}from'../core.js';import{boardMetrics}from'../layout.js';
const data=JSON.parse(fs.readFileSync(new URL('../levels.json',import.meta.url))),config=fs.readFileSync(new URL('../config.js',import.meta.url),'utf8'),dir=(process.env.CAPYDOKU_SCREENSHOT_DIR||'reports/screenshots-v4/regression')+'/sizing';
test.describe('single-config sizing A/B comparison',()=>{
 test.use({serviceWorkers:'block'}); // isolated test-only config substitution; production has no query/storage override
 for(const mode of['A','B'])for(const[width,height]of[[412,915],[360,780]])test(`${mode}: 7/8/9 grids (v4.3 ramp) and targets at ${width}×${height}`,async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});await page.setViewportSize({width,height});
  await page.route('**/config.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:config.replace("boardSizingMode:'B'",`boardSizingMode:'${mode}'`)}));
  await page.addInitScript(({k,v})=>localStorage.setItem(k,JSON.stringify(v)),{k:KEY,v:{...fresh(),nickname:'Test Capy',starterChosen:true,tutorialSeen:true,selected:'Jun',music:false,completed:Array.from({length:30},(_,i)=>i+1),rockIntroSeen:true}});await page.goto('/');const rows=[];
  for(const id of[3,9,21]){const q=data.levels[id-1];await tapAndEnter(page,()=>openPond(page,id));await expect(page.locator('.pond-wrap')).toHaveAttribute('data-sizing-mode',mode);const board=await page.locator('.pond-wrap').boundingBox(),cells=await page.locator('.cell').evaluateAll(es=>es.map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height}))),expected=boardMetrics(q.n,width,mode);expect(Math.abs(board.width-expected.board_px)).toBeLessThan(.03);expect(cells.every(r=>r.w>=(q.n<=7?44:30)&&r.h>=(q.n<=7?44:30))).toBe(true);expect(cells.every(r=>Math.abs(r.w-expected.cell_px)<.04)).toBe(true);
   const chosen=enumerate(q)[0][0],capy=page.locator(`[data-cell="${chosen}"]`);await capy.tap();await page.waitForTimeout(65);await capy.tap();await expect(capy).toHaveAttribute('data-value','2');const mark=q.zones.findIndex((_,i)=>i!==chosen&&!q.rocks.includes(i));await page.locator(`[data-cell="${mark}"]`).tap();await page.waitForTimeout(330);await expect(page.locator(`[data-cell="${mark}"]`)).toHaveAttribute('data-value','1');
   rows.push({mode,viewport:`${width}x${height}`,level:id,n:q.n,board_px:board.width,cell_px:cells[0].w,minimum_cell_px:Math.min(...cells.map(x=>x.w)),board_screen_ratio:board.width/width});
   if(width===412){fs.mkdirSync(dir,{recursive:true});await page.locator('img').evaluateAll(es=>Promise.all(es.map(e=>e.decode().catch(()=>{}))));await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:`${dir}/${mode}-level-${id}-${q.n}x${q.n}.png`})}await page.getByRole('button',{name:'Back to home'}).tap()
  }
  if(mode==='B')expect(rows.every(r=>r.board_px===rows[0].board_px)).toBe(true);fs.writeFileSync(`reports/v4-sizing-${mode}-${width}-followup.json`,JSON.stringify(rows,null,2));expect(errors).toEqual([])
 })
});
