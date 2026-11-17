// v4.3 phase 1: the "capy ends up next to another one" bug (Undo phantom boards + duplicated late taps) and stronger haptics.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { peers, violations, solutionCells, withLocks, HAPTICS, vibrate, DRAG_TICK_GAP } from "../core.js";
import { HAPTIC_CONFIG } from "../config.js";
import { newAttempt, attemptMove, undoAttempt, undoChanges, clearConflicts, usePower } from "../powers.js";
const data = JSON.parse(fs.readFileSync(new URL("../levels.json", import.meta.url)));

// Same Undo loop as app.js "undo".
function undo(p, s, hist) {
  while (hist.length) {
    const prev = hist.pop();
    if (!undoChanges(s, prev.cells, p)) continue;
    return undoAttempt(s, prev.cells, p);
  }
  return s;
}
const capyPairs = (p, cells) => {
  const out = [];
  cells.forEach((v, a) => v === 2 && cells.forEach((w, b) => w === 2 && a < b && peers(p, a, b) && out.push([a, b])));
  return out;
};
// A solution cell S and a non-solution neighbour W (any of the 8, diagonals included) that is legal on an empty board.
function pickPair(p, diagonal) {
  const sol = solutionCells(p), n = p.n;
  for (const s of sol)
    for (const w of Array.from({ length: n * n }, (_, i) => i)) {
      const dr = Math.abs(Math.floor(w / n) - Math.floor(s / n)), dc = Math.abs((w % n) - (s % n));
      if (sol.includes(w) || p.rocks.includes(w) || Math.max(dr, dc) !== 1) continue;
      if (diagonal !== (dr === 1 && dc === 1)) continue;
      return { s, w };
    }
  throw Error("no pair");
}

for (const diagonal of [false, true])
  for (const id of [1, 9, 21, 29]) // v4.3: 30 is a crate pond; 29 is the 10×10 boss
    test(`Undo never rebuilds a board where an unlocked capy touches a later-locked capy (pond ${id}, ${diagonal ? "diagonal" : "orthogonal"})`, () => {
      const p = data.levels[id - 1], { s: S, w: W } = pickPair(p, diagonal), hist = [];
      let st = withLocks(p, newAttempt(p.n));
      const step = (next) => { if (next !== st) { hist.push({ cells: [...st.cells] }); st = next; } };
      step(attemptMove(p, st, W, 2)); // wrong but legal capy: v4.3 rev b rejects it at once (orange lost, cell empty)
      assert.equal(st.lives, 2);
      assert.equal(st.cells[W], 0);
      step(attemptMove(p, st, W, 0)); // player removes it
      step(attemptMove(p, st, S, 2)); // correct capy right next to where W was: locks
      assert.ok(st.locked.includes(S));
      st = undo(p, st, hist); // one Undo: skips the no-op step and lands on "before W was removed"
      assert.equal(st.cells[S], 2, "locked capy survives Undo");
      assert.equal(st.cells[W], 0, "W must not come back next to the locked capy");
      assert.deepEqual(capyPairs(p, st.cells), []);
      assert.equal(violations(p, st.cells).size, 0);
    });

test("Second chance then Undo does not bring the cleared clashing capy back next to the locked one", () => {
  const p = data.levels[0], { s: S, w: W } = pickPair(p, true), hist = [];
  let st = withLocks(p, newAttempt(p.n));
  const step = (next) => { if (next !== st) { hist.push({ cells: [...st.cells] }); st = next; } };
  step(attemptMove(p, st, W, 2));
  step(attemptMove(p, st, S, 2)); // breaks the touching rule: orange lost, S locks
  assert.equal(st.lives, 2);
  st = usePower(p, st, "Bloom"); // Second chance removes W, refunds the orange
  assert.equal(st.cells[W], 0);
  st = undo(p, st, hist);
  assert.equal(st.cells[W], 0);
  assert.deepEqual(capyPairs(p, st.cells), []);
});

// v4.3 rev b: the "Undo of Clear conflicts" and "Undo restores a mutual conflict between two unlocked capys" tests were
// retired: a wrong capy can no longer stay on the board, so neither board can exist. Undo now only steps back marks
// (locked capys always survive it) and never refunds an orange.
test("v4.3 rev b: a rejected capy leaves no Undo step; Undo walks back marks only and never refunds", () => {
  const p = data.levels[0], sol = solutionCells(p), hist = [];
  let st = withLocks(p, newAttempt(p.n));
  const step = (next) => { if (next !== st) { hist.push({ cells: [...st.cells] }); st = next; } };
  const wrong = Array.from({ length: 25 }, (_, i) => i).filter((i) => !sol.includes(i) && !p.rocks.includes(i));
  step(attemptMove(p, st, wrong[0], 1));
  const r = attemptMove(p, st, wrong[1], 2);
  assert.equal(r.cells[wrong[1]], 0);
  assert.deepEqual(r.cells, st.cells, "rejected capy: board unchanged");
  st = r; // app.js play() pushes no history for a rejected move
  step(attemptMove(p, st, sol[0], 2));
  assert.equal(st.lives, 2);
  st = undo(p, st, hist);
  assert.equal(st.cells[sol[0]], 2, "locked capy survives Undo");
  assert.equal(st.cells[wrong[0]], 0, "Undo removed the ×");
  assert.equal(st.lives, 2, "no refund");
  assert.equal(st.metrics.mistakes, 1);
});

