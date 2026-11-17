// v4.2 crate bonus E2E (412×915 and 360×780 projects, touch, mocked navigator.vibrate).
import { test, expect, enterReplay, openPond } from "./legacy-ui.js";
import fs from "node:fs";
import { fresh, KEY, solutionCells, boardSignature, violations, HAPTICS } from "../core.js";
import { newAttempt } from "../powers.js";
import { shot } from "./screenshot-helper.js";
const data = JSON.parse(fs.readFileSync("levels.json")), crates = JSON.parse(fs.readFileSync("crate-levels.json")).levels;
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
async function seed(page, extra = {}) {
  await page.goto("/");
  await page.evaluate(({ k, p }) => localStorage.setItem(k, JSON.stringify(p)), { k: KEY, p: { ...fresh(), nickname: "Seba 🌿", starterChosen: true, tutorialSeen: true, rockIntroSeen: true, music: false, completed: [], ...extra } });
  await page.reload();
  await expect(page.locator(".hub")).toBeVisible();
}
async function point(page, sel) { const r = await page.locator(sel).boundingBox(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }
async function double(page, i) { const r = await point(page, `[data-cell="${i}"]`); await page.touchscreen.tap(r.x, r.y); await page.waitForTimeout(65); await page.touchscreen.tap(r.x, r.y); }
// Solve pond `id` from a nearly-solved save and arrive on its "Next pond" transition screen.
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
async function enterBonus(page, { dismiss = true } = {}) {
  await page.getByRole("button", { name: "Play bonus" }).tap();
  await expect(page.locator(".crate-board")).toBeVisible();
  if (dismiss && (await page.locator(".bonus-controls-sheet").count())) await page.getByRole("button", { name: "Got it", exact: true }).tap();
}
async function swipe(page, dir) {
  const c = await page.context().newCDPSession(page), b = await page.locator(".crate-board").boundingBox();
  const p = { x: b.x + b.width / 2, y: b.y + b.height / 2 }, d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
  await c.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...p, id: 1 }] });
  for (const f of [0.3, 0.7, 1]) await c.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: p.x + d[0] * 60 * f, y: p.y + d[1] * 60 * f, id: 1 }] });
  await c.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await c.detach();
  await page.waitForTimeout(40);
}
const DIR = { U: "up", D: "down", L: "left", R: "right" }, KEYS = { U: "ArrowUp", D: "ArrowDown", L: "ArrowLeft", R: "ArrowRight" };
const stat = (page, k) => page.locator(`[data-stat="${k}"]`);
const noScroll = (page) => page.evaluate(() => { const s = document.querySelector(".screen"); return s.scrollHeight <= s.clientHeight + 1 && document.documentElement.scrollHeight <= innerHeight + 1; });

