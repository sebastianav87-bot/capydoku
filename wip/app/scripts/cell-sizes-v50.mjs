// v5.0 cell-size harness: logic-board cell px (and whether the screen fits without scrolling) at the WebKit iPhone sizes
// (tab + standalone) and Chromium 360×780 / 412×915. Usage: node scripts/cell-sizes-v50.mjs <appDir> <label> <port> [ponds]
// Run once on the v4.3.1 backup ("before") and once on v5.0 ("after"); both use the same world-1 ponds (same boards).
import { webkit, chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const [appDir, label, port = "8770", pondsArg = "7,17,29"] = process.argv.slice(2);
const { fresh, KEY } = await import(path.resolve(appDir, "core.js"));
const out = path.resolve("reports/v5.0/fit", label);
fs.mkdirSync(out, { recursive: true });
const SIZES = [
  { id: "se-tab", w: 375, h: 525, engine: "webkit", inset: [0, 0] },
  { id: "se-standalone", w: 375, h: 667, engine: "webkit", inset: [20, 0] },
  { id: "390-tab", w: 390, h: 664, engine: "webkit", inset: [0, 0] },
  { id: "390-tab-694", w: 390, h: 694, engine: "webkit", inset: [0, 0] },
  { id: "390-standalone", w: 390, h: 844, engine: "webkit", inset: [47, 34] },
  { id: "393-tab", w: 393, h: 702, engine: "webkit", inset: [0, 0] },
  { id: "393-standalone", w: 393, h: 852, engine: "webkit", inset: [59, 34] },
  { id: "430-tab", w: 430, h: 782, engine: "webkit", inset: [0, 0] },
  { id: "430-standalone", w: 430, h: 932, engine: "webkit", inset: [59, 34] },
  { id: "chromium-360", w: 360, h: 780, engine: "chromium", inset: [0, 0] },
  { id: "chromium-412", w: 412, h: 915, engine: "chromium", inset: [0, 0] },
];
const PONDS = pondsArg.split(",").map(Number);
const server = spawn("python3", ["-m", "http.server", port, "--bind", "127.0.0.1"], { cwd: appDir, stdio: "ignore" });
await new Promise((r) => setTimeout(r, 700));
const base = `http://127.0.0.1:${port}/`, results = [];
for (const engine of ["webkit", "chromium"]) {
  const browser = await (engine === "webkit" ? webkit : chromium).launch(engine === "chromium" ? { args: ["--no-sandbox"] } : {});
  for (const size of SIZES.filter((s) => s.engine === engine)) {
    const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h }, deviceScaleFactor: engine === "webkit" ? 3 : 1, isMobile: true, hasTouch: true, serviceWorkers: "block", locale: "en-US", timezoneId: "America/New_York",
      ...(engine === "webkit" ? { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" } : {}) });
    if (size.inset[0] || size.inset[1]) await ctx.route(/\.css(\?.*)?$/, async (route) => {
      const res = await route.fetch(); let body = await res.text();
      body = body.replace(/env\(\s*safe-area-inset-(top|bottom|left|right)\s*(,[^)]*)?\)/g, (_, side) => ({ top: size.inset[0], bottom: size.inset[1], left: 0, right: 0 }[side] + "px"));
      await route.fulfill({ response: res, body, headers: { ...res.headers(), "content-type": "text/css" } });
    });
    const page = await ctx.newPage();
    for (const id of PONDS) {
      await page.goto(base);
      await page.evaluate(({ k, p }) => { localStorage.clear(); localStorage.setItem(k, JSON.stringify(p)); }, { k: KEY, p: { ...fresh(), nickname: "Test Capy", starterChosen: true, tutorialSeen: true, music: false, rockIntroSeen: true, rocksReached: id > 20, completed: Array.from({ length: id - 1 }, (_, i) => i + 1), worldsShown: [0, 1, 2, 3, 4], bonus: { v: 2, best: {}, legacy: null, spare: null, dpad: false, controlsSeen: true } } });
      await page.reload();
      const enter = page.locator('[data-action="enterPond"]').first();
      if (await enter.count()) await enter.tap();
      await page.locator(".zone-grid").waitFor();
      await page.waitForTimeout(300);
      const m = await page.evaluate(({ top, bottom }) => {
        const H = innerHeight, cell = document.querySelector(".zone-grid .cell").getBoundingClientRect(), grid = document.querySelector(".zone-grid").getBoundingClientRect();
        const ctrls = [...document.querySelectorAll('[data-action="undo"],.power-btn,.tool-btn')].map((e) => e.getBoundingClientRect());
        const lowest = Math.max(grid.bottom, ...ctrls.map((r) => r.bottom));
        const noScroll = [...document.querySelectorAll(".screen")].every((s) => s.scrollHeight <= s.clientHeight + 1) && document.documentElement.scrollHeight <= H + 1;
        return { n: +document.querySelector(".pond-wrap").dataset.n, cellPx: +cell.width.toFixed(2), boardPx: +grid.width.toFixed(1), fitMode: document.querySelector(".screen")?.dataset.fit || null, controlsInView: lowest <= H - bottom + 0.5 && grid.top >= top - 0.5, noScroll, thumbBarTop: ctrls.length ? +Math.min(...ctrls.map((r) => r.top)).toFixed(1) : null };
      }, { top: size.inset[0], bottom: size.inset[1] });
      await page.screenshot({ path: path.join(out, `${size.id}-p${id}.png`) });
      results.push({ size: size.id, engine, w: size.w, h: size.h, pond: id, ...m });
      console.log(size.id, id, JSON.stringify(m));
    }
    await ctx.close();
  }
  await browser.close();
}
server.kill();
fs.writeFileSync(path.resolve("reports/v5.0/fit", `cells-${label}.json`), JSON.stringify({ label, appDir, generated: new Date().toString(), results }, null, 1));
