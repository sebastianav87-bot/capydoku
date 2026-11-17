// v4.3 rev b (Sebastián via the Producer, Nov 15): no Home pond grid. Launch opens the current pond's
// transition screen (the hub) or resumes a pond in progress; Daily is a secondary hub button; Hot Spring and
// Settings are header icons; replay lives only in Settings › Progress; the greens are CSS custom properties.
import{ test, expect,settleSeed,leaveGame}from"./legacy-ui.js";
import fs from "node:fs";
import { fresh, KEY, solutionCells, boardSignature } from "../core.js";
import { newAttempt } from "../powers.js";
import { shot } from "./screenshot-helper.js";
const data = JSON.parse(fs.readFileSync("levels.json"));
let errors;
test.beforeEach(async ({ page }) => { errors = []; page.on("pageerror", (e) => errors.push(e.message)); page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); }); });
test.afterEach(() => expect(errors).toEqual([]));
const upto = (id) => Array.from({ length: id - 1 }, (_, i) => i + 1);
const nearlySolved = (q) => { const s = { ...newAttempt(q.n), signature: boardSignature(q) }, sol = solutionCells(q); sol.slice(0, -1).forEach((i) => (s.cells[i] = 2)); return s; };
async function seed(page, extra = {}) {
  await leaveGame(page);await page.goto("/");
  await page.evaluate(({ k, p }) => { localStorage.setItem(k, JSON.stringify(p)); sessionStorage.clear(); }, { k: KEY, p: { ...fresh(), nickname: "Test Capy", starterChosen: true, tutorialSeen: true, music: false, rockIntroSeen: true, ...extra } });
  await settleSeed(page);
  await expect(page.locator(".hub,.game,.crate-screen").first()).toBeVisible();
}
async function point(page, i) { const b = await page.locator(`[data-cell="${i}"]`).boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }
async function double(page, i) { const r = await point(page, i); await page.touchscreen.tap(r.x, r.y); await page.waitForTimeout(65); await page.touchscreen.tap(r.x, r.y); }
const fits = (page) => page.evaluate(() => ({ h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth, ih: innerHeight, iw: innerWidth, s: [...document.querySelectorAll(".screen")].every((e) => e.scrollHeight <= e.clientHeight + 1) }));
async function expectFits(page) { const f = await fits(page); expect(f.h).toBeLessThanOrEqual(f.ih); expect(f.w).toBeLessThanOrEqual(f.iw); expect(f.s).toBe(true); }
const GONE = ".pond-tile,.pond-tiles,.pond-list,.pond-world,.continue-card,.pond-replay,.crate-replay,.home-scroll,nav.footer,.footer,[data-pond],[data-action='pondList'],[data-action='continue']";
async function openProgress(page) { await page.locator('.hub [data-action="settings"]').tap(); await page.locator('[data-action="progress"]').tap(); await expect(page.locator(".progress-ledger")).toBeVisible(); }

test("launch: a fresh player lands on the Pond 1 hub — level, world, size, Start, Daily, Hot Spring, Settings; no grid, no Home tab", async ({ page }) => {
  await seed(page, { completed: [] });
  const card = page.locator(".hub .transition-card");
  await expect(card).toHaveAttribute("data-level", "1");
  await expect(card.locator(".transition-kicker")).toHaveText("Next pond");
  await expect(card.locator("h1")).toHaveText("Pond 1");
  await expect(card.locator(".transition-world")).toContainText(`${data.levels[0].n}×${data.levels[0].n}`);
  await expect(page.getByRole("button", { name: "Start pond 1", exact: true })).toBeVisible();
  await expect(page.locator(".hub .hub-daily")).toContainText("Daily");
  await expect(page.locator(".hub-bar").getByRole("button", { name: "Settings", exact: true })).toBeVisible();
  await expect(page.locator(".hub-tiles").getByRole("button", { name: "Hot Spring", exact: true })).toBeVisible();
  await expect(page.locator(".hub-bar .hub-brand")).toContainText("Capydoku");
  await expect(page.locator(".hub-bar .lily-chip")).toHaveText("0/90");
  await expect(page.getByRole("button", { name: "Home", exact: true })).toHaveCount(0);
  await expect(page.locator(GONE)).toHaveCount(0);
  await expectFits(page);
  await shot(page, "revb-hub-launch");
  await page.getByRole("button", { name: "Start pond 1", exact: true }).tap();
  await expect(page.locator(".topbar h2")).toHaveText("Pond 1");
});

