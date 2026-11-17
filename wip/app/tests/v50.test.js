// v5.0 Capybara Calm: 150 ponds (5 worlds × 30). Every level: unique + no-guess solvable; crate ponds solvable at their
// optimal move count; measured difficulty ramp; roles for 150; and v4.2 / v4.3 / v4.3.1 saves migrate without losing a lily.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { logic, enumerate, load, sanitize, unlocked, boardSignature, KEY } from "../core.js";
import { scoreBoard } from "../difficulty.js";
import { parseLevel, newCrateState, stepCrate, isCrateSolved, solveCrates, SPARE_PONDS } from "../crates.js";
import { totalLilies } from "../rewards.js";
import * as roles from "../roles.js";
const J = (f) => JSON.parse(fs.readFileSync(new URL(f, import.meta.url)));
const data = J("../levels.json"), crates = J("../crate-levels.json"), ramp = J("../reports/v5.0/world-ramp.json");
const v431 = J("../../app-v4.3.1-backup/levels.json");
const byPond = Object.fromEntries(crates.levels.map((c) => [c.pond, c]));
const round5 = (m) => 5 * Math.round((m * 1.45) / 5);
const mem = (o = {}) => { const m = new Map(Object.entries(o)); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }; };

test("150 ponds in order, contentVersion 5.0, world 1 byte-identical to v4.3.1, sizes 7×7…10×10", () => {
  assert.equal(data.levels.length, 150);
  assert.equal(data.contentVersion, "5.0");
  data.levels.forEach((L, i) => assert.equal(L.id, i + 1));
  assert.deepEqual(data.levels.slice(0, 30), v431.levels);
  assert.deepEqual([data.daily, data.dailySafe], [v431.daily, v431.dailySafe]);
  for (const L of data.levels.filter((L) => !L.crate)) assert.ok(L.n >= 7 && L.n <= 10, `pond ${L.id} n=${L.n}`);
});
test("roles for 150: 30 crate ponds (every 5th), 15 gates, 5 world gates, 15 bosses (…9), breathers, finale 150", () => {
  assert.equal(roles.POND_COUNT, 150);
  assert.deepEqual(roles.CRATE_PONDS, Array.from({ length: 30 }, (_, k) => 5 * (k + 1)));
  assert.deepEqual(roles.GATE_PONDS, Array.from({ length: 15 }, (_, k) => 10 * (k + 1)));
  assert.deepEqual(roles.WORLD_GATES, [30, 60, 90, 120, 150]);
  assert.deepEqual(roles.BOSS_PONDS, Array.from({ length: 15 }, (_, k) => 10 * k + 9));
  assert.deepEqual(roles.NEW_WORLD_PONDS, [31, 61, 91, 121]);
  assert.equal(roles.FINALE_POND, 150);
  assert.deepEqual([1, 30, 31, 60, 61, 150].map(roles.worldOf), [0, 0, 1, 1, 2, 4]);
  assert.equal(roles.pondLabel(150), "Finale Crate Pond 150");
  assert.equal(SPARE_PONDS.length, 29);
  assert.ok(!SPARE_PONDS.includes(151));
  for (const L of data.levels) assert.equal(!!L.crate, roles.isCrate(L.id), `pond ${L.id}`);
});
test("every logic pond (120): unique solution, solvable by the no-guess solver, never repeated (also vs. Daily)", () => {
  const seen = new Set([...data.daily, ...data.dailySafe].map(boardSignature));
  const logicPonds = data.levels.filter((L) => !L.crate);
  assert.equal(logicPonds.length, 120);
  for (const L of logicPonds) {
    assert.ok(logic(L).ok, `pond ${L.id} needs a guess`);
    assert.equal(enumerate(L).length, 1, `pond ${L.id} not unique`);
    const sig = boardSignature(L);
    if (L.id > 30) assert.ok(!seen.has(sig), `pond ${L.id} repeats a board`);
    seen.add(sig);
  }
});
test("difficulty ramp across worlds: score, rank-3 steps, rocks and zone twist rise; forced share falls; bosses harder each world", () => {
  const W = (w) => data.levels.filter((L) => !L.crate && roles.worldOf(L.id) === w).map((L) => ({ L, s: scoreBoard(L) }));
  const avg = (a, f) => a.reduce((x, y) => x + f(y), 0) / a.length;
  const stats = [0, 1, 2, 3, 4].map((w) => {
    const a = W(w), forced = (x) => x.s.trace.filter((t) => t.rank === 1).length / x.s.trace.length;
    return { score: avg(a, (x) => x.s.score), forced: avg(a, forced), rank3: avg(a, (x) => x.s.commonConflictSteps), rocks: avg(a, (x) => x.L.rocks.length), boss: avg(a.filter((x) => roles.isBoss(x.L.id)), (x) => x.s.score), lastBoss: a.filter((x) => roles.isBoss(x.L.id)).at(-1).s.score };
  });
  for (let w = 1; w < 5; w++) {
    for (const k of ["score", "rank3", "rocks", "boss", "lastBoss"]) assert.ok(stats[w][k] > stats[w - 1][k], `world ${w + 1} ${k}: ${stats[w][k]} vs ${stats[w - 1][k]}`);
    assert.ok(stats[w].forced < stats[w - 1].forced, `world ${w + 1} forced share`);
    assert.ok(ramp[w].twist > ramp[w - 1].twist, `world ${w + 1} twist`);
  }
  // within a world 2–5 the normal ponds never fall by more than 3 % (breathers excepted) and every boss reaches rank 3
  for (let w = 1; w < 5; w++) {
    let prev = 0;
    for (const { L, s } of W(w)) {
      if (roles.isBoss(L.id)) assert.equal(s.deepestRank, 3, `boss ${L.id}`);
      if (roles.role(L.id) === "breather" || roles.isBoss(L.id)) continue;
      assert.ok(s.score >= prev * 0.97, `pond ${L.id} drops (${s.score} < ${prev})`);
      prev = s.score;
    }
  }
});
test("30 crate ponds: C1–C6 kept, par = round5(optimal × 1.45), stored solution solves in exactly the optimal moves, BFS agrees", () => {
  assert.equal(crates.levels.length, 30);
  assert.deepEqual(crates.levels.map((c) => c.pond), roles.CRATE_PONDS);
  const v43 = J("../../app-v4.3.1-backup/crate-levels.json");
  assert.deepEqual(crates.levels.slice(0, 6), v43.levels);
  const D = { U: "up", D: "down", L: "left", R: "right" };
  let prevWorldMax = 0;
  for (const c of crates.levels) {
    assert.equal(data.levels[c.pond - 1].crate, c.id);
    assert.equal(c.par, round5(c.optimalMoves));
    assert.ok(c.n >= 6 && c.n <= 9);
    const L = parseLevel(c);
    let s = newCrateState(L);
    for (const ch of c.solution) { const r = stepCrate(L, s, D[ch.toUpperCase()]); assert.ok(r.moved, `pond ${c.pond} blocked`); s = r.state; }
    assert.ok(isCrateSolved(L, s), `pond ${c.pond} solution does not solve`);
    assert.equal(s.moves, c.optimalMoves);
    assert.ok(!L.start.crates.some((x) => L.goals.includes(x)), `pond ${c.pond} starts with a crate on fruit`);
    if (c.pond > 30) {
      const bfs = solveCrates(L, 6e6);
      assert.equal(bfs.moves, c.optimalMoves, `pond ${c.pond} BFS`);
    }
  }
  for (let w = 0; w < 5; w++) {
    const m = crates.levels.filter((c) => roles.worldOf(c.pond) === w).map((c) => c.optimalMoves), gate = m.at(-1);
    assert.equal(gate, Math.max(...m), `world ${w + 1} world gate is its longest crate pond`);
    assert.ok(gate > prevWorldMax, `world ${w + 1} crate ramp`);
    prevWorldMax = gate;
  }
});