test("fuzz: 6000 random games (place/clear/mark/undo/Clear conflicts/powers) never create an uncharged new touching pair", () => {
  const rnd = (() => { let a = 4242 >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
  const key = (p, c) => new Set(capyPairs(p, c).map(([a, b]) => a + "-" + b));
  let checked = 0;
  for (let run = 0; run < 6000; run++) {
    const p = data.levels[Math.floor(rnd() * 30)], sol = solutionCells(p), N = p.n * p.n, sel = ["Jun", "Bloom", "Remy"][run % 3], hist = [];
    let st = withLocks(p, newAttempt(p.n));
    for (let k = 0; k < 40 && st.lives > 0; k++) {
      const before = key(p, st.cells), r = rnd(), i = rnd() < 0.5 ? sol[Math.floor(rnd() * sol.length)] : Math.floor(rnd() * N);
      let next = st, charged = false, snap = null;
      if (r < 0.45) { next = attemptMove(p, st, i, 2); charged = next !== st && next.metrics.mistakes > st.metrics.mistakes; }
      else if (r < 0.6) next = attemptMove(p, st, i, 0);
      else if (r < 0.7) next = attemptMove(p, st, i, 1);
      else if (r < 0.85) {
        while (hist.length) { const prev = hist.pop(); if (!undoChanges(st, prev.cells, p)) continue; next = undoAttempt(st, prev.cells, p); snap = key(p, prev.cells); break; }
      } else if (r < 0.93) next = clearConflicts(p, st);
      else next = usePower(p, st, sel);
      if (next !== st && (r < 0.7 || (r >= 0.85 && r < 0.93))) hist.push({ cells: [...st.cells] });
      const fresh = [...key(p, next.cells)].filter((x) => !before.has(x) && !(snap && snap.has(x)));
      assert.ok(!fresh.length || charged, `pond ${p.id}: uncharged touching pair ${fresh}`);
      checked++;
      st = next;
    }
  }
  assert.ok(checked > 30000, `only ${checked} steps`);
});

test("Undo fuzz specifically: a restored board never pairs an unlocked capy with a lock the snapshot did not have", () => {
  const rnd = (() => { let a = 99 >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
  let undos = 0;
  for (let run = 0; run < 3000; run++) {
    const p = data.levels[Math.floor(rnd() * 30)], sol = solutionCells(p), N = p.n * p.n, hist = [];
    let st = withLocks(p, newAttempt(p.n));
    for (let k = 0; k < 30 && st.lives > 0; k++) {
      const r = rnd(), i = rnd() < 0.5 ? sol[Math.floor(rnd() * sol.length)] : Math.floor(rnd() * N);
      if (r < 0.7) { const nx = attemptMove(p, st, i, r < 0.5 ? 2 : 0); if (nx !== st) { if (nx.rejected === undefined) hist.push({ cells: [...st.cells] }); st = { ...nx, lives: 3 }; } } // v4.3 rev b: rejected moves cost oranges fast; refill so Undo keeps getting exercised
      else {
        while (hist.length) {
          const prev = hist.pop();
          if (!undoChanges(st, prev.cells, p)) continue;
          st = undoAttempt(st, prev.cells, p); undos++;
          const locked = withLocks(p, st).locked;
          for (const [a, b] of capyPairs(p, st.cells)) {
            const lk = locked.includes(a) ? a : locked.includes(b) ? b : null;
            if (lk !== null) assert.equal(prev.cells[lk], 2, `pond ${p.id}: ${a}-${b} pairs with a lock from the future`);
          }
          break;
        }
      }
    }
  }
  assert.ok(undos > 3000, `${undos} undos`); // v4.3 rev b: rejected capys add no Undo step
});

test("haptics v4.3: every pattern a clear step stronger than v4.2 (>=1.4x buzz time), shapes kept, still distinct and throttle-safe", () => {
  const v42 = { markX: 30, clearTap: 26, dragTick: 22, correct: 70, mistake: [110, 80, 110], solve: [90, 60, 120, 60, 220], landing: 40, locked: 18, cratePush: 24, crateLand: [40, 50, 140] };
  const on = (v) => [].concat(v).reduce((a, n, i) => a + (i % 2 === 0 ? n : 0), 0);
  const P = HAPTIC_CONFIG.patterns;
  assert.deepEqual(Object.keys(P).sort(), Object.keys(v42).sort());
  for (const [k, v] of Object.entries(v42)) {
    assert.ok(on(P[k]) >= 1.4 * on(v), `${k} ${on(P[k])} vs ${on(v)}`);
    assert.equal([].concat(P[k]).length, [].concat(v).length, `${k} keeps its shape`);
    for (const ms of [].concat(P[k])) assert.ok(ms <= 400, `${k} pulse stays short of a drone`);
  }
  assert.deepEqual({ ...P, mistake: [...P.mistake], solve: [...P.solve], crateLand: [...P.crateLand] }, {
    markX: 50, clearTap: 42, dragTick: 34, correct: 110, mistake: [170, 90, 170], solve: [130, 70, 180, 70, 320], landing: 65, locked: 30, cratePush: 38, crateLand: [65, 60, 210],
  });
  const vals = Object.values(P).map((v) => JSON.stringify(v));
  assert.equal(new Set(vals).size, vals.length, "all patterns distinct");
  assert.ok(P.dragTick < DRAG_TICK_GAP && P.landing < 100, "drag ticks and landing splashes never merge (70 ms throttle, 100 ms stagger)");
  assert.ok(on(P.mistake) >= 3 * P.correct && P.locked < P.markX && P.cratePush < P.correct);
  const calls = [];
  for (const k of Object.keys(P)) vibrate(k, true, { vibrate: (x) => (calls.push(x), true) });
  assert.deepEqual(calls, Object.values(P));
  assert.equal(HAPTICS.legal, P.correct);
});
