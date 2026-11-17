// v4.3 build E2E: crate ponds in the main path (5/10/15/20/25/30), crate lilies, Show me, Par orange, gate + finale,
// Home/transition, the 10×10 boss 29 fit, and the one-time save migration. Runs at 412×915 and 360×780 (touch).
import{ test, expect, enterReplay, openPond,settleSeed,leaveGame}from"./legacy-ui.js";
import fs from "node:fs";
import { fresh, KEY, solutionCells, boardSignature, violations, HAPTICS } from "../core.js";
import { newAttempt } from "../powers.js";
import { parseLevel, newCrateState, stepCrate } from "../crates.js";
import { shot } from "./screenshot-helper.js";
import { boardMetrics } from "../layout.js";
const data = JSON.parse(fs.readFileSync("levels.json")), crates = Object.fromEntries(JSON.parse(fs.readFileSync("crate-levels.json")).levels.map((l) => [l.pond, l]));
let errors;
test.beforeEach(async ({ page }) => {
  errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.addInitScript(() => { window.__buzz = []; Object.defineProperty(navigator, "vibrate", { configurable: true, value: (p) => (window.__buzz.push(structuredClone(p)), true) }); });
});
test.afterEach(() => expect(errors).toEqual([]));
const upto = (id) => Array.from({ length: id - 1 }, (_, i) => i + 1);
const nearlySolved = (q) => { const s = { ...newAttempt(q.n), signature: boardSignature(q) }, sol = solutionCells(q); sol.slice(0, -1).forEach((i) => (s.cells[i] = 2)); return s; };
const stored = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
const buzz = (page) => page.evaluate(() => window.__buzz);
const noScroll = (page) => page.evaluate(() => { const s = document.querySelector(".screen"); return s.scrollHeight <= s.clientHeight + 1 && document.documentElement.scrollHeight <= innerHeight + 1; });
const KEYS = { U: "ArrowUp", D: "ArrowDown", L: "ArrowLeft", R: "ArrowRight" }, DIR = { U: "up", D: "down", L: "left", R: "right" };
// A step from the start that walks (never pushes) and can be walked straight back: [step, back] as U/D/L/R.
const OPP = { U: "D", D: "U", L: "R", R: "L" };
function wiggle(lv) { const L = parseLevel(lv), s = newCrateState(L); for (const k of "LRUD") { const a = stepCrate(L, s, DIR[k]); if (a.moved && !a.pushed && stepCrate(L, a.state, DIR[OPP[k]]).moved) return [k, OPP[k]]; } throw Error("no wiggle"); }
const boardInView = (page) => page.evaluate(() => { const b = document.querySelector(".crate-board").getBoundingClientRect(); return b.left >= 0 && b.right <= innerWidth && b.bottom <= innerHeight; });
const stat = (page, k) => page.locator(`[data-stat="${k}"]`);
const earned = (page) => page.evaluate(() => [...document.querySelectorAll(".crate-reward-lilies .lily-condition")].map((e) => e.dataset.earned === "true"));
async function seed(page, extra = {}) {
  await leaveGame(page);await page.goto("/");
  await page.evaluate(({ k, p }) => localStorage.setItem(k, JSON.stringify(p)), { k: KEY, p: { ...fresh(), nickname: "Seba 🌿", starterChosen: true, tutorialSeen: true, rockIntroSeen: true, music: false, completed: [], ...extra } });
  await settleSeed(page);
  await expect(page.locator(".hub,.game,.crate-screen").first()).toBeVisible();
}
async function double(page, i) { const r = await page.locator(`[data-cell="${i}"]`).boundingBox(); await page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); await page.waitForTimeout(65); await page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); }
async function clearPond(page, id, extra = {}) {
  const q = data.levels[id - 1];
  await seed(page, { completed: upto(id), sessions: { [`pond-${id}`]: nearlySolved(q) }, ...extra });
  await openPond(page,id);
  await enterReplay(page);
  await double(page, solutionCells(q).at(-1));
  await expect(page.locator(".banner")).toBeVisible();
  await page.getByRole("button", { name: "Next pond →" }).tap();
  await expect(page.locator(".transition-card")).toBeVisible();
}
// Open crate pond `id` from the hub (Start crate pond N), dismissing the first-time controls card.
async function openCrate(page, id, extra = {}, { dismiss = true } = {}) {
  await seed(page, { completed: upto(id), ...extra, bonus: { v: 2, best: {}, legacy: null, spare: null, dpad: false, controlsSeen: dismiss, ...(extra.bonus || {}) } });
  await openPond(page,id); // rev b: the hub's "Start crate pond N" enters the board directly
  await expect(page.locator(".crate-board")).toBeVisible();
}
async function play(page, moves) { for (const ch of moves) await page.keyboard.press(KEYS[ch]); }
async function swipe(page, dir) {
  const c = await page.context().newCDPSession(page), b = await page.locator(".crate-board").boundingBox();
  const p = { x: b.x + b.width / 2, y: b.y + b.height / 2 }, d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
  await c.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...p, id: 1 }] });
  for (const f of [0.3, 0.7, 1]) await c.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: p.x + d[0] * 60 * f, y: p.y + d[1] * 60 * f, id: 1 }] });
  await c.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await c.detach();
  await page.waitForTimeout(40);
}

