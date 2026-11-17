import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { fresh, KEY, solutionCells, boardSignature } from '../core.js';
import { newAttempt } from '../powers.js';
const data = JSON.parse(fs.readFileSync(new URL('../levels.json', import.meta.url)));
const published = JSON.parse(fs.readFileSync(new URL('../../../levels.json', import.meta.url)));
const crates = JSON.parse(fs.readFileSync(new URL('../crate-levels.json', import.meta.url))).levels;
const pre = JSON.parse(fs.readFileSync(new URL('../reports/precache.json', import.meta.url)));
const completed = (id) => Array.from({ length: id - 1 }, (_, i) => i + 1);
const arrows = { U: 'ArrowUp', D: 'ArrowDown', L: 'ArrowLeft', R: 'ArrowRight' };
let errors, external;
test.beforeEach(async ({ page }) => {
  errors = []; external = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => { if (!r.url().startsWith('http://127.0.0.1:8765/') && !r.url().startsWith('data:')) external.push(r.url()); });
});
test.afterEach(() => { expect(errors ?? []).toEqual([]); expect(external ?? []).toEqual([]); });
async function seed(page, id, extra = {}) {
  await page.goto('/?lb=none');
  const p = { ...fresh(), nickname: 'Test Capy', starterChosen: true, tutorialSeen: true,
    music: false, audio: false, rockIntroSeen: true, rocksReached: id > 20,
    completed: completed(id), bonus: { ...fresh().bonus, controlsSeen: true }, ...extra };
  await page.evaluate(({ key, p }) => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem(key, JSON.stringify(p)); }, { key: KEY, p });
  await page.reload();
}
async function open(page, id, extra) {
  await seed(page, id, extra);
  await page.locator('[data-action="enterPond"],.zone-grid,.crate-board').first().waitFor();
  const entry = page.locator('[data-action="enterPond"]').first();
  if (await entry.isVisible()) await entry.tap();
  await expect(page.locator(id % 5 ? `.pond-wrap[data-level="${id}"]` : '.crate-board')).toBeVisible();
}
async function fits(page) {
  await page.waitForTimeout(220);
  const result = await page.evaluate(() => {
    const bad = [];
    for (const el of document.querySelectorAll('.zone-grid,.crate-board,.thumbbar,.bonus-controls,.bonus-dpad,.crate-showme:not([hidden])')) {
      if (!el.getClientRects().length) continue;
      const r = el.getBoundingClientRect();
      if (r.top < -1 || r.bottom > innerHeight + 1 || r.left < -1 || r.right > innerWidth + 1) bad.push(`${el.className}: ${r.top}–${r.bottom}`);
      for (let parent = el.parentElement; parent; parent = parent.parentElement) {
        if (!['hidden', 'clip'].includes(getComputedStyle(parent).overflowY)) continue;
        const a = parent.getBoundingClientRect();
        if (r.top < a.top - 1 || r.bottom > a.bottom + 1) bad.push(`${el.className} clipped by ${parent.className}`);
      }
    }
    for (const button of document.querySelectorAll('.thumbbar>button')) {
      const parent = button.getBoundingClientRect();
      for (const child of button.querySelectorAll('img,strong,small,.round-icon')) {
        if (!child.getClientRects().length) continue;
        const r = child.getBoundingClientRect();
        if (r.left < parent.left - 1 || r.right > parent.right + 1 || r.top < parent.top - 1 || r.bottom > parent.bottom + 1) bad.push(`${child.className || child.tagName} overflows ${button.getAttribute('aria-label')}`);
      }
    }
    const cell = document.querySelector('.crate-cell,.zone-grid .cell')?.getBoundingClientRect().width;
    return { bad, cell, scroll: document.documentElement.scrollHeight > innerHeight + 1 };
  });
  expect(result.bad).toEqual([]); expect(result.scroll).toBe(false); expect(result.cell).toBeGreaterThanOrEqual(24);
}
for (const id of [29, 49, 89, 119, 149, 35, 60, 90, 120, 145, 150]) {
  test(`pond ${id}: board and controls fit`, async ({ page }, info) => {
    await open(page, id);
    await fits(page);
    if (id % 5 === 0) {
      const sol = crates.find((c) => c.pond === id).solution;
      for (let k = 0; k < 3; k++) {
        await page.keyboard.press(arrows[sol[0]]);
        await page.locator('.bonus-controls [data-action="bonusRestart"]').tap();
      }
      await expect(page.locator('.crate-showme')).toBeVisible();
      await fits(page);
    }
    if ([149, 145, 150].includes(id)) await page.screenshot({ path: `reports/v5.0/screens/${info.project.name}-pond-${id}.png` });
  });
}
test('v4.3.1 completed save continues at 31; lilies, daily and unscored history survive', async ({ page }) => {
  const lilies = Object.fromEntries(completed(31).map((id) => [id, { cleared: true, noMistakes: true, underTarget: true }]));
  const daily = { lastDay: 20400, streak: 4 };
  await seed(page, 31, { version: 3, layout: 2, lilies, goldenLilies: [9, 19, 29], daily, scores: undefined });
  await expect(page.locator('.transition-card[data-level="31"]')).toBeVisible();
  const p = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
  expect(p.lilies).toMatchObject(lilies); expect(p.daily).toEqual(daily); expect(p.goldenLilies).toEqual([9, 19, 29]);
  await page.locator('[data-action="settings"]').tap();
  await page.locator('[data-action="progress"]').tap();
  await expect(page.locator('.collection-total')).toContainText('90/450');
  await page.locator('.replay-world[data-world="1"] summary').tap();
  await expect(page.locator('.unscored')).toHaveCount(30);
  await expect(page.locator('.world-score')).toContainText('0/30 scored');
});
test('published half-played pond 29 resumes with its locked capy and oranges', async ({ page }) => {
  const q = published.levels[28], attempt = newAttempt(q.n), capy = solutionCells(q)[0];
  attempt.cells[capy] = 2; attempt.lives = 2;
  await open(page, 29, { sessions: { 'pond-29': { ...attempt, signature: boardSignature(q) } } });
  await expect(page.locator(`[data-cell="${capy}"]`)).toHaveAttribute('data-value', '2');
  await expect(page.locator('.lives')).toHaveAttribute('data-lives', '2');
});
test('tools, explanations, locks, undo, rules and direct Next pond', async ({ page }) => {
  await open(page, 2);
  const q = data.levels[1], sol = solutionCells(q), wrong = Array.from({ length: q.n * q.n }, (_, i) => i).find((i) => !sol.includes(i));
  await page.getByRole('button', { name: 'Capy tool', exact: true }).tap();
  await page.locator(`[data-cell="${wrong}"]`).tap();
  await expect(page.locator('.move-note')).toContainText("Doesn't fit the solution");
  await expect(page.locator('.lives')).toHaveAttribute('data-lives', '2');
  await expect(page.locator(`[data-cell="${wrong}"]`)).toHaveAttribute('data-value', '0');
  await page.locator(`[data-cell="${sol[0]}"]`).tap();
  await expect(page.locator(`[data-cell="${sol[0]}"]`)).toHaveClass(/capy-locked/);
  const conflict = Array.from({ length: q.n }, (_, i) => Math.floor(sol[0] / q.n) * q.n + i).find((i) => i !== sol[0]);
  await page.locator(`[data-cell="${conflict}"]`).tap();
  await expect(page.locator('.move-note')).toContainText('Breaks a rule');
  await expect(page.locator('.lives')).toHaveAttribute('data-lives', '1');
  await page.getByRole('button', { name: '× tool', exact: true }).tap();
  await page.locator(`[data-cell="${wrong}"]`).tap();
  await expect(page.locator(`[data-cell="${wrong}"]`)).toHaveAttribute('data-value', '1');
  await page.getByRole('button', { name: 'Undo', exact: true }).tap();
  await expect(page.locator(`[data-cell="${wrong}"]`)).toHaveAttribute('data-value', '0');
  await expect(page.locator(`[data-cell="${sol[0]}"]`)).toHaveAttribute('data-value', '2');
  await page.getByRole('button', { name: 'Rules', exact: true }).tap();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Close rules', exact: true }).tap();
  await page.getByRole('button', { name: 'Capy tool', exact: true }).tap();
  for (const i of sol.slice(1)) await page.locator(`[data-cell="${i}"]`).tap();
  await expect(page.locator('.pond-score')).toBeVisible();
  await page.locator('[data-action="next"]').tap();
  await expect(page.locator('.pond-wrap[data-level="3"]')).toBeVisible();
  await expect(page.locator('.transition-card')).toHaveCount(0);
});
for (const id of [60, 150]) test(`crate ${id}: solve, score, local world top and continue`, async ({ page }) => {
  await open(page, id);
  const c = crates.find((c) => c.pond === id);
  for (const ch of c.solution) await page.keyboard.press(arrows[ch]);
  await expect(page.locator('.pond-score')).toBeVisible();
  const p = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
  expect(p.completed).toContain(id); expect(p.scores[id].best).toBeGreaterThan(0);
  expect(p.bonus.spare).toEqual(id === 150 ? null : { forPond: 61 });
  await page.locator('[data-action="bonusContinue"]').tap();
  await expect(page.locator('[data-world-top]')).toHaveAttribute('data-world-top', String(id / 30));
  await expect(page.locator('.top10-local')).toContainText('Local only');
  await page.locator('[data-action="worldContinue"]').tap();
  await expect(page.locator(id === 150 ? '.hub' : '.transition-card[data-level="61"]')).toBeVisible();
});
test('v5.0 cache contains every runtime dependency and reloads offline', async ({ page, context }) => {
  await seed(page, 149);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const cached = await page.evaluate(async (cache) => {
    const c = await caches.open(cache); return (await c.keys()).map((r) => new URL(r.url).pathname.slice(1));
  }, pre.cache);
  for (const u of pre.urls) expect(cached).toContain(u === './' ? '' : u);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.transition-card[data-level="149"]')).toBeVisible();
  await page.locator('[data-action="enterPond"]').tap();
  await expect(page.locator('.pond-wrap[data-level="149"]')).toBeVisible();
  await expect(page).toHaveTitle('Capybara Calm · cozy pond puzzles');
  await fits(page);
});
for (const id of [145, 150]) test(`crate ${id}: D-pad and Show me fit and move`, async ({ page }, info) => {
  await open(page, id, { bonus: { ...fresh().bonus, dpad: true, controlsSeen: true } });
  const first = { U: 'up', D: 'down', L: 'left', R: 'right' }[crates.find((c) => c.pond === id).solution[0]];
  for (let k = 0; k < 3; k++) {
    await page.getByRole('button', { name: `Step ${first}`, exact: true }).tap();
    await expect(page.locator('[data-stat="moves"]')).toHaveText('1');
    await page.locator('.bonus-controls [data-action="bonusRestart"]').tap();
  }
  await expect(page.locator('.crate-showme')).toBeVisible();
  await fits(page);
  await page.screenshot({ path: `reports/v5.0/screens/${info.project.name}-pond-${id}-dpad.png` });
});
test('classic touch double-tap and keyboard activation each apply once', async ({ page }) => {
  await open(page, 1);
  const q = data.levels[0], sol = solutionCells(q), cell = page.locator(`[data-cell="${sol[0]}"]`);
  await cell.tap();
  await page.waitForTimeout(80);
  await cell.tap();
  await expect(cell).toHaveAttribute('data-value', '2');
  await expect(page.locator('.cell[data-value="2"]')).toHaveCount(1);
  await expect(page.locator('.lives')).toHaveAttribute('data-lives', '3');
  const wrong = Array.from({ length: q.n * q.n }, (_, i) => i).find((i) => !sol.includes(i));
  await page.locator(`[data-cell="${wrong}"]`).tap();
  await expect(page.locator(`[data-cell="${wrong}"]`)).toHaveAttribute('data-value', '1');
  await page.getByRole('button', { name: 'Rules', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'How to play' })).toBeVisible();
  await page.getByRole('button', { name: 'Close rules', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.lives')).toHaveAttribute('data-lives', '3');
});
