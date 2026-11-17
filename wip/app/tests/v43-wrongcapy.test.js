// v4.3 rev b — "wrong capy = immediate mistake" (Producer decision after Sebastián's live v4.2 pond 23 report).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { solutionCells, violations, peers, move, dropWrongCapys, withLocks, solved, dailyPuzzle } from "../core.js";
import { newAttempt, attemptMove, usePower, undoAttempt, canUsePower, awardPureBoss } from "../powers.js";
import { awardLilies, newMetrics } from "../rewards.js";
import { isBoss } from "../roles.js";

const data = JSON.parse(fs.readFileSync(new URL("../levels.json", import.meta.url)));
const v42 = JSON.parse(fs.readFileSync(new URL("../../app-v4.2.1-backup/levels.json", import.meta.url)));
const P23 = v42.levels[22]; // live v4.2 pond 23, 7×7, rock at r5c2
const rc = (r, c) => (r - 1) * 7 + (c - 1);
const LOCKED = [0, 9, 19, 22]; // the 4 locked capys in Sebastián's screenshot (only set that matches it)
const WRONG = [rc(6, 4), rc(7, 7)]; // brown zone r6c4, teal zone r7c7: legal but not in the solution
const deadZones = (p, cells) => {
  const caps = cells.flatMap((v, i) => (v === 2 ? [i] : [])), have = new Set(caps.map((i) => p.zones[i]));
  return [...new Set(p.zones)].filter((z) => !have.has(z) && !p.zones.some((zz, i) => zz === z && !p.rocks.includes(i) && cells[i] === 0 && !caps.some((j) => peers(p, i, j))));
};

test("v4.2 pond 23: the reported position really was a dead end under the old rule (orange zone 6 has no legal cell)", () => {
  assert.equal(P23.n, 7);
  assert.deepEqual(solutionCells(P23), [0, 9, 19, 22, 31, 41, 46]);
  const cells = Array(49).fill(0);
  [...LOCKED, ...WRONG].forEach((i) => (cells[i] = 2));
  assert.equal(violations(P23, cells).size, 0, "both wrong capys were legal, so the old rule charged nothing");
  assert.deepEqual(deadZones(P23, cells), [6]);
});

test("v4.2 pond 23 replayed under the new rule: both wrong capys are rejected at once, and the pond stays solvable", () => {
  let s = withLocks(P23, newAttempt(7));
  for (const i of LOCKED) s = attemptMove(P23, s, i, 2);
  assert.deepEqual(s.locked, LOCKED);
  s = attemptMove(P23, s, WRONG[0], 2);
  assert.equal(s.rejected, WRONG[0]);
  assert.equal(s.cells[WRONG[0]], 0);
  assert.equal(s.lives, 2);
  s = attemptMove(P23, s, WRONG[1], 2);
  assert.equal(s.cells[WRONG[1]], 0);
  assert.equal(s.lives, 1);
  assert.equal(s.metrics.mistakes, 2);
  assert.deepEqual(deadZones(P23, s.cells), []);
  for (const i of [31, 41, 46]) s = attemptMove(P23, s, i, 2);
  assert.ok(solved(P23, s.cells));
  assert.equal(s.lives, 1);
});

test("an old save holding the pond 23 dead end is repaired on resume (wrong capys dropped, oranges/mistakes untouched)", () => {
  const s = { ...newAttempt(7), lives: 3 };
  [...LOCKED, ...WRONG].forEach((i) => (s.cells[i] = 2));
  s.cells[5] = 1;
  const r = dropWrongCapys(P23, s);
  assert.equal(r.cells[WRONG[0]], 0);
  assert.equal(r.cells[WRONG[1]], 0);
  assert.equal(r.cells[5], 1, "marks are kept");
  LOCKED.forEach((i) => assert.equal(r.cells[i], 2));
  assert.equal(r.lives, 3);
  assert.deepEqual(r.metrics, s.metrics);
  assert.deepEqual(deadZones(P23, r.cells), []);
  assert.equal(dropWrongCapys(P23, r), r, "clean boards are returned as is");
});

test("property: no sequence of moves on any v4.3 pond or Daily Pond can leave a wrong capy or a dead-end zone", () => {
  let a = 2311;
  const rnd = () => { a = (a * 1103515245 + 12345) >>> 0; return a / 2 ** 32; };
  const ponds = [...data.levels.filter((q) => !q.crate)];
  for (let d = 0; d < 20; d++) ponds.push(dailyPuzzle(data, new Date(Date.UTC(2026, 10, 1 + d, 12)), true));
  let steps = 0;
  for (const p of ponds) for (let run = 0; run < 25; run++) {
    const sol = solutionCells(p), N = p.n * p.n;
    let s = withLocks(p, newAttempt(p.n));
    if (run % 3 === 1) s = usePower(p, s, "Remy");
    for (let k = 0; k < 60 && !solved(p, s.cells); k++) {
      const i = rnd() < 0.4 ? sol[Math.floor(rnd() * sol.length)] : Math.floor(rnd() * N), r = rnd();
      s = attemptMove(p, s, i, r < 0.6 ? 2 : r < 0.85 ? 1 : 0);
      if (s.lives === 0) s = { ...s, lives: 3 };
      assert.ok(s.cells.every((v, j) => v !== 2 || sol.includes(j)), `pond ${p.id}: wrong capy on board`);
      assert.deepEqual(deadZones(p, s.cells.map((v) => (v === 1 ? 0 : v))), [], `pond ${p.id}: dead end`);
      steps++;
    }
  }
  assert.ok(steps > 30000, `${steps}`);
});

