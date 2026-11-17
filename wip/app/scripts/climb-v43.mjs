// v4.3 planning: local-search generator for 8x8..10x10. Plant a no-touch permutation, grow zones, then move single
// border cells between zones (zones stay connected, >=2 cells, planted capy stays in its zone) while the no-guess
// proof gets further. Accept only boards where core.logic proves all n capys AND core.enumerate finds exactly 1 solution.
// Usage: node scripts/climb-v43.mjs <n> <rocks> <seconds> <out.json> [seed]
import fs from "node:fs";
import { logic, enumerate } from "../core.js";
import { scoreBoard } from "../difficulty.js";
const [n, rocks, secs, out, seed0] = [Number(process.argv[2]), Number(process.argv[3]), Number(process.argv[4]), process.argv[5], Number(process.argv[6] || 1)];
const rnd = (() => { let a = (743 * n + 17 * rocks + seed0) >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
const pick = (a) => a[Math.floor(rnd() * a.length)], N = n * n, nb = (i) => { const r = Math.floor(i / n), c = i % n, o = []; if (r) o.push(i - n); if (r < n - 1) o.push(i + n); if (c) o.push(i - 1); if (c < n - 1) o.push(i + 1); return o; };
function plant() {
  for (;;) {
    const s = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [s[i], s[j]] = [s[j], s[i]]; }
    if (s.every((c, r) => !r || Math.abs(c - s[r - 1]) > 1)) return s.map((c, r) => r * n + c);
  }
}
function grow(sol) {
  const z = Array(N).fill(-1); sol.forEach((i, k) => (z[i] = k)); let left = N - n;
  while (left) { const e = []; for (let i = 0; i < N; i++) if (z[i] >= 0) for (const j of nb(i)) if (z[j] < 0) e.push([j, z[i]]); const [j, x] = pick(e); z[j] = x; left--; }
  return z;
}
function connectedWithout(z, zone, cut) {
  const cells = []; for (let i = 0; i < N; i++) if (z[i] === zone && i !== cut) cells.push(i);
  if (cells.length < 2) return false;
  const seen = new Set([cells[0]]), q = [cells[0]];
  while (q.length) { const i = q.pop(); for (const j of nb(i)) if (j !== cut && z[j] === zone && !seen.has(j)) { seen.add(j); q.push(j); } }
  return seen.size === cells.length;
}
const progress = (p) => { const r = logic(p); return r.ok ? 1e6 : r.fixed.length * 1000 + r.trace.length; };
const t0 = Date.now(), boards = [], seen = new Set(); let restarts = 0, steps = 0;
const timeToFirst = [];
let tStart = Date.now();
while (Date.now() - t0 < secs * 1000) {
  restarts++;
  const sol = plant(), solSet = new Set(sol), free = Array.from({ length: N }, (_, i) => i).filter((i) => !solSet.has(i)), rk = [];
  while (rk.length < rocks) { const r = pick(free); if (!rk.includes(r)) rk.push(r); }
  const p = { n, zones: grow(sol), rocks: rk.sort((a, b) => a - b) };
  let cur = progress(p), stale = 0;
  while (cur < 1e6 && stale < 400 && Date.now() - t0 < secs * 1000) {
    steps++;
    const i = Math.floor(rnd() * N); if (solSet.has(i)) continue;
    const opts = nb(i).filter((j) => p.zones[j] !== p.zones[i]); if (!opts.length) continue;
    const to = p.zones[pick(opts)], from = p.zones[i];
    if (!connectedWithout(p.zones, from, i)) continue;
    p.zones[i] = to; const v = progress(p);
    if (v >= cur) { if (v > cur) stale = 0; else stale++; cur = v; } else { p.zones[i] = from; stale++; }
  }
  if (cur < 1e6) continue;
  const sig = p.zones.join(",") + "|" + p.rocks.join(",");
  if (seen.has(sig) || enumerate(p).length !== 1) continue;
  seen.add(sig);
  const a = scoreBoard(p);
  boards.push({ n, zones: [...p.zones], rocks: [...p.rocks], score: a.score, firstCapy: a.stepsBeforeFirstCapy, deepest: a.deepestRank, minZone: Math.min(...Array.from({ length: n }, (_, k) => p.zones.filter((x) => x === k).length)) });
  timeToFirst.push(Date.now() - tStart); tStart = Date.now();
}
const el = (Date.now() - t0) / 1000, sc = boards.map((b) => b.score).sort((a, b) => a - b), q = (f) => sc[Math.min(sc.length - 1, Math.floor(f * sc.length))];
const hist = {}; for (const s of sc) { const b = Math.floor(s / 50) * 50; hist[b] = (hist[b] || 0) + 1; }
const res = { generator: "local-search", n, rocks, seconds: el, restarts, mutationSteps: steps, boards: boards.length, boardsPerMinute: +((boards.length / el) * 60).toFixed(1), meanSecondsPerBoard: +(el / Math.max(1, boards.length)).toFixed(2), scoreMin: sc[0], p10: q(0.1), p50: q(0.5), p90: q(0.9), scoreMax: sc.at(-1), histogramBy50: hist };
fs.writeFileSync(out, JSON.stringify({ ...res, boards: boards.sort((a, b) => a.score - b.score) }));
console.log(JSON.stringify(res));
