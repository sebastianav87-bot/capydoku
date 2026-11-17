// v4.3 planning: can the seeded generator + no-guess proof + uniqueness oracle make 7x7..10x10 boards at target scores, and how fast?
// Usage: node scripts/feasibility-v43.mjs <n> <rocks> <seconds> <out.json>
import fs from "node:fs";
import { logic, enumerate } from "../core.js";
import { scoreBoard } from "../difficulty.js";
const [n, rocks, secs, out] = [Number(process.argv[2]), Number(process.argv[3]), Number(process.argv[4]), process.argv[5]];
const rnd = (() => { let a = (7430000 + n * 100 + rocks) >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })(), pick = (a) => a[Math.floor(rnd() * a.length)];
function candidate() {
  const seeds = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [seeds[i], seeds[j]] = [seeds[j], seeds[i]]; }
  for (let i = 1; i < n; i++) if (Math.abs(seeds[i] - seeds[i - 1]) <= 1) return null;
  const z = Array(n * n).fill(-1);
  seeds.forEach((c, r) => (z[r * n + c] = r));
  let left = n * n - n;
  while (left) {
    const edges = [];
    for (let i = 0; i < n * n; i++) {
      if (z[i] < 0) continue;
      const r = Math.floor(i / n), c = i % n;
      for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < n && cc >= 0 && cc < n && z[rr * n + cc] < 0) edges.push([rr * n + cc, z[i]]); }
    }
    const [i, x] = pick(edges); z[i] = x; left--;
  }
  for (let x = 0; x < n; x++) if (z.filter((v) => v === x).length < 2) return null;
  const sol = new Set(seeds.map((c, r) => r * n + c)), free = Array.from({ length: n * n }, (_, i) => i).filter((i) => !sol.has(i)), rk = [];
  while (rk.length < rocks) { const r = pick(free); if (!rk.includes(r)) rk.push(r); }
  return { n, zones: z, rocks: rk.sort((a, b) => a - b) };
}
// Uniqueness: stop at 2 solutions.
function unique(p) {
  let count = 0;
  const cols = new Set(), zones = new Set();
  (function dfs(r, prev) {
    if (count > 1) return;
    if (r === n) { count++; return; }
    for (let c = 0; c < n; c++) {
      const i = r * n + c, z = p.zones[i];
      if (cols.has(c) || zones.has(z) || p.rocks.includes(i) || Math.abs(c - prev) <= 1) continue;
      cols.add(c); zones.add(z); dfs(r + 1, c); cols.delete(c); zones.delete(z);
    }
  })(0, -99);
  return count === 1;
}
const t0 = Date.now(), scores = [], boards = [], seen = new Set();
let dupes = 0;
let tries = 0, cands = 0, proofOk = 0, uniq = 0, proofMs = 0, uniqMs = 0;
while (Date.now() - t0 < secs * 1000) {
  tries++;
  const p = candidate(); if (!p) continue; cands++;
  const sig = p.zones.join(",") + "|" + p.rocks.join(","); if (seen.has(sig)) { dupes++; continue; } seen.add(sig);
  let t = performance.now(); const ok = logic(p).ok; proofMs += performance.now() - t; if (!ok) continue; proofOk++;
  t = performance.now(); const u = unique(p); uniqMs += performance.now() - t; if (!u) continue; uniq++;
  const s = scoreBoard(p).score; scores.push(s); boards.push({ ...p, score: s, firstCapy: scoreBoard(p).stepsBeforeFirstCapy });
}
const el = (Date.now() - t0) / 1000;
scores.sort((a, b) => a - b);
const q = (f) => scores[Math.min(scores.length - 1, Math.floor(f * scores.length))];
const hist = {}; for (const s of scores) { const b = Math.floor(s / 50) * 50; hist[b] = (hist[b] || 0) + 1; }
// sanity: re-verify a sample with core.enumerate (independent full backtracker) — must be exactly 1 solution.
const sample = boards.slice(0, 20).every((p) => enumerate(p).length === 1);
const res = { n, rocks, seconds: el, tries, candidates: cands, duplicateCandidates: dupes, noGuess: proofOk, noGuessUnique: uniq, validPerSecond: +(uniq / el).toFixed(2), msPerCandidateProof: +(proofMs / cands).toFixed(3), msPerUniqCheck: +(uniqMs / Math.max(1, proofOk)).toFixed(3), scoreMin: scores[0], p10: q(0.1), p50: q(0.5), p90: q(0.9), p99: q(0.99), scoreMax: scores.at(-1), histogramBy50: hist, independentRecheckOk: sample };
fs.writeFileSync(out, JSON.stringify({ ...res, boards: boards.sort((a, b) => a.score - b.score) }));
console.log(JSON.stringify(res));