test("Hub (rev b): opens on the crate pond 5 transition; Settings › Progress lists crate, gate and boss roles; Start enters the crate pond", async ({ page }) => {
  await seed(page, { completed: upto(5) });
  const card = page.locator(".hub .transition-card");
  await expect(card).toHaveAttribute("data-role", "crate");
  await expect(card.locator("h1")).toHaveText("Crate Pond 5");
  await expect(card.locator(".transition-kicker")).toHaveText("Crate pond");
  await expect(card.locator(".transition-world")).toContainText("par 40");
  await expect(page.locator(".map-lily-total")).toContainText("/90");
  await expect(page.locator("[data-pond], .pond-tile, .continue-card")).toHaveCount(0);
  await shot(page, "home-crate-next");
  await page.getByRole("button", { name: "Start crate pond 5" }).tap();
  await expect(page.locator(".bonus-title h2")).toHaveText("Crate Pond 5");
  await seed(page, { completed: upto(21), goldenLilies: [9, 19] });
  await page.getByRole("button", { name: "Settings", exact: true }).tap();
  await page.getByRole("button", { name: /Your pond collection/ }).tap();
  for (const id of [5, 10, 15, 20]) await expect(page.locator(`.replay-row[data-row="${id}"] small`)).toContainText("crates");
  await expect(page.locator('.replay-row[data-row="9"] strong')).toHaveText("Boss Pond 9");
  await expect(page.locator('.replay-row[data-row="10"] strong')).toHaveText("Gate Crate Pond 10");
  await expect(page.locator('.replay-row[data-row="19"] .ledger-gold')).toHaveCount(1);
  await page.locator('.replay-row[data-row="10"]').scrollIntoViewIfNeeded();
  await shot(page, "home-pond-list-roles");
});
test("pond 4 → transition to Crate Pond 5: no bonus offer, crate thumbnail, Packed/Clean run/Par lilies, Start crate pond", async ({ page }) => {
  await clearPond(page, 4);
  const card = page.locator(".transition-card");
  await expect(card.locator("h1")).toHaveText("Crate Pond 5");
  await expect(card.locator(".transition-kicker")).toHaveText("Crate pond");
  await expect(page.locator(".bonus-offer, .bonus-skip")).toHaveCount(0);
  await expect(card.locator(".bonus-thumb i")).toHaveCount(crates[5].n ** 2);
  await expect(card.locator(".lily-condition")).toHaveCount(3);
  await expect(card.locator(".lily-condition strong")).toHaveText(["Packed", "Clean run", `Par · ${crates[5].par} moves`]);
  await expect(card).toContainText("Make par for +1 orange on the next pond.");
  await expect(page.locator("[data-entry-primary]")).toHaveText("Start crate pond 5");
  expect(await noScroll(page)).toBe(true);
  await shot(page, "transition-crate-5");
  await page.locator("[data-entry-primary]").tap();
  await expect(page.locator(".bonus-title h2")).toHaveText("Crate Pond 5");
  await expect(page.locator(".bonus-title .bonus-tag")).toHaveText("Crate pond");
  await expect(page.locator(".crate-screen")).not.toContainText("Optional");
  await expect(page.locator(".crate-screen")).not.toContainText("not part of 100%");
});
test("first entry 'Move your way'; swipe, tap-walk, free undo, restart; Leave → Home with nothing awarded", async ({ page }) => {
  await openCrate(page, 5, {}, { dismiss: false });
  await expect(page.locator(".bonus-controls-dialog")).toBeVisible();
  await page.getByRole("button", { name: "Got it", exact: true }).tap();
  expect((await stored(page)).bonus.controlsSeen).toBe(true);
  await expect(page.locator(".crate-cell")).toHaveCount(49);
  expect(await boardInView(page)).toBe(true);
  await expect(page.locator(".crate-sprite")).toHaveCount(3);
  await expect(page.locator(".bonus-leave-card")).toContainText(`Par ${crates[5].par}`);
  await expect(page.locator(".bonus-leave-card")).toContainText("Par → +1 orange for Pond 6");
  expect(await noScroll(page)).toBe(true);
  await shot(page, "crate-5-start");
  const [w1, w2] = wiggle(crates[5]);
  await swipe(page, DIR[w1]);
  await expect(stat(page, "moves")).toHaveText("1");
  await page.getByRole("button", { name: "Undo", exact: true }).tap();
  await expect(stat(page, "moves")).toHaveText("0");
  await swipe(page, DIR[w1]);
  await swipe(page, DIR[w2]);
  await expect(stat(page, "moves")).toHaveText("2");
  await page.getByRole("button", { name: "Restart", exact: true }).tap();
  await expect(stat(page, "moves")).toHaveText("0");
  await expect(page.locator(".crate-showme")).toBeHidden();
  await page.getByRole("button", { name: "Leave crate pond" }).tap();
  await expect(page.locator(".hub")).toBeVisible();
  const p = await stored(page);
  expect(p.completed).not.toContain(5);
  expect(p.lilies[5]).toBeUndefined();
  expect(p.bonus.spare).toBe(null);
});
test("clean run at par: all 3 lilies, push/landing haptics, +1 orange for Pond 6 → transition shows it → it absorbs one mistake", async ({ page }) => {
  await openCrate(page, 5, { completed: upto(5) });
  const lv = crates[5], before = (await buzz(page)).length;
  for (const ch of lv.solution) await swipe(page, DIR[ch]);
  await expect(page.locator(".crate-sprite.packed")).toHaveCount(3);
  await page.waitForTimeout(250);
  await shot(page, "crate-5-packed");
  const b = (await buzz(page)).slice(before);
  expect(b.filter((x) => JSON.stringify(x) === JSON.stringify(HAPTICS.crateLand)).length).toBe(3);
  expect(b.filter((x) => JSON.stringify(x) === JSON.stringify(HAPTICS.solve)).length).toBe(1);
  await expect(page.locator(".bonus-reward h1")).toHaveText("Fruit packed!");
  expect(await earned(page)).toEqual([true, true, true]);
  await expect(page.locator(".crate-reward-lilies .lily-condition small")).toHaveText(["Collected", "Collected", "Collected"]);
  await expect(page.locator(".reward-orange")).toContainText("+1 orange");
  await expect(page.locator(".reward-orange")).toContainText("for Pond 6");
  await expect(page.locator(".bonus-reward")).toContainText(`${lv.optimalMoves} moves · par ${lv.par}`);
  await expect(page.locator(".bonus-reward")).not.toContainText("not part of 100%");
  expect(await noScroll(page)).toBe(true);
  await shot(page, "crate-5-reward-3-lilies");
  let p = await stored(page);
  expect(p.lilies[5]).toMatchObject({ cleared: true, noMistakes: true, underTarget: true });
  expect(p.completed).toContain(5);
  expect(p.bonus.best[5]).toBe(lv.optimalMoves);
  expect(p.bonus.spare).toEqual({ forPond: 6 });
  await page.getByRole("button", { name: "Continue → Pond 6" }).tap();
  await expect(page.locator(".transition-card h1")).toHaveText("Pond 6");
  await expect(page.locator(".transition-spare")).toContainText("Spare orange ready");
  await shot(page, "transition-pond-6-spare");
  await page.locator("[data-entry-primary]").tap();
  await expect(page.locator(".lives .orange.spare")).toHaveCount(1);
  const q = data.levels[5], sol = solutionCells(q);
  await double(page, sol[0]);
  const near = [...Array(q.n * q.n).keys()].find((i) => !sol.includes(i) && violations(q, sol.slice(0, 1).reduce((c, s) => ((c[s] = 2), c), Array(q.n * q.n).fill(0)).map((v, k) => (k === i ? 2 : v))).has(i));
  await double(page, near);
  await expect(page.locator(".toast")).toContainText("Spare orange used");
  await expect(page.locator(".lives")).toHaveAttribute("data-lives", "3");
  p = await stored(page);
  expect(p.bonus.spare).toBe(null);
});
test("Undo costs the Clean run lily (Par + orange kept); over par keeps Clean run but no Par and no orange", async ({ page }) => {
  const lv = crates[5];
  await openCrate(page, 5);
  const [w1, w2] = wiggle(lv), extra = Math.ceil((lv.par - lv.optimalMoves + 1) / 2);
  await play(page, w1);
  await page.getByRole("button", { name: "Undo", exact: true }).tap();
  await play(page, lv.solution);
  await expect(page.locator(".bonus-reward h1")).toHaveText("Fruit packed!");
  expect(await earned(page)).toEqual([true, false, true]);
  await expect(page.locator(".reward-orange")).toHaveCount(1);
  await shot(page, "crate-5-reward-undo-no-clean");
  await openCrate(page, 5);
  await play(page, (w1 + w2).repeat(extra)); // wasted steps push the total just over par
  await play(page, lv.solution);
  await expect(page.locator(".bonus-reward h1")).toHaveText("Fruit packed!");
  expect(await earned(page)).toEqual([true, true, false]);
  await expect(page.locator(".reward-orange")).toHaveCount(0);
  await expect(page.locator(".bonus-reward")).toContainText(`${lv.optimalMoves + 2 * extra} moves · par ${lv.par}`);
  const p = await stored(page);
  expect(p.bonus.spare).toBe(null);
  expect(p.lilies[5]).toMatchObject({ cleared: true, noMistakes: true, underTarget: false });
  await shot(page, "crate-5-reward-over-par");
});
test("Show me appears only after 3 Restarts, replays the stored solution, gives the Packed lily only (no orange, no best)", async ({ page }) => {
  await openCrate(page, 15, { lilies: {} });
  const lv = crates[15];
  for (let k = 1; k <= 3; k++) {
    await play(page, lv.solution.slice(0, 2));
    await page.getByRole("button", { name: "Restart", exact: true }).tap();
    if (k < 3) await expect(page.locator(".crate-showme")).toBeHidden();
  }
  await expect(page.locator(".crate-showme")).toBeVisible();
  await expect(page.locator(".crate-showme")).toContainText("gives the Packed lily only");
  expect(await noScroll(page)).toBe(true);
  await shot(page, "crate-15-show-me-offered");
  await page.getByRole("button", { name: "Show me", exact: true }).tap();
  await expect(page.locator(".crate-screen")).toHaveClass(/replaying/);
  await page.keyboard.press("ArrowLeft"); // input is ignored while the solution plays
  await page.waitForTimeout(170 * 12);
  await shot(page, "crate-15-show-me-replaying");
  await expect(page.locator(".bonus-reward h1")).toHaveText("Fruit packed!", { timeout: 20000 });
  await expect(page.locator(".bonus-reward")).toContainText("Solution shown");
  expect(await earned(page)).toEqual([true, false, false]);
  await expect(page.locator(".reward-orange")).toHaveCount(0);
  await expect(page.locator(".crate-reward-lilies")).toContainText("Solve it yourself for this lily");
  await shot(page, "crate-15-show-me-reward");
  const p = await stored(page);
  expect(p.lilies[15]).toMatchObject({ cleared: true, noMistakes: false, underTarget: false });
  expect(p.completed).toContain(15);
  expect(p.bonus.best[15]).toBeUndefined();
  expect(p.bonus.spare).toBe(null);
  await page.getByRole("button", { name: "Continue → Pond 16" }).tap();
  await expect(page.locator(".transition-card h1")).toHaveText("Pond 16");
});
test("gate pond 10 (after boss 9): World gate transition, 'World gate open!', the Hot Spring grows, then the breather Pond 11", async ({ page }) => {
  await clearPond(page, 9);
  await expect(page.locator(".transition-card h1")).toHaveText("Gate Crate Pond 10");
  await expect(page.locator(".transition-kicker")).toHaveText("World gate");
  await expect(page.locator(".transition-card")).toContainText("Pack the fruit to open the next world");
  expect(await noScroll(page)).toBe(true);
  await shot(page, "transition-gate-10");
  await page.locator("[data-entry-primary]").tap();
  if (await page.locator(".bonus-controls-sheet").count()) await page.getByRole("button", { name: "Got it", exact: true }).tap();
  await expect(page.locator(".bonus-title .bonus-tag")).toHaveText("World gate");
  await play(page, crates[10].solution);
  await expect(page.locator(".bonus-reward h1")).toHaveText("World gate open!");
  await expect(page.locator(".bonus-reward")).toContainText("Your Hot Spring grew");
  await shot(page, "crate-10-gate-reward");
  await page.getByRole("button", { name: "Continue → Pond 11" }).tap();
  await expect(page.locator(".transition-kicker")).toHaveText("New world");
  await expect(page.locator(".transition-card h1")).toHaveText("Pond 11");
  await page.locator('.hub [data-action="collection"]').tap();
  await expect(page.locator(".crew-pool")).toHaveAttribute("data-tier", "2");
  await expect(page.locator(".collection-title p")).toHaveText("Open a world gate to grow your spring");
});
test("finale pond 30: no orange, 'The Hot Spring is complete!', Finish → All 30 ponds ✓", async ({ page }) => {
  const lilies = Object.fromEntries(upto(30).map((id) => [id, { cleared: true, noMistakes: true, underTarget: true }]));
  await openCrate(page, 30, { lilies, goldenLilies: [9, 19, 29] });
  await expect(page.locator(".bonus-title h2")).toHaveText("Finale Crate Pond 30");
  await expect(page.locator(".bonus-leave-card")).toContainText("The finale");
  await expect(page.locator(".crate-cell")).toHaveCount(64);
  expect(await noScroll(page)).toBe(true);
  expect(await boardInView(page)).toBe(true);
  await shot(page, "crate-30-finale-start");
  await play(page, crates[30].solution);
  await expect(page.locator(".bonus-reward h1")).toHaveText("The Hot Spring is complete!");
  await expect(page.locator(".reward-orange")).toHaveCount(0);
  expect(await noScroll(page)).toBe(true);
  await shot(page, "crate-30-finale-reward");
  const p = await stored(page);
  expect(p.completed.length).toBe(30);
  expect(p.bonus.spare).toBe(null);
  await page.getByRole("button", { name: "Finish", exact: true }).tap();
  await expect(page.locator(".all-clear h1")).toHaveText("All 30 ponds ✓");
  await expect(page.locator(".all-clear")).toContainText("90/90 lilies · 3/3 golden");
  await shot(page, "all-clear-90");
});
for (const id of [20, 25])
  test(`crate pond ${id} (${crates[id].n}×${crates[id].n}) is solvable with its stored solution${id === 25 ? " on the D-pad" : ""}, without scrolling`, async ({ page }) => {
    await openCrate(page, id, { bonus: { dpad: id === 25 } });
    await expect(page.locator(".crate-cell")).toHaveCount(crates[id].n ** 2);
    expect(await noScroll(page)).toBe(true);
    expect(await boardInView(page)).toBe(true);
    await shot(page, `crate-${id}-start`);
    for (const ch of crates[id].solution) {
      if (id === 25) await page.locator(`[data-action="bonusDir"][data-dir="${DIR[ch]}"]`).tap();
      else await page.keyboard.press(KEYS[ch]);
    }
    await expect(page.locator(".crate-sprite.packed")).toHaveCount(3);
    await expect(page.locator(".bonus-reward h1")).toHaveText(id === 20 ? "World gate open!" : "Fruit packed!");
    expect(await earned(page)).toEqual([true, true, true]);
  });
