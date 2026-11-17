// v5.0: writes levels.json with 150 ponds (5 worlds × 30). World 1 (ponds 1–30) is copied byte-for-byte from v4.3.1
// so saves keep their meaning; worlds 2–5 come from the local-search pools (reports/v4.3/pools + reports/v5.0/pools).
// Every new board is re-checked: no-guess logic() + exactly one solution, never reused (also vs. Daily boards).
// Difficulty ramp is measured by more than size: score, deepest technique rank, forced share (rank-1 steps / all steps, must fall),
// steps before the first capy, rocks and zone twist (share of adjacent cell pairs that cross a zone border, must rise).
import fs from "node:fs";
import { logic, enumerate } from "../core.js";
import { scoreBoard } from "../difficulty.js";
import { role, isCrate, worldOf } from "../roles.js";
const R = (f) => new URL(`../${f}`, import.meta.url);
const pools = {};
for (const dir of ["reports/v4.3/pools", "reports/v5.0/pools"])
  for (const f of fs.readdirSync(R(dir)).filter((f) => /^pool-\d+-r\d+(-s\d+)?\.json$/.test(f))) {
    const k = f.match(/^pool-(\d+-r\d+)/)[1];
    (pools[k] ||= []).push(...JSON.parse(fs.readFileSync(R(`${dir}/${f}`))).boards);
  }
