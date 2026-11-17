// v4.2 crate bonus: rules, levels (solver-verified), deadlock soundness, spare-orange reward, saves, haptics, cache.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { parseLevel, newCrateState, stepCrate, walkPath, deadlocks, deadSquares, solveCrates, isCrateSolved, packedCount, DIRS, FRUITS, cleanBonus, grantSpare, claimSpare } from "../crates.js";
import { fresh, sanitize, load, save, KEY, SCHEMA, HAPTICS, boardSignature, solutionCells, violations } from "../core.js";
import { HAPTIC_CONFIG } from "../config.js";
import { newAttempt, attemptMove, undoAttempt } from "../powers.js";
import { awardLilies, totalLilies } from "../rewards.js";
import { BUILD } from "../build-info.js";
const crateData = JSON.parse(fs.readFileSync(new URL("../crate-levels.json", import.meta.url)));
const data = JSON.parse(fs.readFileSync(new URL("../levels.json", import.meta.url)));
const memory = () => { const items = {}; return { items, getItem: (k) => items[k] ?? null, setItem: (k, v) => (items[k] = v) }; };
const L1 = parseLevel(crateData.levels[0]);
const play = (L, path) => { let s = newCrateState(L); for (const ch of path) s = stepCrate(L, s, { U: "up", D: "down", L: "left", R: "right" }[ch]).state; return s; };