test("orange accounting: wrong capy costs 1 (spare absorbs it first, Nap prevents it), correct capy costs 0, all wrong capys count as mistakes", () => {
  const p = data.levels[6], sol = solutionCells(p), W = [...Array(p.n * p.n).keys()].filter((i) => !sol.includes(i) && !p.rocks.includes(i));
  let s = { ...newAttempt(p.n), spare: 1 };
  s = attemptMove(p, s, W[0], 2);
  assert.equal(s.lives, 3); assert.equal(s.spare, 0); assert.ok(s.spareUsed); assert.equal(s.metrics.mistakes, 1);
  s = attemptMove(p, s, W[1], 2);
  assert.equal(s.lives, 2); assert.equal(s.metrics.mistakes, 2); assert.equal(s.rejected, W[1]);
  s = attemptMove(p, s, sol[0], 2);
  assert.equal(s.lives, 2); assert.equal("rejected" in s, false); assert.equal(s.metrics.mistakes, 2);
  // × on a wrong cell then a capy on it: the × stays, still a mistake
  s = attemptMove(p, s, W[2], 1);
  s = attemptMove(p, s, W[2], 2);
  assert.equal(s.cells[W[2]], 1); assert.equal(s.lives, 1); assert.equal(s.metrics.mistakes, 3);
  s = attemptMove(p, s, W[3], 2);
  assert.equal(s.lives, 0, "third orange lost = game over");
  assert.equal(attemptMove(p, s, sol[1], 2), s, "no moves after game over");
});

test("powers: Peek still points at a solution cell; Nap makes wrong capys free but counted and spends a charge; Second chance restores the orange only", () => {
  const p = data.levels[10], sol = solutionCells(p), W = [...Array(p.n * p.n).keys()].filter((i) => !sol.includes(i) && !p.rocks.includes(i));
  const peek = usePower(p, newAttempt(p.n), "Jun", () => 0);
  assert.ok(sol.includes(peek.power.peekCell));
  const afterWrong = attemptMove(p, peek, W[0], 2);
  assert.equal(afterWrong.power.peekCell, peek.power.peekCell, "a rejected capy does not consume the Peek glow");
  let n = usePower(p, newAttempt(p.n), "Remy");
  n = attemptMove(p, n, W[0], 2);
  assert.equal(n.lives, 3); assert.equal(n.metrics.mistakes, 1); assert.equal(n.power.napRemaining, 2); assert.equal(n.cells[W[0]], 0);
  assert.equal(n.lastMistake ?? null, null, "no orange lost, so nothing for Second chance");
  let b = attemptMove(p, newAttempt(p.n), W[0], 2);
  assert.ok(canUsePower(p, b, "Bloom", false));
  b = usePower(p, b, "Bloom");
  assert.equal(b.lives, 3); assert.equal(b.metrics.mistakes, 1); assert.ok(b.cells.every((v) => v !== 2));
});

test("lilies: any wrong capy (even under Nap or absorbed by the spare) loses the No-mistakes lily; Golden lily still only requires no power use", () => {
  const boss = data.levels.find((q) => !q.crate && isBoss(q.id));
  const sol = solutionCells(boss), w = [...Array(boss.n * boss.n).keys()].find((i) => !sol.includes(i) && !boss.rocks.includes(i));
  let s = { ...newAttempt(boss.n), metrics: { ...newMetrics(), known: true, started: true, elapsedMs: 1000 } };
  s = attemptMove(boss, s, w, 2);
  for (const i of sol) s = attemptMove(boss, s, i, 2);
  assert.ok(solved(boss, s.cells));
  const prog = { lilies: {}, goldenLilies: [] };
  const r = awardLilies(prog, boss, s.metrics);
  assert.deepEqual(r.newly.slice(0, 2), [true, false]);
  assert.equal(awardPureBoss(prog, boss, s), true, "golden lily: boss solved without a power, mistakes allowed");
  assert.equal(awardPureBoss({ goldenLilies: [] }, boss, { ...s, power: { ...s.power, used: true } }), false);
});

test("move(): a correct capy never costs an orange, even next to nothing; X and clear are free", () => {
  for (const p of data.levels.filter((q) => !q.crate)) {
    const sol = solutionCells(p);
    let st = { cells: Array(p.n * p.n).fill(0), lives: 3 };
    for (const i of sol) { st = move(p, st, i, 2, false); assert.equal(st.lives, 3); }
  }
});
