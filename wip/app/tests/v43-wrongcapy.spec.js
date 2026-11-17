// v4.3 rev b — "wrong capy = immediate mistake". Sebastián, live v4.2 pond 23: "me deja poner capibaras donde no
// debería y después no hay respuesta posible en el último color." Producer decision: a capy on any cell outside the
// unique solution is a mistake right away (buzz, orange — spare first, Nap none —, counts against No mistakes) and is
// rejected with a short red shake. Correct capys lock as before. Clear conflicts is retired.
import { test, expect, settleSeed, leaveGame } from "./legacy-ui.js";
import fs from "node:fs";
import { fresh, KEY, solutionCells, boardSignature, dailyPuzzle, peers } from "../core.js";
import { newAttempt } from "../powers.js";
import { HAPTIC_CONFIG } from "../config.js";
import { shot } from "./screenshot-helper.js";
const data = JSON.parse(fs.readFileSync("levels.json"));
const v42 = JSON.parse(fs.readFileSync("../app-v4.2.1-backup/levels.json"));
let errors;
test.beforeEach(async ({ page }) => {
  errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.addInitScript(() => { window.__buzz = []; navigator.vibrate = (p) => { window.__buzz.push(p); return true; }; });
});
test.afterEach(() => expect(errors).toEqual([]));
const upto = (id) => Array.from({ length: id - 1 }, (_, i) => i + 1);
const wrongCells = (q) => [...Array(q.n * q.n).keys()].filter((i) => !solutionCells(q).includes(i) && !q.rocks.includes(i));
async function seed(page, extra = {}) {
  await leaveGame(page); await page.goto("/");
  await page.evaluate(({ k, p }) => { localStorage.setItem(k, JSON.stringify(p)); sessionStorage.clear(); }, { k: KEY, p: { ...fresh(), nickname: "Test Capy", starterChosen: true, tutorialSeen: true, music: false, rockIntroSeen: true, ...extra } });
  await settleSeed(page);
  await expect(page.locator(".hub,.game").first()).toBeVisible();
}
async function point(page, i) { const b = await page.locator(`[data-cell="${i}"]`).boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }
async function double(page, i) { const r = await point(page, i); await page.touchscreen.tap(r.x, r.y); await page.waitForTimeout(65); await page.touchscreen.tap(r.x, r.y); }
const lives = (page) => page.locator(".lives");
const cell = (page, i) => page.locator(`[data-cell="${i}"]`);
async function startPond1(page) {
  await seed(page, { completed: [] });
  await page.getByRole("button", { name: "Start pond 1", exact: true }).tap();
  await expect(page.locator(".pond-wrap[data-level='1']")).toBeVisible();
}
async function expectRejected(page, i, before, livesAfter) {
  await expect(cell(page, i).locator(".reject-capy")).toHaveCount(1);
  await expect(cell(page, i)).toHaveClass(/reject-shake/);
  await expect(lives(page)).toHaveAttribute("data-lives", String(livesAfter));
  await expect(cell(page, i).locator(".reject-capy")).toHaveCount(0, { timeout: 2000 });
  await expect(cell(page, i)).not.toHaveClass(/reject-shake/);
  await expect(cell(page, i)).toHaveAttribute("data-value", before);
}

test("pond 1: a wrong capy buzzes, costs an orange, shakes red and hops out; a correct capy locks for free; no Clear conflicts", async ({ page }) => {
  const q = data.levels[0], [w] = wrongCells(q), s = solutionCells(q)[0];
  await startPond1(page);
  await expect(lives(page)).toHaveAttribute("data-lives", "3");
  await double(page, w);
  await expect(cell(page, w).locator(".reject-capy")).toHaveCount(1);
  await shot(page, "revb-wrong-capy-shake");
  await expectRejected(page, w, "0", 2);
  expect(await page.evaluate(() => window.__buzz.at(-1))).toEqual([...HAPTIC_CONFIG.patterns.mistake]);
  await double(page, s);
  await expect(cell(page, s)).toHaveClass(/capy-locked/);
  await expect(lives(page)).toHaveAttribute("data-lives", "2");
  expect(await page.evaluate(() => window.__buzz.at(-1))).toEqual(HAPTIC_CONFIG.patterns.correct);
  await expect(page.locator(".clear-conflicts,[data-action='clearConflicts'],.conflict-box,.cell.bad")).toHaveCount(0);
  // Undo: the rejected capy left no step; Undo cannot refund the orange or lift the lock
  const undo = page.locator('[data-action="undo"]');
  await expect(undo.first()).toBeDisabled(); // nothing to undo: the rejection left no step and the lock cannot be undone
});

test("× then a capy on a wrong × cell: the × stays, the orange is lost; three wrong capys end the pond", async ({ page }) => {
  const q = data.levels[0], W = wrongCells(q);
  await startPond1(page);
  const r = await point(page, W[0]); await page.touchscreen.tap(r.x, r.y);
  await expect(cell(page, W[0])).toHaveAttribute("data-value", "1");
  await page.waitForTimeout(400);
  await double(page, W[0]);
  await expectRejected(page, W[0], "1", 2);
  await double(page, W[1]); await expectRejected(page, W[1], "0", 1);
  await double(page, W[2]);
  await expect(page.getByRole("heading", { name: "Out of oranges" })).toBeVisible();
});

test("drag placement only paints ×, even across wrong cells — never a capy, never an orange", async ({ page }) => {
  const q = data.levels[0], W = wrongCells(q), n = q.n;
  const row = [...Array(n).keys()].find((r) => [0, 1, 2].every((c) => W.includes(r * n + c)));
  test.skip(row === undefined, "no 3 wrong cells in a row");
  await startPond1(page);
  const a = await point(page, row * n), b = await point(page, row * n + 2);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: a.x, y: a.y }] });
  for (let k = 1; k <= 8; k++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: a.x + ((b.x - a.x) * k) / 8, y: a.y }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  for (const c of [0, 1, 2]) await expect(cell(page, row * n + c)).toHaveAttribute("data-value", "1");
  await expect(lives(page)).toHaveAttribute("data-lives", "3");
});

