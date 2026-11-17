// v4.3 planning: hill-climb an 8x8 crate level toward a longer optimal solution (toggle interior rocks, move player/crate/goal).
// Every accepted level is solved exactly by crates.js solveCrates (BFS = optimal moves); finals are re-verified by the Designer solver.
// Usage: node scripts/climb-crates-v43.mjs <in.json> <index> <seconds> <seed> <out.json> [maxMoves]
// Objective: more PUSHES (the real work) while optimal moves stay <= maxMoves, so length comes from pushing, not walking corridors.
import fs from "node:fs";
import { parseLevel, solveCrates, deadSquares } from "../crates.js";
const [inFile, idx, secs, seed0, out] = [process.argv[2], Number(process.argv[3]), Number(process.argv[4]), Number(process.argv[5]), process.argv[6]], maxMoves = Number(process.argv[7] || 1e9);
let a = seed0 >>> 0; const rnd = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
let rows = JSON.parse(fs.readFileSync(inFile))[idx].rows.map((r) => r.split(""));
const H = rows.length, W = rows[0].length;
function evalRows(g) {
  const r = g.map((x) => x.join(""));
  let L; try { L = parseLevel({ rows: r }); } catch { return null; }
  const dead = new Set(deadSquares(L)); if (L.start.crates.some((c) => dead.has(c))) return null;
  const s = solveCrates(L, 3e6); return s.solvable ? { rows: r, moves: s.moves, pushes: s.pushes, explored: s.explored } : null;
}
let best = evalRows(rows), t0 = Date.now(), evals = 0, accepted = 0;
const interior = []; for (let r = 1; r < H - 1; r++) for (let c = 1; c < W - 1; c++) interior.push([r, c]);
while (Date.now() - t0 < secs * 1000) {
  const g = rows.map((x) => [...x]), [r, c] = interior[Math.floor(rnd() * interior.length)], ch = g[r][c], k = rnd();
  if (k < 0.5) { if (ch === "#") g[r][c] = " "; else if (ch === " ") g[r][c] = "#"; else continue; }
  else { // move an object (@ $ .) to a random empty interior cell
    if (!"@$.".includes(ch)) continue;
    const [r2, c2] = interior[Math.floor(rnd() * interior.length)]; if (g[r2][c2] !== " ") continue; g[r2][c2] = ch; g[r][c] = " ";
  }
  evals++;
  const e = evalRows(g); if (!e) continue;
  if (e.moves <= maxMoves && (e.pushes > best.pushes || (e.pushes === best.pushes && e.moves >= best.moves))) { best = e; rows = g; accepted++; }
}
fs.writeFileSync(out, JSON.stringify({ ...best, evals, accepted, seconds: (Date.now() - t0) / 1000 }));
console.log(best.moves + "/" + best.pushes, "evals", evals, "\n" + best.rows.join("\n"));