test("launch resumes an in-progress pond straight into the board; Back → hub 'In progress'; reload on the hub stays on the hub; reload mid-pond resumes", async ({ page }) => {
  const q = data.levels[6], s = { ...newAttempt(q.n), signature: boardSignature(q) }; s.cells[3] = 1;
  await seed(page, { completed: upto(7), sessions: { "pond-7": s } });
  await expect(page.locator(".topbar h2")).toHaveText("Pond 7");
  await expect(page.locator('[data-cell="3"]')).toHaveAttribute("data-value", "1");
  await page.getByRole("button", { name: "Back to home" }).tap();
  await expect(page.locator(".hub .transition-kicker")).toHaveText("In progress");
  await shot(page, "revb-hub-in-progress");
  await page.reload();
  await expect(page.locator(".hub .transition-card h1")).toHaveText("Pond 7");
  await page.getByRole("button", { name: "Continue pond 7", exact: true }).tap();
  await expect(page.locator('[data-cell="3"]')).toHaveAttribute("data-value", "1");
  await page.reload();
  await expect(page.locator(".topbar h2")).toHaveText("Pond 7");
  await expect(page.locator('[data-cell="3"]')).toHaveAttribute("data-value", "1");
});

test("flow: pond → summary (no Replay chip) → transition hub → next pond", async ({ page }) => {
  const q = data.levels[5];
  await seed(page, { completed: upto(6), sessions: { "pond-6": nearlySolved(q) } });
  await expect(page.locator(".topbar h2")).toHaveText("Pond 6");
  await double(page, solutionCells(q).at(-1));
  await expect(page.locator(".solve-lilies")).toBeVisible();
  await expect(page.getByRole("button", { name: "Replay", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Next pond →" })).toBeVisible();
  await shot(page, "revb-summary-no-replay");
  await page.getByRole("button", { name: "Next pond →" }).tap();
  await expect(page.locator(".hub .transition-card h1")).toHaveText("Pond 7");
  await expect(page.locator(".hub .hub-daily")).toBeVisible();
  await page.getByRole("button", { name: "Start pond 7", exact: true }).tap();
  await expect(page.locator(".topbar h2")).toHaveText("Pond 7");
});

for (const [name, done, h1] of [["normal", 3, "Pond 3"], ["crate", 5, "Crate Pond 5"], ["all-clear", 31, "All 30 ponds ✓"]])
  test(`Daily Pond opens from the ${name} hub and Back returns to it`, async ({ page }) => {
    await seed(page, { completed: upto(done) });
    await expect(page.locator(".hub .transition-card h1")).toHaveText(h1);
    await page.locator(".hub .hub-daily").tap();
    await expect(page.locator(".pond-wrap")).toHaveAttribute("data-level", "daily");
    await page.getByRole("button", { name: "Back to home" }).tap();
    await expect(page.locator(".hub .transition-card h1")).toHaveText(h1);
  });

test("Settings › Progress is the only replay: simple list (pond, size, lilies, Replay) of cleared ponds; replays a normal and a crate pond", async ({ page }) => {
  await seed(page, { completed: upto(9), lilies: { 2: { cleared: true, noMistakes: true, underTarget: false } } });
  await openProgress(page);
  const rows = page.locator(".replay-row");
  await expect(rows).toHaveCount(8);
  await expect(rows.first().locator("strong")).toHaveText("Pond 1");
  await expect(rows.first().locator("small")).toHaveText(`${data.levels[0].n}×${data.levels[0].n}`);
  await expect(page.locator('.replay-row[data-row="2"] .node-lilies')).toHaveAttribute("aria-label", "2 of 3 lilies");
  await expect(page.locator('.replay-row[data-row="5"] strong')).toHaveText("Crate Pond 5");
  await expect(page.locator('.replay-row[data-row="5"] small')).toContainText("crates");
  await expect(page.locator('.replay-row[data-row="9"]')).toHaveCount(0);
  await shot(page, "revb-progress-replay-list");
  await page.getByRole("button", { name: "Replay Pond 2", exact: true }).tap();
  await expect(page.locator(".topbar h2")).toHaveText("Pond 2");
  expect(await page.locator('[data-cell][data-value="0"]').count()).toBe(data.levels[1].n ** 2);
  await page.getByRole("button", { name: "Back to home" }).tap();
  await expect(page.locator(".hub .transition-card h1")).toHaveText("Boss Pond 9");
  await openProgress(page);
  await page.locator('.replay-btn[data-level="5"]').scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Replay Crate Pond 5", exact: true }).tap();
  await expect(page.locator(".bonus-title h2")).toHaveText("Crate Pond 5");
});

test("Hot Spring and Settings from header icons; Hot Spring has '‹ Pond' back and no Home tab", async ({ page }) => {
  await seed(page, { completed: upto(12) });
  await page.locator(".hub-tiles").getByRole("button", { name: "Hot Spring", exact: true }).tap();
  await expect(page.locator(".crew-pool")).toBeVisible();
  await expect(page.getByRole("button", { name: "Home", exact: true })).toHaveCount(0);
  await expect(page.locator(".spring-bar [data-action='settings']")).toBeVisible();
  await expect(page.locator(GONE)).toHaveCount(0);
  await shot(page, "revb-hot-spring-header");
  await page.getByRole("button", { name: "Back to pond", exact: true }).tap();
  await expect(page.locator(".hub .transition-card h1")).toHaveText("Pond 12");
  await page.locator(".hub-bar").getByRole("button", { name: "Settings", exact: true }).tap();
  await expect(page.locator(".settings-dialog")).toBeVisible();
});

for (const [name, done, kicker] of [["boss", 9, "Boss pond"], ["gate", 10, "World gate"], ["breather", 11, "New world"], ["finale", 30, "The finale"], ["all-clear", 31, "Every pond cleared"]])
  test(`hub variant ${name} fits one screen with Start/Daily and the header icons`, async ({ page }) => {
    await seed(page, { completed: upto(done) });
    await expect(page.locator(".hub .transition-kicker")).toHaveText(kicker);
    await expect(page.locator(".hub .hub-daily")).toBeVisible();
    await expect(page.locator(".hub-bar .hub-icon")).toHaveCount(1);
    await expect(page.locator(".hub-tiles .hub-tile")).toHaveCount(2);
    await expect(page.locator(GONE)).toHaveCount(0);
    await expectFits(page);
    for (const b of await page.locator(".hub button").all()) { const r = await b.boundingBox(); expect(r.height).toBeGreaterThanOrEqual(44); expect(r.y + r.height).toBeLessThanOrEqual(page.viewportSize().height); }
    await shot(page, `revb-hub-${name}`);
  });

test("nothing references the removed grid: app sources have no tile/list/continue/replay-sheet hooks and no screen renders them", async ({ page }) => {
  const files = fs.readdirSync(".").filter((f) => /\.(js|css|html)$/.test(f) && !/^playwright|\.config\./.test(f));
  const banned = [/pond-tile/, /pond-tiles/, /pond-list/, /pond-world/, /continue-card/, /pondReplay/, /crateReplay/, /closePondReplay/, /pond-replay/, /crate-replay/, /home-scroll/, /data-pond\b/, /"pondList"/, /class="footer/, /bonusReplay/, /Replay a pond · all ponds/, /\.home\b(?!-)/];
  const hits = [];
  for (const f of files) { const src = fs.readFileSync(f, "utf8"); for (const re of banned) if (re.test(src)) hits.push(`${f}: ${re}`); }
  expect(hits).toEqual([]);
  await seed(page, { completed: upto(12) });
  const screens = [async () => {}, async () => page.locator(".hub [data-action='collection']").tap(), async () => { await page.getByRole("button", { name: "Back to pond" }).tap(); await openProgress(page); }, async () => { await page.getByRole("button", { name: "Replay Pond 3" }).tap(); }];
  for (const go of screens) { await go(); await page.waitForTimeout(150); await expect(page.locator(GONE)).toHaveCount(0); }
});

test("theme: Fresh Leaf greens are CSS custom properties in one :root block and drive the primary button", async ({ page }) => {
  await seed(page, { completed: [] });
  const v = await page.evaluate(() => { const cs = getComputedStyle(document.documentElement); return Object.fromEntries(["300", "400", "500", "600", "700"].map((k) => [k, cs.getPropertyValue(`--green-${k}`).trim()])); });
  expect(v).toEqual({ 300: "#418042", 400: "#4B904C", 500: "#4B904C", 600: "#3B7E3D", 700: "#2C6C2F" });
  const bg = await page.locator(".hub .primary").evaluate((e) => getComputedStyle(e).backgroundImage);
  expect(bg).toContain("rgb(65, 128, 66)");
  await page.evaluate(() => document.documentElement.style.setProperty("--green-300", "#00ff00"));
  expect(await page.locator(".hub .primary").evaluate((e) => getComputedStyle(e).backgroundImage)).toContain("rgb(0, 255, 0)");
  const css = fs.readdirSync(".").filter((f) => f.endsWith(".css")).map((f) => [f, fs.readFileSync(f, "utf8")]);
  const roots = css.filter(([, s]) => /:root\s*\{[^}]*--green-500/.test(s)).map(([f]) => f);
  expect(roots).toEqual(["style.css"]);
  // neither the old greens nor raw copies of the Fresh Leaf tokens may live outside the theme block
  const raw = css.flatMap(([f, s]) => (s.replace(/:root\s*\{[^}]*\}/, "").match(/#(7EAC77|6EAF78|5E9A63|4E9454|4E944F|4A944E|66885B|537B56|2F5A38|3F513E|718264|6E8A63|879D7B|DEE7C7|A8B18A|4C7048|418042|3B7E3D|29612C|4B904C|2C6C2F|314E2F|546F52|71946E|D5E8D2|89A986)\b/gi) || []).map((h) => `${f} ${h}`));
  expect(raw).toEqual([]);
});

test("capy ⇄ on the hub opens the switcher; switching keeps the hub", async ({ page }) => {
  await seed(page, { completed: upto(7) });
  await page.locator(".hub .capy-swap").tap();
  await expect(page.locator(".switch-sheet")).toBeVisible();
  await page.getByRole("button", { name: "Choose Bloom", exact: true }).tap();
  await page.locator(".switch-sheet .chooser-confirm").tap();
  await expect(page.locator(".hub .transition-card h1")).toHaveText("Pond 7");
  await expect.poll(() => page.locator(".hub .transition-capy").evaluate((e) => e.currentSrc)).toMatch(/bloom/i);
});

// WCAG AA (4.5:1 for text) for every visible text element on the hub, Hot Spring bar, Progress and the solved summary chips.
const contrastAudit = (page) => page.evaluate(() => {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [r, g, b, a]; };
  const lum = ([r, g, b]) => [r, g, b].map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); const img = cs.backgroundImage; if (img && img.includes("gradient")) { const cols = [...img.matchAll(/rgba?\([^)]+\)/g)].map((m) => parse(m[0])); if (cols.length) return cols.reduce((w, c) => (lum(c) > lum(w) ? c : w)); } const c = parse(cs.backgroundColor); if (c && c[3] > 0.5) return c; } return [251, 245, 229, 1]; };
  const out = [];
  for (const el of document.querySelectorAll(".screen *")) {
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight) continue;
    const cs = getComputedStyle(el); if (cs.visibility === "hidden" || +cs.opacity === 0 || el.closest(".sr-only,.art-tag,.crew-pool,.collection-title")) continue;
    const fg = parse(cs.color), bg = bgOf(el), L1 = lum(fg), L2 = lum(bg), ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    out.push({ text: el.textContent.trim().slice(0, 30), cls: el.className?.baseVal ?? el.className, ratio: Math.round(ratio * 100) / 100, size: cs.fontSize });
  }
  return out;
});
test("WCAG AA: buttons and small text on the hub, Progress and the summary pass 4.5:1 with Fresh Leaf", async ({ page }) => {
  const fails = [];
  const check = async (where) => { for (const t of await contrastAudit(page)) if (t.ratio < 4.5) fails.push(`${where}: "${t.text}" (${t.cls}) ${t.ratio}`); };
  for (const done of [7, 9, 10, 31]) { await seed(page, { completed: upto(done) }); await check(`hub ${done}`); }
  await seed(page, { completed: upto(9) });
  await openProgress(page); await check("progress");
  const q = data.levels[5];
  await seed(page, { completed: upto(6), sessions: { "pond-6": nearlySolved(q) } });
  await double(page, solutionCells(q).at(-1));
  await expect(page.locator(".solve-lilies")).toBeVisible();
  await page.waitForTimeout(900);
  await check("summary");
  expect(fails).toEqual([]);
});
