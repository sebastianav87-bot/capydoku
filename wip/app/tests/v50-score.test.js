// v5.0 pond score formula, edge cases, best-only-rises, world totals and save cleaning.
import test from "node:test";
import assert from "node:assert/strict";
import { logicScore, crateScore, timeBonus, crateOranges, crateTargetSeconds, recordScore, worldScore, worldScores, cleanScores, MAX_SCORE, TARGET_SECONDS } from "../score.js";
import { fresh, sanitize } from "../core.js";
test("target times per board size are the documented table", () => {
  assert.deepEqual({ ...TARGET_SECONDS }, { 5: 120, 6: 150, 7: 180, 8: 240, 9: 330, 10: 420 });
  assert.equal(crateTargetSeconds(40), 60);
  assert.equal(crateTargetSeconds(115), 173);
});
test("time bonus: linear under the target, 0 at/over it, never negative, garbage → 0", () => {
  assert.equal(timeBonus(0, 180), 500);
  assert.equal(timeBonus(90, 180), 250);
  assert.equal(timeBonus(179.9, 180), 0);
  assert.equal(timeBonus(180, 180), 0);
  assert.equal(timeBonus(9999, 180), 0);
  for (const bad of [NaN, -1, Infinity, undefined, null]) assert.equal(timeBonus(bad, 180), 0);
  assert.equal(timeBonus(10, 0), 0);
  assert.equal(timeBonus(10, undefined), 0);
});
test("logic score = (1000 + 200×oranges + time) × help × role", () => {
  assert.equal(logicScore({ id: 1, n: 7, oranges: 3, seconds: 0 }), 2100);
  assert.equal(logicScore({ id: 1, n: 7, oranges: 0, seconds: 999 }), 1000);
  assert.equal(logicScore({ id: 2, n: 7, oranges: 2, seconds: 90 }), 1000 + 400 + 250);
  assert.equal(logicScore({ id: 9, n: 8, oranges: 3, seconds: 0 }), 3150); // boss ×1.5
  assert.equal(logicScore({ id: 9, n: 8, oranges: 3, seconds: 0, helped: true }), 1575); // Second chance halves
  assert.equal(logicScore({ id: 3, n: 7, oranges: 1, seconds: Infinity, helped: true }), 600);
  assert.equal(logicScore({ id: 3, n: 7, oranges: 7, seconds: 999 }), 1600); // clamped to 3 oranges
  assert.equal(logicScore({ id: 3, n: 7, oranges: -2, seconds: 999 }), 1000);
  assert.equal(logicScore({ id: 149, n: 10, oranges: 0, seconds: 210 }), Math.round((1000 + 250) * 1.5));
});
test("crate score: orange equivalent from moves vs par, ×1.5, Show me halves", () => {
  assert.equal(crateOranges(40, 40), 3);
  assert.equal(crateOranges(50, 40), 2);
  assert.equal(crateOranges(51, 40), 1);
  assert.equal(crateOranges(60, 40), 1);
  assert.equal(crateOranges(61, 40), 0);
  assert.equal(crateOranges(undefined, 40), 0);
  assert.equal(crateScore({ id: 5, moves: 26, par: 40, seconds: 0 }), 3150);
  assert.equal(crateScore({ id: 5, moves: 26, par: 40, seconds: 30 }), Math.round((1000 + 600 + 250) * 1.5));
  assert.equal(crateScore({ id: 5, moves: 26, par: 40, seconds: 999, shown: true }), Math.round(1600 * 1.5 * 0.5));
  assert.equal(crateScore({ id: 150, moves: 1000, par: 200, seconds: 999 }), 1500);
  assert.equal(MAX_SCORE, 3150);
});
test("best score only rises; world score sums bests; unscored ponds add nothing", () => {
  const p = fresh();
  assert.deepEqual(recordScore(p, 1, 1500, 5), { score: 1500, best: 1500, newBest: true, previous: null });
  assert.equal(recordScore(p, 1, 1200, 6).best, 1500);
  assert.equal(p.scores[1].best, 1500);
  assert.equal(recordScore(p, 1, 1900, 7).newBest, true);
  recordScore(p, 30, 2000);
  recordScore(p, 31, 1111);
  assert.deepEqual(worldScore(p, 0), { world: 0, total: 3900, scored: 2, of: 30, ponds: [{ id: 1, score: 1900 }, { id: 30, score: 2000 }] });
  assert.equal(worldScore(p, 1).total, 1111);
  assert.equal(worldScores(p).length, 5);
  assert.equal(worldScore(p, 4).scored, 0);
});
test("scores survive sanitize; invalid ids/values are dropped; old saves start unscored", () => {
  const raw = { ...fresh(), completed: [1, 2], scores: { 1: { best: 2000, at: 1 }, 2: { best: 99999 }, 151: { best: 10 }, x: { best: 5 }, 3: { best: 1.5 } } };
  assert.deepEqual(sanitize(raw).scores, { 1: { best: 2000, at: 1 } });
  const old = { ...fresh(), completed: [1, 2, 3] };
  delete old.scores;
  assert.deepEqual(sanitize(old).scores, {});
  assert.deepEqual(cleanScores(null), {});
});
