// v4.2: real frozen v4.1 (app-v4.1-backup, byte-identical to the v4.1 runtime tar) → v4.2 auto-update, and
// v4.2 → a later build deferred while a crate bonus is in progress.
import { test, expect, enterReplay, openPond } from "./legacy-ui.js";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { KEY, fresh, solutionCells, boardSignature } from "../core.js";
import { newAttempt } from "../powers.js";
import { BUILD } from "../build-info.js";
import { shot } from "./screenshot-helper.js";
const root = path.resolve("."), oldRoot = path.resolve("../app-v4.1-backup"), data = JSON.parse(fs.readFileSync("levels.json")), manifest = JSON.parse(fs.readFileSync("reports/precache.json"));
const sha = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
let errors;
test.beforeEach(async ({ page }) => {
  errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.addInitScript(() => { sessionStorage.setItem("v42Loads", String(Number(sessionStorage.getItem("v42Loads") || 0) + 1)); Object.defineProperty(navigator, "vibrate", { value: () => true, configurable: true }); });
});
test.afterEach(() => expect(errors).toEqual([]));
const loads = (page) => page.evaluate(() => Number(sessionStorage.getItem("v42Loads")));
const stored = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
const update = (page) => page.evaluate(() => { navigator.serviceWorker.getRegistration().then((r) => r.update()).catch(() => {}); });
const digest = (page, url) => page.evaluate(async (u) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await (await fetch(u)).arrayBuffer())), (x) => x.toString(16).padStart(2, "0")).join(""), url);
async function double(page, i) { const b = await page.locator(`[data-cell="${i}"]`).boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await page.waitForTimeout(65); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); }
function retained(next, old) { for (const k of ["completed", "selected", "nickname", "goldenLilies", "daily"]) expect(next[k]).toEqual(old[k]); for (const [k, v] of Object.entries(old.lilies)) expect(next.lilies[k]).toMatchObject(v); }
// A later build of THIS app: same files, new cache + build label (what the next publish would look like).
function laterBuild() {
  const dir = fs.mkdtempSync("/tmp/capydoku-v42-later-");
  for (const u of [...manifest.urls.filter((u) => u !== "./"), "sw.js"]) { fs.mkdirSync(path.dirname(path.join(dir, u)), { recursive: true }); fs.copyFileSync(path.join(root, u), path.join(dir, u)); }
  fs.writeFileSync(path.join(dir, "sw.js"), fs.readFileSync(path.join(dir, "sw.js"), "utf8").replace(BUILD.cache, BUILD.cache + "-later"));
  fs.writeFileSync(path.join(dir, "build-info.js"), fs.readFileSync(path.join(dir, "build-info.js"), "utf8").replaceAll(BUILD.build, "later000000"));
  return dir;
}
async function fixture(page, from, to, port, save) {
  const dir = fs.mkdtempSync("/tmp/capydoku-v42-up-"), link = path.join(dir, "current"), base = `http://127.0.0.1:${port}/`;
  fs.symlinkSync(from, link, "dir");
  let logs = "";
  const server = spawn("python3", ["-m", "http.server", String(port), "--bind", "127.0.0.1", "--directory", link]);
  server.stderr.on("data", (d) => (logs += d));
  await expect.poll(async () => { try { return (await page.request.get(base)).status(); } catch { return 0; } }).toBe(200);
  await page.goto(base);
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await page.evaluate(({ k, p }) => localStorage.setItem(k, JSON.stringify(p)), { k: KEY, p: save });
  await page.reload();
  await expect(page.locator(".hub")).toBeVisible();
  return {
    switch() { fs.symlinkSync(to, path.join(dir, "new"), "dir"); fs.renameSync(path.join(dir, "new"), link); },
    async close() { server.kill("SIGTERM"); if (server.exitCode === null) await new Promise((r) => server.once("exit", r)); fs.writeFileSync(`reports/v4.2/upgrade-http-${port}.log`, logs); fs.rmSync(dir, { recursive: true, force: true }); },
  };
}
const baseSave = () => ({ ...fresh(), nickname: "Seba 🌿", starterChosen: true, tutorialSeen: true, rockIntroSeen: true, music: false, selected: "Bloom", completed: Array.from({ length: 18 }, (_, i) => i + 1), goldenLilies: [10], daily: { lastDay: 20766, streak: 18 }, lilies: { 5: { cleared: true, noMistakes: true, underTarget: true }, 10: { cleared: true, noMistakes: true, underTarget: true }, 18: { cleared: true, noMistakes: false, underTarget: true } } });

