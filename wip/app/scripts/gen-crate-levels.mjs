// v4.2: search for the bonus levels 1 (5×5) and 3 (7×7); level 2 is the Designer's Crate Cove 3 (6×6, 30/13).
// Deterministic (seeded); prints candidates with solver metrics. Final picks are re-verified by verify/solver.py.
import { parseLevel, solveCrates, deadSquares } from "../crates.js";
const [n, rocksMin, rocksMax, minMoves, maxMoves, minPushes, maxPushes, tries, seed0] = process.argv.slice(2).map(Number);
let seed = seed0 || 1;
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; // mulberry32
const seen = new Set();
const out = [];
for (let t = 0; t < tries; t++) {
  const cells = Array.from({ length: n * n }, (_, i) => i); for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }
  const k = rocksMin + Math.floor(rnd() * (rocksMax - rocksMin + 1));
  const rocks = cells.slice(0, k), goals = cells.slice(k, k + 3), crates = cells.slice(k + 3, k + 6), player = cells[k + 6];
  const L0 = { n, rocks, goals };
  const grid = Array.from({ length: n + 2 }, (_, r) => Array.from({ length: n + 2 }, (_, c) => (r === 0 || c === 0 || r === n + 1 || c === n + 1 ? "#" : " ")));
  const put = (i, ch) => (grid[Math.floor(i / n) + 1][(i % n) + 1] = ch);
  rocks.forEach((i) => put(i, "#")); goals.forEach((i) => put(i, ".")); crates.forEach((i) => put(i, "$")); put(player, "@");
  const rows = grid.map((r) => r.join("")); if (seen.has(rows.join())) continue; seen.add(rows.join());
  let L; try { L = parseLevel({ rows }); } catch { continue; }
  const dead = new Set(deadSquares(L));
  if (crates.some((c) => dead.has(c))) continue;
  const r = solveCrates(L, 2e6);
  if (!r.solvable) continue;
  if (r.moves < minMoves || r.moves > maxMoves || r.pushes < minPushes || r.pushes > maxPushes) continue;
  out.push({ rows, moves: r.moves, pushes: r.pushes, explored: r.explored, dead: dead.size, rocks: k });
}
out.sort((a, b) => b.pushes * 1000 + b.explored / 100 - (a.pushes * 1000 + a.explored / 100));
console.log(JSON.stringify(out.slice(0, 12), null, 1));
console.error("found", out.length);
