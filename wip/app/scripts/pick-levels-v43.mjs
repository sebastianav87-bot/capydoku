// v4.3: writes levels.json from the local-search pools in reports/v4.3/pools/ (24 logic ponds + 6 crate slots,
// 365 Daily + 365 Daily-safe boards at 7×7/8×8). Every picked board is re-checked: no-guess logic() + exactly 1 solution.
import fs from "node:fs";
import { logic, enumerate } from "../core.js";
const R = (f) => new URL(`../${f}`, import.meta.url);
const pool = (k) => JSON.parse(fs.readFileSync(R(`reports/v4.3/pools/pool-${k}.json`))).boards;
const crates = Object.fromEntries(JSON.parse(fs.readFileSync(R("crate-levels.json"))).levels.map((l) => [l.pond, l]));
// [id, n, rocks, role, target score] — PLAN.md (confirmed Nov 15): 7→8→9 ramp, world 3 rocks vary 1–3, boss 29 = 10×10 · 2 rocks.
export const PLAN = [
  [1, 7, 0, "normal", 55], [2, 7, 0, "normal", 110], [3, 7, 0, "normal", 150], [4, 7, 0, "normal", 210], [5, 0, 0, "crate"],
  [6, 8, 0, "normal", 260], [7, 8, 0, "normal", 320], [8, 8, 0, "normal", 380], [9, 8, 0, "boss", 450], [10, 0, 0, "gate"],
  [11, 8, 0, "breather", 250], [12, 8, 0, "normal", 350], [13, 8, 0, "normal", 420], [14, 9, 0, "normal", 480], [15, 0, 0, "crate"],
  [16, 9, 0, "normal", 530], [17, 9, 0, "normal", 590], [18, 9, 0, "normal", 650], [19, 9, 0, "boss", 720], [20, 0, 0, "gate"],
  [21, 9, 1, "breather", 450], [22, 9, 2, "normal", 560], [23, 9, 1, "normal", 640], [24, 9, 3, "normal", 720], [25, 0, 0, "crate"],
  [26, 9, 2, "normal", 780], [27, 9, 3, "normal", 840], [28, 9, 2, "normal", 900], [29, 10, 2, "boss", 1000], [30, 0, 0, "gate"],
];
const used = new Set(), key = (b) => `${b.n}|${b.zones.join("")}|${b.rocks.join(",")}`;
const good = (b) => b.minZone >= 2 && logic(b).ok && enumerate(b).length === 1;
const levels = [], report = [];
let prev = -1;
for (const [id, n, rocks, role, target] of PLAN) {
  if (role === "crate" || role === "gate") {
    const c = crates[id];
    levels.push({ n: c.n, zones: [], rocks: [], id, crate: c.id });
    report.push({ id, role, n: c.n, optimalMoves: c.optimalMoves, par: c.par });
    continue;
  }
  if (role === "breather") prev = -1;
  const P = pool(`${n}-r${rocks}`).filter((b) => !used.has(key(b)) && b.score >= prev).sort((a, b) => Math.abs(a.score - target) - Math.abs(b.score - target));
  const b = P.find(good);
  if (!b) throw Error(`no board for pond ${id}`);
  used.add(key(b));
  prev = b.score;
  levels.push({ n, zones: b.zones, rocks: [...b.rocks].sort((x, y) => x - y), id });
  report.push({ id, role, n, rocks, target, score: b.score, devPct: +((100 * (b.score - target)) / target).toFixed(1), firstCapy: b.firstCapy, deepest: b.deepest });
}
// Daily: every 3rd day is the bigger board (8×8; with 1 rock once rocks are unlocked), other days 7×7 (shared with the safe pool).
function dailyFrom(k, need, lo, hi, mid) {
  const out = [];
  for (const b of pool(k).filter((b) => b.score >= lo && b.score <= hi && !used.has(key(b))).sort((a, b) => Math.abs(a.score - mid) - Math.abs(b.score - mid))) {
    if (out.length >= need) break;
    if (!good(b)) continue;
    used.add(key(b));
    out.push(b);
  }
  if (out.length < need) throw Error(`daily pool ${k}: ${out.length}/${need}`);
  return out;
}
const big = 122, small = 243,
  s7 = dailyFrom("7-r0", small, 80, 320, 170), s8 = dailyFrom("8-r0", big, 150, 450, 290), r8 = dailyFrom("8-r1", big, 150, 450, 290);
const daily = [], dailySafe = [];
for (let i = 0, a = 0, c = 0; i < 365; i++) {
  if (i % 3 === 0) {
    daily.push({ n: 8, zones: r8[c].zones, rocks: [...r8[c].rocks].sort((x, y) => x - y), id: i });
    dailySafe.push({ n: 8, zones: s8[c].zones, rocks: [], id: i });
    c++;
  } else {
    const b = { n: 7, zones: s7[a].zones, rocks: [], id: i };
    daily.push(b);
    dailySafe.push({ ...b });
    a++;
  }
}
const old = JSON.parse(fs.readFileSync(R("levels.json")));
const out = { ...old, levels, daily, dailySafe, v1Preserved: [], contentVersion: "4.3" };
fs.writeFileSync(R("levels.json"), JSON.stringify(out));
fs.writeFileSync(R("reports/v4.3/levels-pick.json"), JSON.stringify({ report, daily: { "7r0": s7.map((b) => b.score), "8r0": s8.map((b) => b.score), "8r1": r8.map((b) => b.score) } }, null, 1));
console.table(report);