test("v4.3: six crate ponds (5/10/15/20/25/30) ramping by size and by optimal moves/pushes; pond 10 = Crate Cove 3", () => {
  assert.deepEqual(crateData.levels.map((l) => l.pond), [5, 10, 15, 20, 25, 30]);
  assert.deepEqual(crateData.levels.map((l) => l.n), [7, 6, 7, 7, 8, 8]);
  const m = crateData.levels.map((l) => [l.optimalMoves, l.optimalPushes]);
  for (let k = 1; k < m.length; k++) assert.ok(m[k][0] > m[k - 1][0] && m[k][1] > m[k - 1][1], JSON.stringify(m));
  const cove = JSON.parse(fs.readFileSync("/workspace/capydoku/mockup/boxworld-concept/v3/verify/level.json"));
  assert.deepEqual(crateData.levels[1].rows, cove.rows); // Crate Cove 3 unchanged from the approved spec
  assert.equal(crateData.levels[1].optimalMoves, 30);
  assert.equal(crateData.levels[1].optimalPushes, 13);
});
test("every level is re-verified by the Designer's solver.py and by the app's own BFS (same optimum, replayable)", () => {
  const r = spawnSync("python3", ["scripts/verify-crate-levels-v43.py"], { cwd: new URL("..", import.meta.url), encoding: "utf8" }); // read-only (v4.3)
  assert.equal(r.status, 0, r.stderr);
  for (const def of crateData.levels) {
    const L = parseLevel(def), js = solveCrates(L);
    assert.equal(js.solvable, true);
    assert.equal(js.moves, def.optimalMoves, def.name);
    const end = play(L, def.solution);
    assert.ok(isCrateSolved(L, end), def.name + " solution replays");
    assert.equal(end.moves, def.optimalMoves);
    assert.equal(L.goals.length, 3);
    assert.equal(L.start.crates.length, 3);
    assert.ok(L.start.crates.every((c) => !L.goals.includes(c)), "no crate starts packed");
    assert.deepEqual(Object.values(L.fruit).sort(), ["banana", "pear", "watermelon"]);
    assert.ok(Object.values(L.fruit).every((f) => !/orange|mango/.test(f)));
    assert.ok(def.par >= def.optimalMoves);
  }
});
test("Sokoban rules: walk, push one crate, never two, never into rocks or the frame; landing flags only on a fruit", () => {
  // interior 4×4:  @ $ $ ·  /  · · # ·  /  · $ . ·  /  . · . ·
  const L = parseLevel({ rows: ["######", "#@$$ #", "#  # #", "# $. #", "#. . #", "######"] });
  let s = newCrateState(L);
  assert.equal(stepCrate(L, s, "right").moved, false, "two crates in a row cannot be pushed");
  assert.equal(stepCrate(L, s, "up").moved, false, "the frame is solid");
  let r = stepCrate(L, s, "down");
  assert.ok(r.moved && !r.pushed);
  r = stepCrate(L, (s = r.state), "right");
  assert.ok(r.moved && !r.pushed);
  s = r.state;
  assert.equal(stepCrate(L, s, "up").moved, false, "a crate cannot be pushed into the frame");
  assert.equal(stepCrate(L, s, "right").moved, false, "rock is solid");
  r = stepCrate(L, s, "down");
  assert.ok(r.pushed && !r.landed);
  assert.deepEqual(r.state.crates, [1, 2, 13]);
  assert.equal(r.state.pushes, 1);
  assert.equal(r.state.moves, 3);
  const G = parseLevel({ rows: ["######", "#@$. #", "#    #", "#$ $ #", "#.  .#", "######"] });
  const land = stepCrate(G, newCrateState(G), "right");
  assert.ok(land.pushed && land.landed);
  assert.equal(packedCount(G, land.state), 1);
  const off = stepCrate(G, land.state, "right");
  assert.ok(off.pushed && !off.landed, "pushing a packed crate off its fruit is allowed but is no landing");
  assert.equal(packedCount(G, off.state), 0);
});
test("tap to walk finds a shortest path that never pushes; unreachable or blocked targets return null", () => {
  const s = newCrateState(L1);
  for (let t = 0; t < L1.n * L1.n; t++) {
    const p = walkPath(L1, s, t);
    if (p === null) continue;
    let x = s;
    for (const d of p) { const r = stepCrate(L1, x, d); assert.ok(r.moved && !r.pushed); x = r.state; }
    assert.equal(x.player, t);
    assert.deepEqual(x.crates, s.crates);
  }
  assert.equal(walkPath(L1, s, L1.rocks[0]), null);
  assert.equal(walkPath(L1, s, s.crates[0]), null);
  assert.deepEqual(walkPath(L1, s, s.player), []);
});
test("deadlock detector is SOUND on every reachable state of all six crate ponds (no false 'Undo?'), and catches a corner", () => {
  const r = spawnSync("node", ["scripts/deadlock-audit.mjs"], { cwd: new URL("..", import.meta.url), encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const audit = JSON.parse(r.stdout);
  for (const a of audit) { assert.equal(a.falsePositives, 0, a.level); assert.ok(a.recall >= 0.8, a.level + " recall " + a.recall); }
  const C = parseLevel({ rows: ["######", "#    #", "# $  #", "# @ .#", "#.$. #", "######"] });
  let s = newCrateState(C);
  s = stepCrate(C, s, "up").state; // push (1,1) → (0,1): against the frame, row 0 has no fruit
  assert.deepEqual(deadlocks(C, s), [1]);
  assert.ok(deadSquares(C).includes(0));
});
test("spare orange: absorbs the first lost orange, mistake still counts (no 0-mistakes lily), undo never refunds", () => {
  const q = data.levels[5], sol = solutionCells(q), bad = [...Array(q.n * q.n).keys()].find((i) => !sol.includes(i) && !q.rocks.includes(i));
  let s = { ...newAttempt(q.n), spare: 1 };
  s = attemptMove(q, s, sol[0], 2);
  const near = [...Array(q.n * q.n).keys()].find((i) => i !== sol[0] && violations(q, s.cells.map((v, k) => (k === i ? 2 : v))).has(i) && !sol.includes(i));
  const after = attemptMove(q, s, near, 2);
  assert.equal(after.lives, 3, "spare spent instead of an orange");
  assert.equal(after.spare, 0);
  assert.equal(after.metrics.mistakes, 1, "mistake still counted");
  const second = attemptMove(q, { ...after, cells: after.cells.map((v, k) => (k === near ? 0 : v)) }, near, 2);
  assert.equal(second.lives, 2, "second mistake costs a real orange");
  const undone = undoAttempt(after, s.cells, q);
  assert.equal(undone.spare, 0, "undo does not refund the spare");
  const progress = fresh();
  for (const i of sol) s = attemptMove(q, s, i, 2);
  const res = awardLilies(progress, q, { ...after.metrics, known: true, elapsedMs: 1000 }, false);
  assert.equal(progress.lilies[q.id].noMistakes, false);
  assert.equal(progress.lilies[q.id].cleared, true);
  assert.ok(bad >= 0 && res);
});
test("reward bookkeeping: next pond only, never stacks, other ponds/Daily leave it waiting; legacy bonus record gives no lilies", () => {
  const b = cleanBonus(null);
  assert.equal(grantSpare(b, 5), true);
  assert.equal(grantSpare(b, 5), false, "no stacking");
  assert.deepEqual(b.spare, { forPond: 6 });
  assert.equal(claimSpare(b, 7), false);
  assert.equal(claimSpare(b, 6, true), false, "the Daily never takes it");
  assert.deepEqual(b.spare, { forPond: 6 });
  assert.equal(claimSpare(b, 6), true);
  assert.equal(b.spare, null);
  assert.equal(claimSpare(b, 6), false, "retry after spending it gets no new spare");
  const p = fresh();
  p.bonus.legacy = { solved: [1, 2, 3], best: {} };
  assert.equal(totalLilies(p), 0);
  assert.equal(p.completed.length, 0);
});
test("saves: v4.1 save (no bonus) loads with bonus defaults (v4.3: layout-migrated once); v4.3 bonus round-trips; garbage bounded", () => {
  const s = memory(), q = data.levels[17];
  const old = { ...fresh(), nickname: "Seba", starterChosen: true, tutorialSeen: true, completed: [1, 2, 3, 4, 5, 10], goldenLilies: [10], lilies: { 5: { cleared: true, noMistakes: true, underTarget: false } }, sessions: { "pond-18": { ...newAttempt(6), signature: boardSignature(q) } } };
  delete old.bonus;
  delete old.layout; // a real v4.1 save has no layout flag
  delete old.sessions["pond-18"].spare;
  s.items[KEY] = JSON.stringify(old);
  const l = load(s, data);
  assert.equal(l.readOnly, false);
  assert.equal(l.migrated, true, "v4.3 layout migration writes back once");
  assert.deepEqual(JSON.parse(s.items[KEY]).bonus, { v: 2, best: {}, legacy: null, spare: null, dpad: false, controlsSeen: false }, "written back once");
  const done = [1, 2, 3, 4, 5, 9, 10]; // v4.3: the golden lily moves 10 → 9, so boss 9 is marked cleared too
  assert.deepEqual(JSON.parse(s.items[KEY]).completed, done);
  assert.equal(SCHEMA, 3, "storage schema unchanged: rollback-safe");
  assert.deepEqual(l.progress.completed, done);
  assert.deepEqual(l.progress.goldenLilies, [9], "v4.3: golden 10 → boss 9");
  assert.equal(l.progress.lilies[5].noMistakes, true);
  assert.deepEqual(l.progress.bonus, { v: 2, best: {}, legacy: null, spare: null, dpad: false, controlsSeen: false });
  assert.equal(l.progress.sessions["pond-18"], undefined, "v4.3: retuned pond 18 half-board dropped");
  l.progress.bonus = { v: 2, best: { 5: 30 }, legacy: { solved: [1], best: { 1: 19 } }, spare: { forPond: 11 }, dpad: true, controlsSeen: true };
  l.progress.sessions["pond-18"] = { ...newAttempt(q.n), signature: boardSignature(q), spare: 1 };
  assert.ok(save(s, l.progress));
  const back = load(s, data).progress;
  assert.deepEqual(back.bonus, l.progress.bonus);
  assert.equal(back.sessions["pond-18"].spare, 1);
  const junk = sanitize({ ...fresh(), bonus: { v: 2, best: { 5: -4, 9: 3, 10: "x" }, legacy: { solved: [1, 1, 9, "x"], best: { 1: -4 } }, spare: { forPond: 7 }, dpad: "yes" }, sessions: { "pond-2": { ...newAttempt(7), spare: 5 } } });
  assert.deepEqual(junk.bonus, { v: 2, best: {}, legacy: { solved: [1], best: {} }, spare: null, dpad: false, controlsSeen: false });
  assert.equal(junk.sessions["pond-2"].spare, 0);
});
test("rollback: the frozen v4.1 and v4.2.1 code read a v4.3 save without losing completions or lilies", async () => {
  for (const dir of ["app-v4.1-backup", "app-v4.2.1-backup"]) {
  const v41 = await import(`/workspace/capydoku/${dir}/core.js`);
  const p = { ...fresh(), nickname: "Seba", starterChosen: true, completed: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], goldenLilies: [9], lilies: { 5: { cleared: true, noMistakes: true, underTarget: true } }, bonus: { v: 2, best: { 5: 30 }, legacy: null, spare: { forPond: 6 }, dpad: true, controlsSeen: true } };
  const r = v41.sanitize(JSON.parse(JSON.stringify(p)));
  assert.deepEqual(r.completed, p.completed);
  for (const k of ["cleared", "noMistakes", "underTarget"]) assert.equal(r.lilies[5][k], p.lilies[5][k]);
  assert.equal(r.nickname, "Seba");
  }
});
test("haptics: crate patterns live in the one shared HAPTIC_CONFIG and are distinct from correct/mistake/solve", () => {
  const P = HAPTIC_CONFIG.patterns;
  assert.equal(typeof P.cratePush, "number");
  assert.ok(P.cratePush > 0 && P.cratePush < P.correct, "push tick is short");
  assert.ok(Array.isArray(P.crateLand));
  const total = (x) => [].concat(x).reduce((a, b) => a + b, 0);
  assert.ok(total(P.crateLand) > total(P.cratePush) * 4, "landing clearly stronger");
  for (const k of ["correct", "mistake", "solve", "markX", "locked"]) assert.notDeepEqual(P.crateLand, P[k]);
  assert.equal(HAPTICS.cratePush, P.cratePush);
  assert.deepEqual(HAPTICS.crateLand, P.crateLand);
  assert.match(fs.readFileSync(new URL("../config.js", import.meta.url), "utf8"), /iOS Safari .*NO Vibration API/);
});
test("v4.3 build: new cache name, every crate file precached, crate art is valid standalone SVG", () => {
  const m = JSON.parse(fs.readFileSync(new URL("../reports/precache.json", import.meta.url)));
  assert.equal(BUILD.version, "4.3.1"); // v4.3(.1) includes the v4.2.1 fixes (never shipped separately)
  assert.match(BUILD.cache, /^capydoku-v4\.3\.1-[0-9a-f]{12}$/);
  assert.notEqual(BUILD.cache, "capydoku-v4.1-923843f2cc02");
  for (const u of ["bonus-ui.js", "crates.js", "crate-levels.json", "bonus-v42.css", "crates-v43.css", "roles.js", "assets/crates/crate.svg", "assets/crates/crate-packed.svg", "assets/crates/watermelon.svg", "assets/crates/banana-target.svg", "assets/crates/pear-target.svg", "assets/v6/celebration-pool.jpg"]) assert.ok(m.urls.includes(u), u);
  for (const f of fs.readdirSync(new URL("../assets/crates/", import.meta.url))) {
    const t = fs.readFileSync(new URL("../assets/crates/" + f, import.meta.url), "utf8");
    assert.match(t, /^<svg xmlns=/);
    for (const tag of t.match(/<[a-z]+ [^>]*>/g)) { const names = [...tag.matchAll(/ ([a-z-]+)="/g)].map((x) => x[1]); assert.equal(new Set(names).size, names.length, f + " duplicate attribute"); }
  }
  assert.match(fs.readFileSync(new URL("../app.js", import.meta.url), "utf8"), /canReload: \(\) => \["home", "solved", "transition", "bonusReward"\]/);
});
