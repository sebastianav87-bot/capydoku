// v5.0: seeded crate-pond generator. For a random room (rocks + 3 fruit) a reverse BFS over walks and pulls from every
// solved position gives each state's exact optimal move count; the deepest state (no crate on fruit) is the start.
// The forward BFS (crates.js solveCrates) must agree on the optimal move count. Final picks are re-verified with the Designer
// solver.py + analyze.py (silent traps) and scripts/deadlock-audit.mjs (hint false alarms).
// Usage: node scripts/gen-crates-v50.mjs <n> <rocksMin> <rocksMax> <seconds> <seed> <out.json> [minMoves]
import fs from "node:fs";
import { parseLevel, solveCrates } from "../crates.js";
const [n, rMin, rMax, secs, seed0] = process.argv.slice(2, 7).map(Number), out = process.argv[7], minMoves = Number(process.argv[8] || 50);
let seed = seed0 >>> 0;
const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const N = n * n, D = [-n, n, -1, 1], ok = (i, d) => (d === -1 ? i % n > 0 : d === 1 ? i % n < n - 1 : d === -n ? i >= n : i < N - n);
const t0 = Date.now(), seen = new Set(), found = [];
let tries = 0;
const dist = new Int16Array(N * N * N * N).fill(-1), touched = [];
while (Date.now() - t0 < secs * 1000) {
  tries++;
  const k = rMin + Math.floor(rnd() * (rMax - rMin + 1)), rock = new Uint8Array(N);
  for (let placed = 0; placed < k; ) { const i = Math.floor(rnd() * N); if (!rock[i]) { rock[i] = 1; placed++; } }
  const floor = []; for (let i = 0; i < N; i++) if (!rock[i]) floor.push(i);
  // floor must be one region
  const seenF = new Set([floor[0]]), q = [floor[0]];
  while (q.length) { const i = q.pop(); for (const d of D) if (ok(i, d) && !rock[i + d] && !seenF.has(i + d)) { seenF.add(i + d); q.push(i + d); } }
  if (seenF.size !== floor.length) continue;
  const sh = [...floor]; for (let i = sh.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [sh[i], sh[j]] = [sh[j], sh[i]]; }
  const goals = sh.slice(0, 3).sort((a, b) => a - b), gset = new Set(goals);
  // Reverse BFS over walks and pulls from every solved position: depth = exact forward optimal moves to solve.
  const K = (p, a, b, c) => ((p * N + a) * N + b) * N + c;
  for (const k of touched) dist[k] = -1;
  touched.length = 0;
  let q2 = [];
  for (const p of floor) if (!gset.has(p)) { const k = K(p, goals[0], goals[1], goals[2]); dist[k] = 0; touched.push(k); q2.push(k); }
  let best = null, bestD = 0, depth = 0;
  while (q2.length) {
    const next = [];
    depth++;
    for (const k of q2) {
      let c = k % N, b = Math.floor(k / N) % N, a = Math.floor(k / (N * N)) % N, p = Math.floor(k / (N * N * N));
      for (const d of D) {
        if (!ok(p, d)) continue;
        const t = p + d;
        if (rock[t] || t === a || t === b || t === c) continue;
        const k1 = K(t, a, b, c);
        if (dist[k1] < 0) { dist[k1] = depth; touched.push(k1); next.push(k1); }
        if (!ok(p, -d)) continue;
        const back = p - d;
        if (back === a || back === b || back === c) {
          const cs = [a === back ? p : a, b === back ? p : b, c === back ? p : c].sort((x, y) => x - y), k2 = K(t, cs[0], cs[1], cs[2]);
          if (dist[k2] < 0) { dist[k2] = depth; touched.push(k2); next.push(k2); }
        }
      }
    }
    if (next.length) {
      // the deepest layer with no crate already on fruit
      const cand = next.filter((k) => { const c = k % N, b = Math.floor(k / N) % N, a = Math.floor(k / (N * N)) % N; return !gset.has(a) && !gset.has(b) && !gset.has(c); });
      if (cand.length) { best = cand[Math.floor(rnd() * cand.length)]; bestD = depth; }
    }
    q2 = next;
  }
  if (!best || bestD < minMoves) continue;
  const p = Math.floor(best / (N * N * N)), crate = new Set([Math.floor(best / (N * N)) % N, Math.floor(best / N) % N, best % N]);
  const rows = ["#".repeat(n + 2)];
  for (let r = 0; r < n; r++) { let s = "#"; for (let c = 0; c < n; c++) { const i = r * n + c; s += rock[i] ? "#" : i === p ? (gset.has(i) ? "+" : "@") : crate.has(i) ? "$" : gset.has(i) ? "." : " "; } rows.push(s + "#"); }
  rows.push("#".repeat(n + 2));
  const sig = rows.join("/"); if (seen.has(sig)) continue; seen.add(sig);
  let L; try { L = parseLevel({ rows }); } catch { continue; }
  const res = solveCrates(L, 4e6);
  if (!res.solvable || res.moves !== bestD) { console.error("BFS mismatch", bestD, res.moves); continue; }
  found.push({ n, rocks: k, rows, moves: res.moves, pushes: res.pushes, explored: res.explored, solution: res.path.map((d) => d[0].toUpperCase()).join("") });
}
found.sort((a, b) => a.moves - b.moves);
fs.writeFileSync(out, JSON.stringify({ generator: "reverse-pull", n, rMin, rMax, seed: seed0, seconds: secs, tries, found: found.length, levels: found }));
const h = {}; for (const f of found) { const b = Math.floor(f.moves / 10) * 10; h[b] = (h[b] || 0) + 1; }
console.log(JSON.stringify({ n, rMin, rMax, seed: seed0, tries, found: found.length, byMoves10: h }));
