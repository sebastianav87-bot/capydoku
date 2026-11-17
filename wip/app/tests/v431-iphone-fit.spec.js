// v4.3.1 iPhone fit (WebKit, iPhone emulation): every crate pond (C1–C6 = ponds 5/10/15/20/25/30) and Boss 29 must fit
// the visible viewport with no page scroll, every control inside it, at iPhone sizes in Safari-tab mode (toolbar height
// removed) and standalone mode (safe-area insets simulated by rewriting env(safe-area-inset-*)). Emulated: no real iPhone.
import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { fresh, KEY } from "../core.js";
const SIZES = [
  { id: "375x667-standalone", w: 375, h: 667, inset: [20, 0], standalone: true },
  { id: "375x525-tab", w: 375, h: 525, inset: [0, 0] },
  { id: "390x664-tab", w: 390, h: 664, inset: [0, 0] }, // the reported case: 390×844 with Safari's bottom toolbar
  { id: "390x694-tab", w: 390, h: 694, inset: [0, 0] },
  { id: "390x844-standalone", w: 390, h: 844, inset: [47, 34], standalone: true },
  { id: "393x702-tab", w: 393, h: 702, inset: [0, 0] },
  { id: "393x852-standalone", w: 393, h: 852, inset: [59, 34], standalone: true },
  { id: "430x782-tab", w: 430, h: 782, inset: [0, 0] },
  { id: "430x932-standalone", w: 430, h: 932, inset: [59, 34], standalone: true },
];
const CRATES = [5, 10, 15, 20, 25, 30];
const levels = JSON.parse(fs.readFileSync(new URL("../crate-levels.json", import.meta.url))).levels;
const ARROW = { U: "ArrowUp", D: "ArrowDown", L: "ArrowLeft", R: "ArrowRight" };
const CRATE_SEL = { header: ".bonus-header", leave: ".bonus-header .leave", restartTop: '.bonus-header [data-action="bonusRestart"]', stats: ".bonus-stats", board: ".crate-board", packed: ".crate-packed-pill", hint: ".bonus-hint", showme: ".crate-showme", showmeBtn: '[data-action="bonusShowMe"]', undo: '.bonus-controls [data-action="bonusUndo"]', restart: '.bonus-controls [data-action="bonusRestart"]', dpad: ".bonus-dpad", capyChip: ".bonus-capy-chip", lilies: ".bonus-leave-card" };
const GAME_SEL = { header: ".topbar", back: ".topbar .level-pill", help: ".topbar .help-btn", lives: ".lives", rules: ".rules-line", board: ".zone-grid", companion: ".strip", undo: '[data-action="undo"]', power: ".power-btn" };

async function open(page, size, id, dpad) {
  if (size.standalone) await page.route(/\.css(\?.*)?$/, async (route) => {
    const res = await route.fetch();
    const body = (await res.text()).replace(/env\(\s*safe-area-inset-(top|bottom|left|right)\s*(,[^)]*)?\)/g, (_, s) => ({ top: size.inset[0], bottom: size.inset[1], left: 0, right: 0 })[s] + "px");
    await route.fulfill({ response: res, body, headers: { ...res.headers(), "content-type": "text/css" } });
  });
  await page.goto("/");
  await page.evaluate(({ k, p }) => { localStorage.clear(); localStorage.setItem(k, JSON.stringify(p)); }, { k: KEY, p: { ...fresh(), nickname: "Test Capy", starterChosen: true, tutorialSeen: true, music: false, rockIntroSeen: true, rocksReached: id > 20, completed: Array.from({ length: id - 1 }, (_, i) => i + 1), bonus: { v: 2, best: {}, legacy: null, spare: null, dpad, controlsSeen: true } } });
  await page.reload();
  await page.locator('.hub [data-action="enterPond"]').first().tap();
  await page.locator(CRATES.includes(id) ? ".crate-board" : ".zone-grid").waitFor();
  await page.waitForTimeout(200);
}
async function measure(page, size, sel) {
  return page.evaluate(({ top, bottom, sel }) => {
    const W = innerWidth, H = innerHeight, e = 0.5, bad = [];
    for (const [k, s] of Object.entries(sel)) {
      const el = document.querySelector(s);
      if (!el || el.closest("[hidden]") || !el.getClientRects().length) continue;
      const r = el.getBoundingClientRect();
      let c = { l: r.left, t: r.top, r: r.right, b: r.bottom };
      for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
        const st = getComputedStyle(a);
        if (st.overflowY !== "visible" || st.overflowX !== "visible") { const q = a.getBoundingClientRect(); c = { l: Math.max(c.l, q.left), t: Math.max(c.t, q.top), r: Math.min(c.r, q.right), b: Math.min(c.b, q.bottom) }; }
      }
      const clipped = c.l > r.left + e || c.t > r.top + e || c.r < r.right - e || c.b < r.bottom - e;
      const out = r.left < -e || r.top < top - e || r.right > W + e || r.bottom > H - bottom + e;
      if (clipped || out) bad.push(`${k} [${r.top.toFixed(1)}–${r.bottom.toFixed(1)}] of ${top}–${H - bottom}${clipped ? " clipped" : ""}`);
    }
    const scroll = document.documentElement.scrollHeight > H + 1 || document.documentElement.scrollWidth > W + 1 || [...document.querySelectorAll(".screen")].some((s) => s.scrollHeight > s.clientHeight + 1);
    if (scroll) bad.push("page scrolls");
    const sm = document.querySelector(".crate-showme:not([hidden])");
    if (sm) { const b = sm.querySelector("button").getBoundingClientRect(), t = sm.querySelector("span").getBoundingClientRect(); if (getComputedStyle(sm).display !== "flex" || !(b.top < t.bottom && b.left >= t.right - 1)) bad.push("Show me row not side by side"); }
    const cell = document.querySelector(".crate-cell,.zone-grid .cell")?.getBoundingClientRect().width;
    return { bad, cell };
  }, { top: size.inset[0], bottom: size.inset[1], sel });
}
async function toShowMe(page, id) {
  const sol = levels.find((l) => l.pond === id).solution;
  for (let k = 0; k < 3; k++) {
    for (const ch of sol.slice(0, 2)) await page.keyboard.press(ARROW[ch.toUpperCase()]);
    await page.locator('.bonus-controls [data-action="bonusRestart"]').tap();
  }
  await expect(page.locator(".crate-showme")).toBeVisible();
  await page.waitForTimeout(150);
}

