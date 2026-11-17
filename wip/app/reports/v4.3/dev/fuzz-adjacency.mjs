// Fuzz the pure game layer the way app.js drives it; flag any step that creates a NEW conflicting pair
// without being a capy placement that was charged as a mistake (or Nap-protected).
import fs from "node:fs";
import { violations, peers, withLocks, isLocked, solutionCells } from "../../../core.js";
import { newAttempt, attemptMove, undoAttempt, undoChanges, clearConflicts, usePower } from "../../../powers.js";
const data = JSON.parse(fs.readFileSync(new URL("../../../levels.json", import.meta.url)));
const rnd = (() => { let a = Number(process.argv[2] || 1) >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
const pairs = (p, c) => { const s = new Set(); c.forEach((v, a) => { if (v !== 2) return; c.forEach((w, b) => { if (w === 2 && a < b && peers(p, a, b)) s.add(a + "-" + b); }); }); return s; };
const found = {}; const examples = {};
for (let run = 0; run < Number(process.argv[3] || 4000); run++) {
  const p = data.levels[Math.floor(rnd() * 30)], sol = solutionCells(p), N = p.n * p.n;
  let s = withLocks(p, newAttempt(p.n)); const hist = []; const sel = ["Jun", "Bloom", "Remy"][Math.floor(rnd() * 3)]; const log = [];
  for (let step = 0; step < 40 && s.lives > 0; step++) {
    const before = pairs(p, s.cells); let op, next = s, charged = false, snap = null;
    const r = rnd(), i = rnd() < 0.5 ? sol[Math.floor(rnd() * sol.length)] : Math.floor(rnd() * N);
    if (r < 0.45) { op = "place " + i; next = attemptMove(p, s, i, 2); charged = next !== s && (next.metrics.mistakes > s.metrics.mistakes); if (next !== s) hist.push({ cells: [...s.cells] }); }
    else if (r < 0.6) { op = "clear " + i; next = attemptMove(p, s, i, 0); if (next !== s) hist.push({ cells: [...s.cells] }); }
    else if (r < 0.7) { op = "mark " + i; next = attemptMove(p, s, i, 1); if (next !== s) hist.push({ cells: [...s.cells] }); }
    else if (r < 0.85) { op = "undo"; while (hist.length) { const prev = hist.pop(); if (!undoChanges(s, prev.cells, p)) continue; next = undoAttempt(s, prev.cells, p); snap = pairs(p, prev.cells); break; } }
    else if (r < 0.93) { op = "clearConflicts"; const c = clearConflicts(p, s); if (c !== s) { hist.push({ cells: [...s.cells] }); next = c; } }
    else { op = "power:" + sel; next = usePower(p, s, sel); }
    log.push(op);
    const after = pairs(p, next.cells); const fresh = [...after].filter((x) => !before.has(x) && !(snap && snap.has(x)));
    if (fresh.length && !charged) { const k = op.split(" ")[0]; found[k] = (found[k] || 0) + 1; if (!examples[k]) examples[k] = { level: p.id, ops: [...log], fresh, lockedAfter: next.locked }; }
    s = next;
  }
}
console.log(JSON.stringify({ unchargedNewConflicts: found, examples }, null, 1));
