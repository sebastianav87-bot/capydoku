// v4.3 planning: dry-run pick of all 24 logic ponds from the measured local-search pools (no app data written).
import fs from "node:fs";
import { logic, enumerate } from "../core.js";
import { scoreBoard } from "../difficulty.js";
const F = new URL("../reports/v4.3/feasibility/", import.meta.url), pool = (f) => JSON.parse(fs.readFileSync(new URL(f, F))).boards;
const pools = { "7r0": pool("climb-7-r0.json"), "8r0": pool("climb-8-r0.json"), "9r0": pool("climb-9-r0.json"), "9r2": pool("climb-9-r2.json"), "10r2": pool("climb-10-r2.json"), "8r1": pool("climb-8-r1.json") };
export const PLAN = [
  [1, 7, 0, "normal", 55], [2, 7, 0, "normal", 110], [3, 7, 0, "normal", 150], [4, 7, 0, "normal", 210], [5, 0, 0, "crate", null],
  [6, 8, 0, "normal", 260], [7, 8, 0, "normal", 320], [8, 8, 0, "normal", 380], [9, 8, 0, "boss", 450], [10, 0, 0, "crate", null],
  [11, 8, 0, "breather", 250], [12, 8, 0, "normal", 350], [13, 8, 0, "normal", 420], [14, 9, 0, "normal", 480], [15, 0, 0, "crate", null],
  [16, 9, 0, "normal", 530], [17, 9, 0, "normal", 590], [18, 9, 0, "normal", 650], [19, 9, 0, "boss", 720], [20, 0, 0, "crate", null],
  [21, 9, 2, "breather", 450], [22, 9, 2, "normal", 560], [23, 9, 2, "normal", 640], [24, 9, 2, "normal", 720], [25, 0, 0, "crate", null],
  [26, 9, 2, "normal", 780], [27, 9, 2, "normal", 840], [28, 9, 2, "normal", 900], [29, 9, 2, "boss", 1000], [30, 0, 0, "crate", null],
];
const used = new Set(), rows = [];
let prev = -1;
for (const [id, n, rocks, role, target] of PLAN) {
  if (role === "crate") { rows.push({ id, role }); continue; }
  if (role === "breather") prev = -1;
  const P = pools[`${n}r${rocks}`].filter((b) => !used.has(b.zones.join()) && b.score >= prev && b.minZone >= 2);
  P.sort((a, b) => Math.abs(a.score - target) - Math.abs(b.score - target));
  const b = P[0], ok = logic(b).ok && enumerate(b).length === 1;
  used.add(b.zones.join()); prev = b.score;
  rows.push({ id, role, n, rocks, target, picked: b.score, devPct: +((100 * (b.score - target)) / target).toFixed(1), noGuessUnique: ok, candidatesWithin10pct: pools[`${n}r${rocks}`].filter((x) => Math.abs(x.score - target) <= target * 0.1).length });
}
fs.writeFileSync(new URL("../reports/v4.3/feasibility/plan-pick-dryrun.json", import.meta.url), JSON.stringify(rows, null, 1));
console.table(rows);