test("real v4.1 → v4.2 on Home: one automatic reload, 'Updated to v4.2.1', all progress and lilies kept, bonus defaults, offline 200s", async ({ page, context }) => {
  const save = baseSave();
  delete save.bonus; // a real v4.1 save has no bonus block
  const f = await fixture(page, oldRoot, root, 8896, save);
  try {
    await page.getByRole("button", { name: "Settings", exact: true }).tap();
    await expect(page.locator(".build-label")).toHaveText("v4.1 · build 923843f2cc02");
    await page.getByRole("button", { name: "Done", exact: true }).tap();
    const n = await loads(page);
    f.switch();
    await Promise.all([page.waitForEvent("load"), update(page)]);
    await expect(page.locator(".hub")).toBeVisible();
    expect(await loads(page)).toBe(n + 1);
    await expect(page.locator(".version-toast")).toHaveText("Updated to v4.2.1");
    const next = await stored(page);
    retained(next, save);
    expect(next.version).toBe(3);
    expect(next.bonus).toEqual({ v: 1, solved: [], best: {}, spare: null, dpad: false, controlsSeen: false });
    await page.getByRole("button", { name: "Settings", exact: true }).tap();
    await expect(page.locator(".build-label")).toHaveText(`v4.2.1 · build ${BUILD.build}`);
    await shot(page, "v41-to-v42-build-label");
    await page.getByRole("button", { name: "Done", exact: true }).tap();
    const stable = await loads(page);
    await update(page);
    await page.waitForTimeout(350);
    expect(await loads(page)).toBe(stable);
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator(".hub")).toBeVisible();
    const checks = await page.evaluate(async (urls) => Promise.all(urls.map(async (url) => ({ url, status: (await fetch(url)).status }))), manifest.urls);
    expect(checks.filter((x) => x.status !== 200)).toEqual([]);
    retained(await stored(page), save);
    fs.writeFileSync(`reports/v4.2/upgrade-home-${page.viewportSize().width}.json`, JSON.stringify({ from: "capydoku-v4.1-923843f2cc02", to: BUILD.cache, fromFrozenBackup: true, automaticReloads: 1, progressPreserved: true, offlineAll200: checks.length, consoleErrors: errors }, null, 2));
  } finally { try { await context.setOffline(false); } catch {} await f.close(); }
});
test("real v4.1 → v4.2 defers mid-pond until the pond is finished, pins old code offline, then the next transition offers the bonus", async ({ page, context }) => {
  const save = baseSave();
  delete save.bonus;
  save.completed = [1, 2, 3, 4];
  const q = data.levels[4];
  const f = await fixture(page, oldRoot, root, 8897, save);
  try {
    await openPond(page,5);
    await enterReplay(page);
    const sol = solutionCells(q);
    await double(page, sol[0]);
    const before = await loads(page), oldCore = sha(path.join(oldRoot, "core.js"));
    f.switch();
    await update(page);
    await expect.poll(() => page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return !!r?.active && !r.installing && !r.waiting; })).toBe(true);
    await page.waitForTimeout(300);
    expect(await loads(page)).toBe(before);
    expect(await digest(page, "core.js")).toBe(oldCore);
    await context.setOffline(true);
    expect(await digest(page, "core.js")).toBe(oldCore);
    await expect(page.locator(`[data-cell="${sol[0]}"]`)).toHaveAttribute("data-value", "2");
    await Promise.all([page.waitForEvent("load"), (async () => { for (const i of sol.slice(1)) await double(page, i); })()]);
    await expect(page.locator(".hub")).toBeVisible();
    expect(await loads(page)).toBe(before + 1);
    await expect(page.locator(".version-toast")).toHaveText("Updated to v4.2.1");
    const next = await stored(page);
    expect(next.completed).toContain(5);
    expect(next.lilies[5].cleared).toBe(true);
    expect(await digest(page, "core.js")).toBe(sha(path.join(root, "core.js")));
    expect(next.bonus).toEqual({ v: 1, solved: [], best: {}, spare: null, dpad: false, controlsSeen: false });
    await shot(page, "v41-to-v42-deferred-finish");
    fs.writeFileSync(`reports/v4.2/upgrade-deferred-${page.viewportSize().width}.json`, JSON.stringify({ from: "capydoku-v4.1-923843f2cc02", to: BUILD.cache, deferredUntil: "finish", oldCodePinnedOffline: true, automaticReloads: 1, consoleErrors: errors }, null, 2));
  } finally { try { await context.setOffline(false); } catch {} await f.close(); }
});
test("v4.2 → later build: no reload while a crate bonus is in progress; reload happens once on leaving it", async ({ page }) => {
  const later = laterBuild(), save = { ...baseSave(), completed: [1, 2, 3, 4], sessions: {} };
  const q = data.levels[4], s = { ...newAttempt(5), signature: boardSignature(q) }, sol = solutionCells(q);
  sol.slice(0, -1).forEach((i) => (s.cells[i] = 2));
  save.sessions["pond-5"] = s;
  save.bonus = { v: 1, solved: [], best: {}, spare: null, dpad: false, controlsSeen: true };
  const f = await fixture(page, root, later, 8898, save);
  try {
    await openPond(page,5);
    await enterReplay(page);
    await double(page, sol.at(-1));
    await expect(page.locator(".banner")).toBeVisible();
    await page.getByRole("button", { name: "Next pond →" }).tap();
    await page.getByRole("button", { name: "Play bonus" }).tap();
    await expect(page.locator(".crate-board")).toBeVisible();
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowDown");
    const before = await loads(page);
    f.switch();
    await update(page);
    await expect.poll(() => page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return !!r?.active && !r.installing && !r.waiting && r.active.scriptURL; })).toBeTruthy();
    await page.waitForTimeout(1200);
    expect(await loads(page)).toBe(before);
    await expect(page.locator('[data-stat="moves"]')).toHaveText("2");
    await Promise.all([page.waitForEvent("load"), page.getByRole("button", { name: "Leave bonus" }).tap()]);
    expect(await loads(page)).toBe(before + 1);
    await expect(page.locator(".hub")).toBeVisible();
    expect((await stored(page)).completed).toContain(5);
    fs.writeFileSync(`reports/v4.2/update-deferred-bonus-${page.viewportSize().width}.json`, JSON.stringify({ from: BUILD.cache, to: BUILD.cache + "-later", deferredDuring: "bonus", reloadOn: "leave → transition", automaticReloads: 1, consoleErrors: errors }, null, 2));
  } finally { await f.close(); fs.rmSync(later, { recursive: true, force: true }); }
});
