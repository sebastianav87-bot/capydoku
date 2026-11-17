import{test as base,expect}from'@playwright/test';import{KEY as SAVE_KEY}from'../core.js';
// Historical mechanics suites deliberately cross the new onboarding/replay surface.
// New v6.5 specs exercise both explicitly without these convenience handlers.
export async function enterReplay(page){const sheet=page.locator('.pond-replay');if(await sheet.isVisible())await sheet.locator('[data-entry-primary]').tap()}
export const test=base.extend({page:async({page},use)=>{await page.addInitScript(k=>{try{window.__seedNonce=JSON.parse(localStorage.getItem(k)||'{}').__seed??null}catch{window.__seedNonce=null}},SAVE_KEY);await page.addLocatorHandler(page.locator('.nickname-screen'),async()=>{await page.locator('#nickname-input').fill('Test Capy');await page.locator('[data-action="saveNickname"]').tap()});await use(page)}});export{expect};

export async function tapAndEnter(page,tap){await tap();await enterReplay(page)}

// v4.3 rev b: the Home pond grid is gone. A pond opens from the hub (the current pond's
// transition screen) or, once cleared, from Settings › Progress › Replay. Historical
// suites that used to tap [data-pond=N] go through this helper instead.
export async function openPond(page,id){
  await expect(page.locator('.hub,.home,.game,.crate-screen,.chooser').first()).toBeVisible();
  // Upgrade suites first run the real OLD shipped builds, which still have the Home tiles.
  const oldTile=page.locator(`[data-pond="${id}"]`);if(await oldTile.count()){await oldTile.tap();return}
  if(await page.locator(`.pond-wrap[data-level="${id}"]`).isVisible())return;
  if(await page.locator('.game,.crate-screen').first().isVisible()){
    const back=page.locator('.game [data-action="home"],.crate-screen [data-action="bonusLeave"]').first();await back.tap();
    await expect(page.locator('.hub')).toBeVisible();
  }
  const startBtn=page.locator(`.hub [data-action="enterPond"][data-level="${id}"]`);
  if(await startBtn.isVisible()){await startBtn.tap();return}
  await page.locator('.hub [data-action="settings"]').first().tap();
  await page.locator('[data-action="progress"]').tap();
  const row=page.locator(`.replay-btn[data-level="${id}"]`);
  await row.scrollIntoViewIfNeeded();await row.tap();
}
// v4.3 rev b: the solved-screen Replay chip is gone; replay lives only in Settings › Progress.
export async function replayFromProgress(page,id){
  const back=page.locator('.game [data-action="home"],.crate-screen [data-action="bonusLeave"],.bonus-reward [data-action="home"]').first();
  if(await back.isVisible())await back.tap();
  await expect(page.locator('.hub')).toBeVisible();
  await page.locator('.hub [data-action="settings"]').first().tap();
  await page.locator('[data-action="progress"]').tap();
  const row=page.locator(`.replay-btn[data-level="${id}"]`);await row.scrollIntoViewIfNeeded();await row.tap();
}

// Seeding a save while a resumed game page is (or just was) open races with that page's own unload/interval save
// (it can land after the seed, even from the previous document). Tag the seed with a nonce, freeze further writes in
// this document, reload, and confirm the new document saw the seed before the app ran; rewrite and retry if not.
const nonceReady=new WeakSet();
export async function settleSeed(page){
  // pages from an extra browser context have no fixture init script; install it once
  if(!nonceReady.has(page)&&await page.evaluate(()=>!('__seedNonce' in window))){nonceReady.add(page);await page.addInitScript(k=>{try{window.__seedNonce=JSON.parse(localStorage.getItem(k)||'{}').__seed??null}catch{window.__seedNonce=null}},SAVE_KEY)}
  const nonce=Math.random().toString(36).slice(2);
  const raw=await page.evaluate(k=>localStorage.getItem(k),SAVE_KEY);
  for(let i=0;i<4;i++){
    await page.evaluate(({k,raw,nonce})=>{const v=JSON.parse(raw);v.__seed=nonce;localStorage.setItem(k,JSON.stringify(v));Storage.prototype.setItem=function(){}},{k:SAVE_KEY,raw,nonce});
    await page.reload();
    if(await page.evaluate(()=>window.__seedNonce)===nonce)return;
  }
  throw new Error('seed did not stick');
}
// A resumed game saves on pagehide and every second; leave it through the app first so no late write from the old
// document can land on top of the next seed.
export async function leaveGame(page){
  if(page.url()==='about:blank')return;
  const back=page.locator('.game [data-action="home"]');
  if(await back.isVisible().catch(()=>false)){await back.tap({timeout:3000}).catch(()=>{});await page.locator('.hub').waitFor({timeout:3000}).catch(()=>{})}
  await page.waitForTimeout(50);
}