for (const size of SIZES) {
  test.describe(`iPhone ${size.id}`, () => {
    test.use({ viewport: { width: size.w, height: size.h }, deviceScaleFactor: 3, serviceWorkers: "block" });
    for (const id of CRATES) for (const dpad of [false, true]) {
      test(`crate pond ${id}${dpad ? " (D-pad)" : " (swipe)"} fits, before and after Show me appears`, async ({ page }) => {
        await open(page, size, id, dpad);
        const a = await measure(page, size, CRATE_SEL);
        expect(a.bad, "plain").toEqual([]);
        expect(a.cell).toBeGreaterThanOrEqual(24);
        await toShowMe(page, id);
        const b = await measure(page, size, CRATE_SEL);
        expect(b.bad, "with Show me").toEqual([]);
        expect(b.cell).toBeGreaterThanOrEqual(24);
      });
    }
    test("boss pond 29 fits with every control visible", async ({ page }) => {
      await open(page, size, 29, false);
      const m = await measure(page, size, GAME_SEL);
      expect(m.bad).toEqual([]);
      expect(m.cell).toBeGreaterThanOrEqual(24);
    });
  });
}
test.describe("refit on resize", () => {
  test.use({ viewport: { width: 390, height: 664 }, deviceScaleFactor: 3, serviceWorkers: "block" });
  test("crate pond 10 shrinks for the Safari toolbar and returns to natural size when it hides", async ({ page }) => {
    await open(page, { inset: [0, 0] }, 10, false);
    await toShowMe(page, 10);
    expect((await measure(page, { inset: [0, 0] }, CRATE_SEL)).bad).toEqual([]);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(200);
    expect(await page.locator(".crate-wrap").evaluate((w) => w.style.width)).toBe("");
    expect((await measure(page, { inset: [0, 0] }, CRATE_SEL)).bad).toEqual([]);
    await page.setViewportSize({ width: 390, height: 664 });
    await page.waitForTimeout(200);
    expect((await measure(page, { inset: [0, 0] }, CRATE_SEL)).bad).toEqual([]);
  });
  test("boss 29 zone outlines follow the shrunk board", async ({ page }) => {
    await open(page, { inset: [0, 0] }, 29, false);
    await page.setViewportSize({ width: 390, height: 600 });
    await page.waitForTimeout(250);
    const r = await page.evaluate(() => { const g = document.querySelector(".zone-grid"), s = g.querySelector(".zone-outline"); return s && { grid: g.getBoundingClientRect().width, drawn: +s.getAttribute("width"), fit: document.querySelector(".screen").dataset.fit }; });
    expect(r).toBeTruthy();
    expect(r.fit).not.toBe("natural");
    expect(Math.abs(r.grid - r.drawn)).toBeLessThan(1.5);
  });
});