test.describe("v4.2 board served to the page (service worker blocked so the route applies)", () => {
test.use({ serviceWorkers: "block" });
test("v4.2 pond 23, Sebastián's exact position: r6c4 and r7c7 are rejected, the orange zone keeps its cell, the pond finishes", async ({ page }) => {
  await page.context().route("**/levels.json", async (route) => {
    const res = await route.fetch(), json = await res.json();
    json.levels[22] = { ...json.levels[22], ...v42.levels[22] };
    await route.fulfill({ response: res, json });
  });
  const P = v42.levels[22], s = { ...newAttempt(7), signature: boardSignature(P) };
  [0, 9, 19, 22].forEach((i) => (s.cells[i] = 2));
  await seed(page, { completed: upto(23), sessions: { "pond-23": s } });
  await expect(page.locator(".pond-wrap[data-level='23']")).toBeVisible();
  await expect(page.locator(".cell")).toHaveCount(49);
  for (const i of [0, 9, 19, 22]) await expect(cell(page, i)).toHaveClass(/capy-locked/);
  await double(page, 5 * 7 + 3); await expectRejected(page, 38, "0", 2);
  await double(page, 6 * 7 + 6); await expectRejected(page, 48, "0", 1);
  await shot(page, "revb-pond23-v42-after-rejects");
  const legalInZone6 = await page.evaluate(() => [...document.querySelectorAll(".cell")].filter((c) => c.dataset.value === "0").length);
  expect(legalInZone6).toBeGreaterThan(0);
  for (const i of [31, 41, 46]) { await double(page, i); await page.waitForTimeout(250); }
  await expect(page.locator(".solve-lilies")).toBeVisible({ timeout: 8000 });
});
});

test("an old save holding wrong capys (v4.3 pond 23 dead end) is repaired on resume: wrong capys gone, locks and oranges kept", async ({ page }) => {
  const q = data.levels[22], s = { ...newAttempt(q.n), signature: boardSignature(q), lives: 2 };
  [2, 14, 26, 31, 42, 55].forEach((i) => (s.cells[i] = 2));
  await seed(page, { completed: upto(23), sessions: { "pond-23": s } });
  await expect(page.locator(".pond-wrap[data-level='23']")).toBeVisible();
  for (const i of [2, 14, 26, 31]) await expect(cell(page, i)).toHaveClass(/capy-locked/);
  for (const i of [42, 55]) await expect(cell(page, i)).toHaveAttribute("data-value", "0");
  await expect(lives(page)).toHaveAttribute("data-lives", "2");
  await expect(page.locator(".clear-conflicts,.cell.bad")).toHaveCount(0);
});

test("Nap: a wrong capy costs no orange but is still rejected and spends a charge; spare orange absorbs the first loss with its toast", async ({ page }) => {
  const q = data.levels[0], W = wrongCells(q);
  await seed(page, { completed: [], selected: "Remy" });
  await page.getByRole("button", { name: "Start pond 1", exact: true }).tap();
  const { activatePowerUI } = await import("./power-helper.js");
  await activatePowerUI(page, "Nap");
  await double(page, W[0]);
  await expectRejected(page, W[0], "0", 3);
  await expect(page.getByText("Nap · 2 safe moves left", { exact: true })).toHaveCount(1);
  await expect(page.getByText(/no orange lost/)).toBeVisible();
  // spare orange
  const s = { ...newAttempt(q.n), signature: boardSignature(q), spare: 1 };
  s.cells[W[5]] = 1;
  await seed(page, { completed: [], sessions: { "pond-1": s } });
  await expect(page.locator(".pond-wrap[data-level='1']")).toBeVisible();
  await double(page, W[1]);
  await expect(page.locator(".toast")).toContainText("Spare orange used");
  await expect(lives(page)).toHaveAttribute("data-lives", "3");
  await expect(cell(page, W[1])).toHaveAttribute("data-value", "0", { timeout: 2000 });
});

test("Second chance after a rejected capy restores the orange; the board stays clean", async ({ page }) => {
  const q = data.levels[0], W = wrongCells(q);
  await seed(page, { completed: [], selected: "Bloom" });
  await page.getByRole("button", { name: "Start pond 1", exact: true }).tap();
  await double(page, W[0]);
  await expectRejected(page, W[0], "0", 2);
  const { activatePowerUI } = await import("./power-helper.js");
  await activatePowerUI(page);
  await expect(lives(page)).toHaveAttribute("data-lives", "3");
  await expect(page.getByText("Second chance · orange restored", { exact: true })).toBeVisible();
  await expect(page.locator('.cell[data-value="2"]')).toHaveCount(0);
});

test("Daily Pond follows the same rule", async ({ page }) => {
  await seed(page, { completed: [] });
  const q = dailyPuzzle(data, new Date(), false), [w] = wrongCells(q);
  await page.locator(".hub .hub-daily").tap();
  await expect(page.locator(".pond-wrap[data-level='daily']")).toBeVisible();
  await double(page, w);
  await expectRejected(page, w, "0", 2);
});

test("rules sheet and tutorial explain the rule", async ({ page }) => {
  await startPond1(page);
  await page.locator('[data-action="rules"]').first().tap();
  await expect(page.locator(".mistake-rule")).toContainText("hops right back out and costs an orange");
  await shot(page, "revb-rules-wrong-spot");
});
