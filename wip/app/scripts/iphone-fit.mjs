// v4.3.1 iPhone fit harness (WebKit + iPhone emulation). Usage:
//   node scripts/iphone-fit.mjs <label> [outDir]   → <outDir>/<label>/*.png + fit-<label>.json
// Modes: "tab" = Safari browser tab with toolbars (viewport height reduced, insets 0);
//        "standalone" = home-screen app, full height, safe-area insets simulated by rewriting env(safe-area-inset-*) in CSS.
import { webkit } from "@playwright/test";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fresh, KEY } from "../core.js";
const label = process.argv[2] || "before", out = path.resolve(process.argv[3] || "reports/v4.3.1/screens", label);
fs.mkdirSync(out, { recursive: true });
const PORT = 8766, base = `http://127.0.0.1:${PORT}/`;
export const SIZES = [
  { id: "se-tab", w: 375, h: 525, mode: "tab", inset: [0, 0] },            // 667 − 142 toolbars
  { id: "se-standalone", w: 375, h: 667, mode: "standalone", inset: [20, 0] }, // SE: status bar, no home indicator
  { id: "390-tab", w: 390, h: 664, mode: "tab", inset: [0, 0] },           // Sebastián's case: 844 with bottom URL bar
  { id: "390-tab-694", w: 390, h: 694, mode: "tab", inset: [0, 0] },       // 844 − 150
  { id: "390-standalone", w: 390, h: 844, mode: "standalone", inset: [47, 34] },
  { id: "393-tab", w: 393, h: 702, mode: "tab", inset: [0, 0] },
  { id: "393-standalone", w: 393, h: 852, mode: "standalone", inset: [59, 34] },
  { id: "430-tab", w: 430, h: 782, mode: "tab", inset: [0, 0] },
  { id: "430-standalone", w: 430, h: 932, mode: "standalone", inset: [59, 34] },
];
const PONDS = [5, 10, 15, 20, 25, 30, 29, 7];
const CRATES = [5, 10, 15, 20, 25, 30];
const only = process.env.ONLY ? process.env.ONLY.split(",") : null;
const server = spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 700));
const crates = JSON.parse(fs.readFileSync("crate-levels.json")).levels ?? JSON.parse(fs.readFileSync("crate-levels.json"));
const KEYS = { U: "ArrowUp", D: "ArrowDown", L: "ArrowLeft", R: "ArrowRight", u: "ArrowUp", d: "ArrowDown", l: "ArrowLeft", r: "ArrowRight" };
const browser = await webkit.launch();
const results = [];
async function measure(page, size, kind) {
  return page.evaluate(({ top, bottom, kind }) => {
    const W = innerWidth, H = innerHeight, vis = { l: 0, t: top, r: W, b: H - bottom };
    const crate = kind === "crate";
    const sel = crate
      ? { header: ".bonus-header", leave: ".bonus-header .leave", restartTop: '.bonus-header [data-action="bonusRestart"]', stats: ".bonus-stats", board: ".crate-board", packed: ".crate-packed-pill", hint: ".bonus-hint", showme: ".crate-showme", showmeBtn: '[data-action="bonusShowMe"]', undo: '.bonus-controls [data-action="bonusUndo"]', restart: '.bonus-controls [data-action="bonusRestart"]', dpad: ".bonus-dpad", capyChip: ".bonus-capy-chip", lilies: ".bonus-leave-card" }
      : { header: ".topbar", back: ".topbar .level-pill", lives: ".lives", rules: ".rules-line", board: ".zone-grid", companion: ".strip", undo: '[data-action="undo"]', power: ".power-btn" };
    const clipRect = (el) => { let r = el.getBoundingClientRect(), c = { l: r.left, t: r.top, r: r.right, b: r.bottom }; for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) { const s = getComputedStyle(a); if (s.overflow !== "visible" || s.overflowY !== "visible") { const q = a.getBoundingClientRect(); c = { l: Math.max(c.l, q.left), t: Math.max(c.t, q.top), r: Math.min(c.r, q.right), b: Math.min(c.b, q.bottom) }; } } return c; };
    const items = {};
    for (const [k, s] of Object.entries(sel)) {
      const el = document.querySelector(s);
      if (!el || el.hidden || el.closest("[hidden]") || !el.getClientRects().length) continue;
      const r = el.getBoundingClientRect(), c = clipRect(el), e = 0.5;
      const unclipped = c.l <= r.left + e && c.t <= r.top + e && c.r >= r.right - e && c.b >= r.bottom - e;
      const inView = r.left >= vis.l - e && r.top >= vis.t - e && r.right <= vis.r + e && r.bottom <= vis.b + e;
      items[k] = { top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1), left: +r.left.toFixed(1), right: +r.right.toFixed(1), h: +r.height.toFixed(1), unclipped, inView, ok: unclipped && inView };
    }
    const board = document.querySelector(crate ? ".crate-board" : ".zone-grid"), n = +(board?.style.getPropertyValue("--n") || document.querySelector(".pond-wrap")?.dataset.n || 0);
    const cell = document.querySelector(crate ? ".crate-cell" : ".cell")?.getBoundingClientRect();
    const scr = document.querySelector(".screen,.crate-screen,.game");
    const noScroll = document.documentElement.scrollHeight <= H + 1 && document.documentElement.scrollWidth <= W + 1 && [...document.querySelectorAll(".screen")].every((s) => s.scrollHeight <= s.clientHeight + 1);
    // the showme row is "broken" if its text and button do not sit side by side inside a styled card
    const sm = document.querySelector(".crate-showme:not([hidden])");
    let showmeLayout = null;
    if (sm) { const s = getComputedStyle(sm), b = sm.querySelector("button").getBoundingClientRect(), t = sm.querySelector("span").getBoundingClientRect(); showmeLayout = { display: s.display, padding: s.paddingLeft, border: s.borderTopWidth, sideBySide: b.top < t.bottom && b.left >= t.right - 1 }; }
    const failed = Object.entries(items).filter(([, v]) => !v.ok).map(([k]) => k);
    if (showmeLayout && !(showmeLayout.display === "flex" && showmeLayout.sideBySide)) failed.push("showme-layout");
    if (!noScroll) failed.push("page-scroll");
    return { W, H, insets: [top, bottom], fitMode: document.querySelector(".screen")?.dataset.fit || null, n, cellPx: cell ? +cell.width.toFixed(2) : null, noScroll, showmeLayout, items, failed, fits: failed.length === 0 };
  }, { top: size.inset[0], bottom: size.inset[1], kind });
}
for (const size of SIZES) {
  if (only && !only.includes(size.id)) continue;
  const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, serviceWorkers: "block", locale: "en-US", timezoneId: "America/New_York",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" });
  if (size.mode === "standalone") await ctx.route(/\.css(\?.*)?$/, async (route) => {
    const res = await route.fetch(); let body = await res.text();
    body = body.replace(/env\(\s*safe-area-inset-(top|bottom|left|right)\s*(,[^)]*)?\)/g, (_, side) => ({ top: size.inset[0], bottom: size.inset[1], left: 0, right: 0 }[side] + "px"));
    await route.fulfill({ response: res, body, headers: { ...res.headers(), "content-type": "text/css" } });
  });
  const page = await ctx.newPage();
  for (const id of PONDS) {
    const crate = CRATES.includes(id);
    for (const state of crate ? ["plain", "showme", "dpad-showme"] : ["plain"]) {
      await page.goto(base);
      await page.evaluate(({ k, p }) => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem(k, JSON.stringify(p)); }, { k: KEY, p: { ...fresh(), nickname: "Test Capy", starterChosen: true, tutorialSeen: true, music: false, rockIntroSeen: true, rocksReached: id > 20, completed: Array.from({ length: id - 1 }, (_, i) => i + 1), bonus: { v: 2, best: {}, legacy: null, spare: null, dpad: state === "dpad-showme", controlsSeen: true } } });
      await page.reload();
      await page.locator('.hub [data-action="enterPond"]').first().tap();
      await page.locator(crate ? ".crate-board" : ".zone-grid").waitFor();
      await page.waitForTimeout(250);
      if (state !== "plain") {
        const sol = (crates.find?.((c) => c.pond === id || c.id === id) || crates[id])?.solution || "RRDD";
        for (let k = 0; k < 3; k++) { for (const ch of sol.slice(0, 2)) await page.keyboard.press(KEYS[ch] || "ArrowRight"); await page.locator('.bonus-controls [data-action="bonusRestart"]').tap(); await page.waitForTimeout(120); }
        await page.locator(".crate-showme").waitFor({ state: "attached" });
        await page.waitForTimeout(250);
      }
      const m = await measure(page, size, crate ? "crate" : "game");
      const name = `${size.id}-p${id}-${state}`;
      if (state !== "plain" || !crate) {
        await page.screenshot({ path: path.join(out, name + ".png") });
        if (size.mode === "standalone") await page.evaluate(([t, b]) => { for (const [y, h] of [[0, t], [innerHeight - b, b]]) { if (!h) continue; const d = document.createElement("div"); d.className = "__inset"; d.style.cssText = `position:fixed;left:0;right:0;top:${y}px;height:${h}px;background:#0005;z-index:99999;pointer-events:none`; document.body.append(d); } }, size.inset);
        if (size.mode === "standalone") { await page.screenshot({ path: path.join(out, name + ".png") }); await page.evaluate(() => document.querySelectorAll(".__inset").forEach((d) => d.remove())); }
      }
      results.push({ size: size.id, w: size.w, h: size.h, mode: size.mode, pond: id, state, ...m });
      console.log(name, m.fits ? "FITS" : "FAIL " + m.failed.join(","), "cell", m.cellPx);
    }
  }
  await ctx.close();
}
await browser.close(); server.kill();
fs.writeFileSync(path.resolve("reports/v4.3.1", `fit-${label}.json`), JSON.stringify({ label, engine: "Playwright WebKit (iPhone emulation, DPR 3)", generated: new Date().toString(), results }, null, 1));
const bad = results.filter((r) => !r.fits);
console.log(`${results.length - bad.length}/${results.length} fit`);
