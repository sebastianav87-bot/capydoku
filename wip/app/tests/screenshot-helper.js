import{expect}from '@playwright/test';import fs from'node:fs';
// Native captures only. Decode local images first: a dialog may be visible one frame
// before a newly inserted image is decoded, which otherwise makes an honest capture blank.
export async function shot(page,name){await page.locator('img').evaluateAll(async es=>{await Promise.all(es.map(e=>e.decode().catch(()=>{})))});expect(await page.locator('img').evaluateAll(es=>es.every(e=>e.complete&&e.naturalWidth>0))).toBe(true);const dir=(process.env.CAPYDOKU_SCREENSHOT_DIR||'reports/screenshots-v4/regression')+(page.viewportSize().width===360?'/360x780':'');fs.mkdirSync(dir,{recursive:true});return page.screenshot({path:`${dir}/${name}.png`})}