// ---- migration: saves written by v4.2 (layout 1), v4.3 and v4.3.1 (layout 2) ----
const lil = (a, b, c) => ({ cleared: a, noMistakes: b, underTarget: c, bestMs: 100000, bestMistakes: 0, targetVersion: 1 });
function v43Save(done = 30) {
  const lilies = {};
  for (let id = 1; id <= done; id++) lilies[id] = lil(true, id % 2 === 0, id % 3 === 0);
  return { version: 3, nickname: "Seba", lilies, dailyLilies: {}, completed: Array.from({ length: done }, (_, k) => k + 1), selected: "Bloom", starterChosen: true, goldenLilies: [9, 19, 29].filter((g) => g <= done), legacySelected: null, haptics: true, audio: false, music: true, tutorialSeen: true, powerIntroSeen: ["Jun:peek"], rockIntroSeen: true, rocksReached: true, daily: { lastDay: 20400, streak: 4 }, sessions: {}, bonus: { v: 2, best: { 5: 30, 10: 40, 30: 110 }, legacy: null, spare: null, dpad: false, controlsSeen: true }, layout: 2 };
}
test("v4.3 / v4.3.1 save with all 30 ponds: nothing lost, next pond is 31, unscored until replayed", () => {
  for (const label of ["v4.3", "v4.3.1"]) {
    const raw = v43Save(30), before = totalLilies(raw);
    if (label === "v4.3.1") raw.sessions["pond-29"] = { cells: Array(100).fill(0), lives: 2, signature: boardSignature(v431.levels[28]), locked: [] };
    const s = mem({ [KEY]: JSON.stringify(raw) }), { progress: p, readOnly } = load(s, data);
    assert.equal(readOnly, false);
    assert.equal(totalLilies(p), before, label);
    assert.deepEqual(p.completed, raw.completed);
    assert.deepEqual(p.goldenLilies, [9, 19, 29]);
    assert.deepEqual(p.bonus.best, raw.bonus.best);
    assert.equal(unlocked(p), 31);
    assert.deepEqual([p.scores, p.worldsShown], [{}, []]);
    if (label === "v4.3.1") assert.ok(p.sessions["pond-29"], "an in-progress world-1 pond still resumes (same board)");
  }
});
test("v4.2 save (layout 1, goldens on 10/20/30, Crate Cove solves): migrated once, every lily kept", () => {
  const raw = { ...v43Save(30), layout: undefined, goldenLilies: [10, 20, 30], bonus: { solved: [1, 2, 3], best: { 1: 20, 2: 44, 3: 90 } } };
  delete raw.layout;
  const before = totalLilies(raw), s = mem({ [KEY]: JSON.stringify(raw) }), r = load(s, data), p = r.progress;
  assert.ok(r.migrated || r.layoutMigration.changed);
  assert.ok(totalLilies(p) >= before);
  for (const [id, rec] of Object.entries(raw.lilies)) for (const k of ["cleared", "noMistakes", "underTarget"]) if (rec[k]) assert.ok(p.lilies[id][k], `pond ${id} ${k}`);
  assert.deepEqual(p.goldenLilies, [9, 19, 29]);
  assert.equal(p.layout, 2);
  assert.equal(unlocked(p), 31);
  const again = load(s, data);
  assert.equal(totalLilies(again.progress), totalLilies(p));
});
test("part-way saves resume where they were; lilies/scores on ponds up to 150 survive sanitize; junk ids are dropped", () => {
  const p = load(mem({ [KEY]: JSON.stringify(v43Save(17)) }), data).progress;
  assert.equal(unlocked(p), 18);
  const raw = { ...v43Save(30), completed: [...Array(150)].map((_, k) => k + 1), lilies: { ...v43Save(30).lilies, 150: lil(true, true, true), 151: lil(true, true, true) }, scores: { 31: { best: 2000, at: 1 }, 150: { best: 3150, at: 2 }, 151: { best: 10, at: 1 }, 32: { best: 99999, at: 1 } }, goldenLilies: [9, 149, 159], sessions: { "pond-150": { cells: Array(81).fill(0), lives: 3 }, "pond-151": { cells: Array(81).fill(0), lives: 3 } }, worldsShown: [0, 4, 7] };
  const q = sanitize(raw);
  assert.equal(q.completed.length, 150);
  assert.ok(q.lilies[150] && !q.lilies[151]);
  assert.deepEqual(Object.keys(q.scores).map(Number), [31, 150]);
  assert.deepEqual(q.goldenLilies, [9, 149]);
  assert.ok(q.sessions["pond-150"] && !q.sessions["pond-151"]);
  assert.deepEqual(q.worldsShown, [0, 4]);
  assert.equal(unlocked(q), 150);
});