const crates = Object.fromEntries(JSON.parse(fs.readFileSync(R("crate-levels.json"))).levels.map((l) => [l.pond, l]));
// Keyed by 0-based world index (1 = World 2 … 4 = World 5). Per world: [n, rocks] for each of the 30 slots (crate slots = null), plus normal-pond score band and boss targets.
const S = (s) => s.split(" ").map((t) => (t === "C" ? null : t.split("r").map(Number)));
export const WORLD_PLAN = {
  1: { slots: S("8r1 8r1 8r1 9r1 C 9r2 9r2 9r3 9r3 C 9r1 9r2 9r3 10r2 C 10r2 9r3 10r2 10r2 C 9r2 10r2 9r3 10r3 C 10r2 10r3 10r3 10r3 C"), band: [480, 860], boss: [840, 960, 1060] },
  2: { slots: S("9r2 9r2 10r2 9r3 C 10r3 10r2 9r3 10r3 C 9r2 10r3 9r3 10r3 C 10r3 10r2 10r3 10r3 C 9r3 10r3 10r3 10r3 C 10r3 10r3 10r3 10r3 C"), band: [560, 920], boss: [920, 1040, 1140] },
  3: { slots: S("9r3 9r3 10r3 9r4 C 10r3 10r4 9r4 10r4 C 9r3 10r4 9r4 10r4 C 10r3 10r4 10r4 10r4 C 9r4 10r4 10r4 10r4 C 10r4 10r4 10r3 10r4 C"), band: [640, 1020], boss: [1000, 1120, 1220] },
  4: { slots: S("10r3 10r4 10r4 9r4 C 10r4 10r5 10r4 10r4 C 10r4 10r5 10r4 10r5 C 10r4 10r5 10r5 10r5 C 10r4 10r5 10r5 10r5 C 10r5 10r4 10r5 10r5 C"), band: [700, 1080], boss: [1100, 1220, 1320] },
};
const old = JSON.parse(fs.readFileSync(R("levels.json")));
if (old.levels.length !== 30 && old.contentVersion !== "5.0") throw Error("expected the v4.3.1 levels.json");
const world1 = old.levels.slice(0, 30);
const key = (b) => `${b.n}|${b.zones.join("")}|${[...b.rocks].sort((x, y) => x - y).join(",")}`;
const used = new Set([...world1, ...old.daily, ...old.dailySafe].filter((b) => b.zones?.length).map(key));
const good = (b) => b.minZone >= 2 && logic(b).ok && enumerate(b).length === 1;
export function twist(b) {
  let cross = 0, all = 0;
  const n = b.n, rock = new Set(b.rocks);
  for (let i = 0; i < n * n; i++) for (const j of [i % n < n - 1 ? i + 1 : -1, i + n < n * n ? i + n : -1]) if (j >= 0 && !rock.has(i) && !rock.has(j)) { all++; if (b.zones[i] !== b.zones[j]) cross++; }
  return cross / all;
}
export function metrics(b) {
  const s = scoreBoard(b), steps = s.trace.length, forced = s.trace.filter((t) => t.rank === 1).length;
  return { score: s.score, deepest: s.deepestRank, forcedShare: +(forced / steps).toFixed(3), rank3: s.commonConflictSteps, firstCapy: s.stepsBeforeFirstCapy, steps, rocks: b.rocks.length, twist: +twist(b).toFixed(3) };
}
const levels = [...world1], report = [];
for (let w = 1; w <= 4; w++) {
  const { slots, band, boss } = WORLD_PLAN[w];
  let prev = -1, normals = slots.filter((s, i) => s && role(w * 30 + i + 1) !== "boss" && role(w * 30 + i + 1) !== "breather").length, k = 0, bossK = 0;
  slots.forEach((slot, i) => {
    const id = w * 30 + i + 1, r = role(id);
    if (!slot) {
      if (!isCrate(id)) throw Error(`slot ${id}`);
      const c = crates[id];
      if (!c && process.env.DRY_CRATES) { levels.push({ n: 8, zones: [], rocks: [], id, crate: null }); report.push({ id, world: w + 1, role: r }); return; }
      if (!c) throw Error(`crate for pond ${id} missing in crate-levels.json`);
      levels.push({ n: c.n, zones: [], rocks: [], id, crate: c.id });
      report.push({ id, world: w + 1, role: r, n: c.n, optimalMoves: c.optimalMoves, par: c.par });
      return;
    }
    const [n, rocks] = slot;
    let target;
    if (r === "boss") target = boss[bossK++];
    else if (r === "breather") target = Math.round(band[0] * 0.8);
    else target = Math.round(band[0] + ((band[1] - band[0]) * k++) / Math.max(1, normals - 1));
    const floor = r === "breather" ? 0 : prev * 0.97;
    const P = (pools[`${n}-r${rocks}`] || []).filter((b) => !used.has(key(b)) && b.score >= floor && (r !== "boss" || b.deepest === 3));
    P.sort((a, b) => Math.abs(a.score - target) - Math.abs(b.score - target));
    // among the boards closest to the target (±6 %, at least the nearest 12), take the one with the fewest forced steps
    const near = P.filter((b, j) => j < 12 || Math.abs(b.score - target) <= target * 0.06).slice(0, 40);
    const cands = near.filter(good).map((b) => ({ b, m: metrics(b) }));
    if (!cands.length) throw Error(`no board for pond ${id} (${n}r${rocks}, pool ${P.length})`);
    cands.sort((a, b) => a.m.forcedShare - b.m.forcedShare - (a.m.twist - b.m.twist) * 0.5 + (Math.abs(a.b.score - target) - Math.abs(b.b.score - target)) / target);
    const { b, m } = cands[0];
    used.add(key(b));
    if (r !== "breather") prev = b.score;
    levels.push({ n, zones: b.zones, rocks: [...b.rocks].sort((x, y) => x - y), id });
    report.push({ id, world: w + 1, role: r, n, target, devPct: +((100 * (b.score - target)) / target).toFixed(1), ...m });
  });
}
for (const L of world1) report.unshift({ id: L.id, world: 1, role: role(L.id), n: L.n, ...(L.crate ? { optimalMoves: crates[L.id]?.optimalMoves, par: crates[L.id]?.par } : metrics(L)) });
report.sort((a, b) => a.id - b.id);
if (levels.length !== 150 || levels.some((L, i) => L.id !== i + 1)) throw Error("150 ponds in order expected");
const out = { ...old, levels, contentVersion: "5.0" };
if (!process.env.DRY_CRATES) fs.writeFileSync(R("levels.json"), JSON.stringify(out));
else fs.writeFileSync(R("reports/v5.0/levels-dry.json"), JSON.stringify(out));
fs.writeFileSync(R("reports/v5.0/levels-pick.json"), JSON.stringify({ report }, null, 1));
const worlds = [1, 2, 3, 4, 5].map((w) => {
  const L = report.filter((r) => r.world === w && r.score !== undefined), C = report.filter((r) => r.world === w && r.optimalMoves !== undefined), avg = (f, a = L) => +(a.reduce((s, r) => s + f(r), 0) / a.length).toFixed(3);
  return { world: w, logic: L.length, sizes: [...new Set(L.map((r) => r.n))].join("/"), score: avg((r) => r.score), bossScores: L.filter((r) => r.role === "boss").map((r) => r.score).join(","), deepest3: L.filter((r) => r.deepest === 3).length, forcedShare: avg((r) => r.forcedShare), rank3Steps: avg((r) => r.rank3), firstCapy: avg((r) => r.firstCapy), rocks: avg((r) => r.rocks), twist: avg((r) => r.twist), crateMoves: C.map((r) => r.optimalMoves).join(",") };
});
fs.writeFileSync(R("reports/v5.0/world-ramp.json"), JSON.stringify(worlds, null, 1));
console.table(worlds);