test("offer appears only on the transition after ponds 5/15/25: Continue stays primary, 'Skipping costs nothing', lilies kept, no scroll", async ({ page }) => {
  await clearPond(page, 5);
  const card = page.locator(".transition-card");
  await expect(card.locator("h1")).toHaveText("Pond 6");
  await expect(card.locator(".lily-condition")).toHaveCount(3);
  await expect(page.locator(".bonus-offer")).toBeVisible();
  await expect(page.locator(".bonus-offer")).toContainText("Pack the fruit");
  await expect(page.locator(".bonus-offer")).toContainText("with Jun");
  await expect(page.locator(".bonus-offer")).toContainText("+1 orange");
  await expect(page.locator(".bonus-offer")).toContainText("for Pond 6");
  await expect(page.locator(".bonus-skip")).toContainText("Skipping costs nothing.");
  const primary = page.locator("[data-entry-primary]");
  await expect(primary).toHaveText("Start pond 6");
  await expect(primary).toHaveClass(/primary/);
  const [pb, ob] = [await primary.boundingBox(), await page.locator(".bonus-offer").boundingBox()];
  expect(pb.y).toBeLessThan(ob.y); // Continue comes first
  expect(await page.locator(".bonus-thumb i").count()).toBe(25);
  expect(await noScroll(page)).toBe(true);
  await shot(page, "offer-after-pond-5");
  for (const id of [4, 6, 9]) { await clearPond(page, id); await expect(page.locator(".bonus-offer")).toHaveCount(0); }
});
test("skipping really costs nothing: Start pond 6 → normal three oranges, no spare, progress untouched", async ({ page }) => {
  await clearPond(page, 5);
  await page.getByRole("button", { name: "Start pond 6" }).tap();
  await expect(page.locator(".topbar h2")).toHaveText("Pond 6");
  await expect(page.locator(".lives .orange")).toHaveCount(3);
  await expect(page.locator(".lives .orange.spare")).toHaveCount(0);
  const p = await stored(page);
  expect(p.bonus).toMatchObject({ solved: [], spare: null });
  expect(p.completed).toEqual(upto(6));
});
test("first entry shows 'Move your way'; swipe steps, tap walks without pushing, undo is free, restart, leave → back to Pond 6", async ({ page }) => {
  await clearPond(page, 5);
  await enterBonus(page, { dismiss: false });
  await expect(page.locator(".bonus-controls-dialog")).toBeVisible();
  await expect(page.locator(".bonus-controls-dialog")).toContainText("Tap a tile");
  await shot(page, "bonus-controls-card");
  await page.getByRole("button", { name: "Got it", exact: true }).tap();
  expect((await stored(page)).bonus.controlsSeen).toBe(true);
  await expect(page.locator(".crate-cell")).toHaveCount(25);
  await expect(page.locator(".crate-sprite")).toHaveCount(3);
  await expect(page.locator(".crate-packed-pill")).toContainText("0/3 packed");
  await expect(page.locator(".bonus-hint")).toHaveText("Push crates onto fruit · swipe to walk");
  await expect(page.locator(".bonus-capy-chip")).toContainText("Your capy · Jun");
  expect(await noScroll(page)).toBe(true);
  await shot(page, "bonus-play-start");
  const crates0 = await page.evaluate(() => [...document.querySelectorAll(".crate-sprite")].map((e) => e.getAttribute("style")));
  await swipe(page, "up"); // capy (1,2) → (0,2)
  await expect(stat(page, "moves")).toHaveText("1");
  await swipe(page, "up"); // into the frame: blocked, no move counted
  await expect(stat(page, "moves")).toHaveText("1");
  // tap a far floor tile: the capy walks around crates, never pushes
  await page.locator('[data-ci="24"]').tap();
  await expect(stat(page, "moves")).not.toHaveText("1");
  await page.waitForTimeout(900);
  await expect(page.locator(".crate-player")).toHaveAttribute("style", "--r:4;--c:4");
  await expect(stat(page, "pushes")).toHaveText("0");
  expect(await page.evaluate(() => [...document.querySelectorAll(".crate-sprite")].map((e) => e.getAttribute("style")))).toEqual(crates0);
  await page.getByRole("button", { name: "Undo", exact: true }).tap(); // the whole walk is one undo step
  await expect(stat(page, "moves")).toHaveText("1");
  await page.getByRole("button", { name: "Undo", exact: true }).tap();
  await expect(stat(page, "moves")).toHaveText("0");
  await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeDisabled();
  await swipe(page, "down");
  await swipe(page, "down");
  await page.getByRole("button", { name: "Restart", exact: true }).tap();
  await expect(stat(page, "moves")).toHaveText("0");
  await page.getByRole("button", { name: "Undo", exact: true }).tap(); // restart itself can be undone
  await expect(stat(page, "moves")).toHaveText("2");
  await page.getByRole("button", { name: "Leave bonus" }).tap();
  await expect(page.locator(".transition-card h1")).toHaveText("Pond 6");
  await expect(page.locator(".bonus-offer")).toBeVisible();
  expect((await stored(page)).bonus.spare).toBe(null);
  expect((await buzz(page)).filter((x) => x === HAPTICS.cratePush || JSON.stringify(x) === JSON.stringify(HAPTICS.crateLand)).length).toBe(0);
});
test("level 1 solved with real swipes: tick per pushed cell, distinct landing haptic, fruit pops golden, reward → Pond 6 with spare orange that absorbs one mistake but costs the 0-mistakes lily", async ({ page }) => {
  await clearPond(page, 5);
  await enterBonus(page);
  const lv = crates[0], before = (await buzz(page)).length;
  let landed = 0;
  for (const [k, ch] of [...lv.solution].entries()) {
    await swipe(page, DIR[ch]);
    const packed = Number((await stat(page, "packed").textContent())[0]);
    if (packed === 1 && !landed) {
      landed = 1;
      await expect(page.locator(".crate-sprite.packed")).toHaveCount(1);
      await expect(page.locator(".crate-cell.goal.filled")).toHaveCount(1);
      await expect(page.locator(".pill-fruits img.got")).toHaveCount(1);
      await page.waitForTimeout(700);
      await shot(page, "bonus-play-first-fruit-packed");
    }
    if (k === lv.solution.length - 2) await expect(stat(page, "packed")).toHaveText("2/3 packed");
  }
  await expect(page.locator(".crate-sprite.packed")).toHaveCount(3);
  await page.waitForTimeout(250);
  await shot(page, "bonus-level-1-packed"); // all three fruit golden, before the reward screen (900 ms)
  await expect(stat(page, "moves")).toHaveText(String(lv.optimalMoves));
  await expect(stat(page, "pushes")).toHaveText(String(lv.optimalPushes));
  const b = (await buzz(page)).slice(before);
  expect(b.filter((x) => x === HAPTICS.cratePush).length).toBe(lv.optimalPushes - 3);
  expect(b.filter((x) => JSON.stringify(x) === JSON.stringify(HAPTICS.crateLand)).length).toBe(3);
  expect(b.filter((x) => JSON.stringify(x) === JSON.stringify(HAPTICS.solve)).length).toBe(1);
  await expect(page.locator(".bonus-reward h1")).toHaveText("Fruit packed!");
  await expect(page.locator(".bonus-reward")).toContainText("+1 orange");
  await expect(page.locator(".bonus-reward")).toContainText("for Pond 6");
  await expect(page.locator(".bonus-reward")).toContainText("Next pond only · no stacking");
  await expect(page.locator(".bonus-reward")).toContainText(`${lv.optimalMoves} moves · best path ${lv.optimalMoves}`);
  await expect(page.locator(".bonus-reward")).toContainText("not part of 100%");
  expect(await noScroll(page)).toBe(true);
  await shot(page, "bonus-reward");
  let p = await stored(page);
  expect(p.bonus).toMatchObject({ solved: [1], best: { 1: lv.optimalMoves }, spare: { forPond: 6 } });
  expect(p.completed).toEqual(upto(6));
  await page.getByRole("button", { name: "Continue → Pond 6" }).tap();
  await expect(page.locator(".topbar h2")).toHaveText("Pond 6");
  await expect(page.locator(".lives .orange.spare")).toHaveCount(1);
  await expect(page.locator(".lives")).toHaveAttribute("aria-label", "3 oranges left plus 1 bonus orange");
  await expect(page.locator(".spare-hint")).toContainText("Bonus orange · this pond only");
  await shot(page, "pond-6-with-spare-orange");
  p = await stored(page);
  expect(p.bonus.spare).toBe(null);
  expect(p.sessions["pond-6"].spare).toBe(1);
  // reload mid-pond: the in-progress board keeps its spare
  await page.reload();
  await page.locator('[data-action="continue"]').tap();
  await enterReplay(page);
  await expect(page.locator(".lives .orange.spare")).toHaveCount(1);
  const q = data.levels[5], sol = solutionCells(q);
  await double(page, sol[0]);
  const near = [...Array(25).keys()].find((i) => !sol.includes(i) && violations(q, sol.slice(0, 1).reduce((c, s) => ((c[s] = 2), c), Array(25).fill(0)).map((v, k) => (k === i ? 2 : v))).has(i));
  await double(page, near);
  await expect(page.locator(".toast")).toContainText("Bonus orange used");
  await expect(page.locator(".lives")).toHaveAttribute("data-lives", "3");
  await expect(page.locator(".lives .orange.spare")).toHaveCount(0);
  await expect(page.locator(".lives .orange.used")).toHaveCount(0);
  await shot(page, "pond-6-spare-orange-used");
  await page.getByRole("button", { name: "Clear conflicts" }).tap();
  for (const i of sol.slice(1)) await double(page, i);
  await expect(page.locator(".banner")).toBeVisible();
  p = await stored(page);
  expect(p.lilies[6]).toMatchObject({ cleared: true, noMistakes: false });
  // the spare never comes back for a retry
  await page.getByRole("button", { name: "Replay", exact: true }).tap();
  await expect(page.locator(".lives .orange.spare")).toHaveCount(0);
});
test("deadlock: a crate pushed into a corner is flagged with 'That crate is stuck · Undo?' and Undo clears it", async ({ page }) => {
  await clearPond(page, 5);
  await enterBonus(page);
  // Level 1 interior:  . · · · .  /  · · @ · ·  /  # $ . $ ·  /  · · · $ ·  /  # # · · ·
  // Left, Down pushes crate (2,1) → (3,1); Right, Down puts the capy at (3,2); Left pushes it into (3,0):
  // rock above + frame left = a corner with no fruit.
  for (const k of ["ArrowLeft", "ArrowDown", "ArrowRight", "ArrowDown"]) await page.keyboard.press(k);
  await expect(page.locator(".bonus-stuck")).toBeHidden();
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator(".bonus-stuck")).toBeVisible();
  await expect(page.locator(".bonus-stuck")).toContainText("That crate is stuck");
  await expect(page.locator(".crate-sprite.stuck")).toHaveCount(1);
  expect((await buzz(page)).filter((x) => x === HAPTICS.locked).length).toBe(1);
  await page.waitForTimeout(400); // let the 110 ms slide finish before the capture
  await shot(page, "bonus-deadlock-undo");
  await page.locator(".bonus-stuck button").tap();
  await expect(page.locator(".bonus-stuck")).toBeHidden();
  await expect(page.locator(".crate-sprite.stuck")).toHaveCount(0);
});
test("no stacking: replaying the bonus keeps exactly one spare for Pond 6; Daily and other ponds leave it waiting", async ({ page }) => {
  await clearPond(page, 5, { bonus: { v: 1, solved: [1], best: { 1: 20 }, spare: { forPond: 6 }, dpad: false, controlsSeen: true } });
  await expect(page.locator(".bonus-offer")).toContainText("Spare orange ready");
  await expect(page.locator(".bonus-offer")).toContainText("Packed ✓ · best 20 moves");
  await enterBonus(page);
  for (const ch of crates[0].solution) await page.keyboard.press(KEYS[ch]);
  await expect(page.locator(".bonus-reward")).toContainText("Already waiting · no stacking");
  const p = await stored(page);
  expect(p.bonus.spare).toEqual({ forPond: 6 });
  expect(p.bonus.best[1]).toBe(crates[0].optimalMoves);
  await page.getByRole("button", { name: "Replay bonus" }).tap();
  await expect(page.locator(".crate-board")).toBeVisible();
  await page.getByRole("button", { name: "Leave bonus" }).tap();
  await page.getByRole("button", { name: "Home" }).tap();
  await page.getByRole("button", { name: /Daily Pond/ }).first().tap();
  await enterReplay(page);
  await expect(page.locator(".lives .orange.spare")).toHaveCount(0);
  expect((await stored(page)).bonus.spare).toEqual({ forPond: 6 });
});
for (const [pond, idx] of [[15, 1], [25, 2]])
  test(`bonus level ${idx + 1} (${crates[idx].name}, ${crates[idx].n}×${crates[idx].n}) is offered after pond ${pond} and solvable in ${crates[idx].optimalMoves} moves${idx === 1 ? " with the D-pad" : ""}`, async ({ page }) => {
    await clearPond(page, pond, { bonus: { v: 1, solved: [], best: {}, spare: null, dpad: idx === 1, controlsSeen: true } });
    await expect(page.locator(".bonus-offer")).toBeVisible();
    await expect(page.locator(".bonus-thumb i")).toHaveCount(crates[idx].n ** 2);
    expect(await noScroll(page)).toBe(true);
    await shot(page, `offer-after-pond-${pond}`);
    await enterBonus(page);
    await expect(page.locator(".crate-cell")).toHaveCount(crates[idx].n ** 2);
    if (idx === 1) await expect(page.locator(".bonus-dpad button")).toHaveCount(4);
    expect(await noScroll(page)).toBe(true);
    await shot(page, `bonus-level-${idx + 1}-start`);
    for (const [k, ch] of [...crates[idx].solution].entries()) {
      if (idx === 1) await page.locator(`[data-action="bonusDir"][data-dir="${DIR[ch]}"]`).tap();
      else await page.keyboard.press(KEYS[ch]);
      if (k === Math.floor(crates[idx].solution.length * 0.6)) { await page.waitForTimeout(250); await shot(page, `bonus-level-${idx + 1}-mid`); }
    }
    await expect(page.locator(".crate-sprite.packed")).toHaveCount(3);
    await page.waitForTimeout(250);
    await shot(page, `bonus-level-${idx + 1}-packed`);
    await expect(page.locator(".bonus-reward h1")).toHaveText("Fruit packed!");
    await expect(page.locator(".bonus-reward")).toContainText(`for Pond ${pond + 1}`);
    const p = await stored(page);
    expect(p.bonus.solved).toEqual([idx + 1]);
    expect(p.bonus.spare).toEqual({ forPond: pond + 1 });
    await page.getByRole("button", { name: `Continue → Pond ${pond + 1}` }).tap();
    await page.getByRole("button", { name: "Got it", exact: true }).tap({ timeout: 1500 }).catch(() => {});
    await expect(page.locator(".lives .orange.spare")).toHaveCount(1);
  });
test("Settings: D-pad toggle persists and swaps the capy chip for a D-pad that steps", async ({ page }) => {
  await clearPond(page, 5, { bonus: { v: 1, solved: [], best: {}, spare: null, dpad: false, controlsSeen: true } });
  await page.getByRole("button", { name: "Home" }).tap();
  await page.getByRole("button", { name: "Settings", exact: true }).tap();
  const t = page.getByRole("button", { name: "Crate bonus D-pad" });
  await expect(t).toHaveText("Off");
  await t.tap();
  await expect(page.getByRole("button", { name: "Crate bonus D-pad" })).toHaveText("On");
  await expect(page.locator(".build-label")).toContainText("v4.2.1 · build");
  await shot(page, "settings-dpad");
  expect((await stored(page)).bonus.dpad).toBe(true);
  await page.getByRole("button", { name: "Done", exact: true }).tap();
  await clearPond(page, 5, { bonus: (await stored(page)).bonus });
  await enterBonus(page);
  await expect(page.locator(".bonus-capy-chip")).toHaveCount(0);
  await page.getByRole("button", { name: "Step left" }).tap();
  await expect(stat(page, "moves")).toHaveText("1");
  await shot(page, "bonus-play-dpad");
});