test("Settings: 'Crate ponds · D-pad' persists; the D-pad steps", async ({ page }) => {
  await seed(page, { completed: upto(5) });
  await page.getByRole("button", { name: "Settings", exact: true }).tap();
  const t = page.getByRole("button", { name: "Crate ponds D-pad" });
  await expect(t).toHaveText("Off");
  await t.tap();
  await expect(page.getByRole("button", { name: "Crate ponds D-pad" })).toHaveText("On");
  await expect(page.locator(".build-label")).toContainText("v4.3.1 · build");
  await shot(page, "settings-v43");
  expect((await stored(page)).bonus.dpad).toBe(true);
  await page.getByRole("button", { name: "Done", exact: true }).tap();
  await page.locator('.hub [data-action="enterPond"]').tap();
  if (await page.locator(".bonus-controls-sheet").count()) await page.getByRole("button", { name: "Got it", exact: true }).tap();
  await page.getByRole("button", { name: "Step left" }).tap();
  await expect(stat(page, "moves")).toHaveText("1");
});
test("boss 29 (10×10, 2 rocks) fits with no scroll and every corner cell is tappable; cell size recorded", async ({ page }) => {
  const q = data.levels[28];
  await seed(page, { completed: upto(29) });
  await page.locator('.hub [data-action="enterPond"]').tap();
  await enterReplay(page);
  await expect(page.locator(".topbar h2")).toHaveText("Boss Pond 29");
  await expect(page.locator("[data-cell]")).toHaveCount(100);
  const m = await page.evaluate(() => { const cs = [...document.querySelectorAll("[data-cell]")].map((e) => e.getBoundingClientRect()); return { w: innerWidth, h: innerHeight, cell: cs[0].width, cellH: cs[0].height, minX: Math.min(...cs.map((r) => r.left)), maxX: Math.max(...cs.map((r) => r.right)), maxY: Math.max(...cs.map((r) => r.bottom)), gap: cs[1].left - cs[0].right }; });
  expect(m.minX).toBeGreaterThanOrEqual(0);
  expect(m.maxX).toBeLessThanOrEqual(m.w);
  expect(m.maxY).toBeLessThanOrEqual(m.h);
  expect(m.cell).toBeGreaterThanOrEqual(33); // Designer check: ≥33 px at 360 and 412
  const wrap = await page.locator(".pond-wrap").boundingBox();
  expect(wrap.x).toBeGreaterThanOrEqual(1);
  expect(wrap.x + wrap.width).toBeLessThanOrEqual(m.w - 1);
  expect(Math.abs(m.cell - boardMetrics(10, m.w).cell_px)).toBeLessThan(0.05);
  expect(await noScroll(page)).toBe(true);
  for (const i of [0, 9, 90, 99, 45]) {
    if (q.rocks.includes(i)) continue;
    const r = await page.locator(`[data-cell="${i}"]`).boundingBox();
    await page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2);
    await page.waitForTimeout(400);
    await expect(page.locator(`[data-cell="${i}"]`)).toHaveAttribute("data-value", "1");
  }
  await shot(page, "boss-29-10x10");
  fs.mkdirSync("reports/v4.3", { recursive: true });
  fs.writeFileSync(`reports/v4.3/boss29-fit-${m.w}.json`, JSON.stringify({ viewport: `${m.w}x${m.h}`, n: 10, rocks: q.rocks, cellPx: +m.cell.toFixed(2), cellPxH: +m.cellH.toFixed(2), gapPx: +m.gap.toFixed(2), boardRight: m.maxX, boardBottom: m.maxY, noScroll: true, cornerTaps: "ok" }, null, 2));
});
test("each size on the path renders without scrolling: ponds 1 (7×7), 6 (8×8), 14 (9×9), 21 (9×9 + rock)", async ({ page }) => {
  for (const id of [1, 6, 14, 21]) {
    await seed(page, { completed: upto(id) });
    await page.locator('.hub [data-action="enterPond"]').tap();
    await enterReplay(page);
    await expect(page.locator("[data-cell]")).toHaveCount(data.levels[id - 1].n ** 2);
    expect(await noScroll(page)).toBe(true);
    await shot(page, `pond-${id}-${data.levels[id - 1].n}x${data.levels[id - 1].n}`);
  }
});
test("save migration (v4.2.1 save): 'Ponds refreshed' once, goldens on bosses 9/19, Crate Cove 3 clears gate 10, no lily lost", async ({ page }) => {
  const lilies = Object.fromEntries(upto(23).map((id) => [id, { cleared: true, noMistakes: id % 2 === 0, underTarget: id % 3 === 0 }]));
  const raw = { ...fresh(), nickname: "Seba 🌿", starterChosen: true, tutorialSeen: true, rockIntroSeen: true, music: false, completed: upto(23), lilies, goldenLilies: [10, 20], bonus: { v: 1, solved: [2], best: { 2: 34 }, spare: { forPond: 16 }, dpad: false, controlsSeen: true }, sessions: { "pond-12": { cells: Array(49).fill(0).map((_, i) => (i === 3 ? 2 : 0)), lives: 2, signature: "7|old|" } } };
  delete raw.layout;
  await page.goto("/");
  await page.evaluate(({ k, p }) => localStorage.setItem(k, JSON.stringify(p)), { k: KEY, p: raw });
  await page.reload();
  await expect(page.locator(".toast")).toContainText("Ponds refreshed");
  await shot(page, "migration-ponds-refreshed");
  const p = await stored(page);
  expect(p.layout).toBe(2);
  expect(p.goldenLilies.sort((a, b) => a - b)).toEqual([9, 19]);
  expect(p.sessions["pond-12"]).toBeUndefined();
  expect(p.lilies[10]).toMatchObject({ cleared: true, underTarget: true });
  expect(p.bonus.best[10]).toBe(34);
  for (const [id, r] of Object.entries(lilies)) expect(p.lilies[id]).toMatchObject(Object.fromEntries(Object.entries(r).filter(([, v]) => v)));
  await page.getByRole("button", { name: "Settings", exact: true }).tap();
  await page.getByRole("button", { name: /Your pond collection/ }).tap();
  await expect(page.locator('.replay-row[data-row="9"] .ledger-gold')).toHaveCount(1);
  await expect(page.locator('.replay-row[data-row="19"] .ledger-gold')).toHaveCount(1);
  await expect(page.locator('.replay-row[data-row="10"]')).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".hub")).toBeVisible();
  await page.waitForTimeout(600);
  await expect(page.locator(".toast", { hasText: "Ponds refreshed" })).toHaveCount(0);
  expect(await stored(page)).toEqual(p);
});
