// v4.3 build: roles, levels ramp, crate ramp, crate lilies / Show me / Par orange, and the one-time layout migration
// with v4.1, v4.2 and v4.2.1 saves (plus fuzzed saves: no lily lost, golden count kept, idempotent).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fresh, sanitize, load, save, KEY, migrateLayout, logic, enumerate, boardSignature, dailyPuzzle } from "../core.js";
import { role, isBoss, isCrate, isGate, CRATE_PONDS, BOSS_PONDS, GATE_PONDS, pondLabel } from "../roles.js";
import { parseLevel, newCrateState, stepCrate, isCrateSolved, cleanBonus, grantSpare, claimSpare, awardCrate, SHOW_ME_AFTER, SPARE_PONDS } from "../crates.js";
import { totalLilies, lilyCount, targetMs } from "../rewards.js";
import { awardPureBoss } from "../powers.js";
import { BUILD } from "../build-info.js";
const data = JSON.parse(fs.readFileSync(new URL("../levels.json", import.meta.url)));
const crateData = JSON.parse(fs.readFileSync(new URL("../crate-levels.json", import.meta.url)));
const memory = (v) => { const items = {}; if (v) items[KEY] = JSON.stringify(v); return { items, getItem: (k) => items[k] ?? null, setItem: (k, x) => (items[k] = x) }; };
const L3 = (c = true, n = true, u = true) => ({ cleared: c, noMistakes: n, underTarget: u, bestMs: 100000, bestMistakes: 0, targetVersion: 1 });
const PLAN = { 1: [7, 0, 55], 2: [7, 0, 110], 3: [7, 0, 150], 4: [7, 0, 210], 6: [8, 0, 260], 7: [8, 0, 320], 8: [8, 0, 380], 9: [8, 0, 450], 11: [8, 0, 250], 12: [8, 0, 350], 13: [8, 0, 420], 14: [9, 0, 480], 16: [9, 0, 530], 17: [9, 0, 590], 18: [9, 0, 650], 19: [9, 0, 720], 21: [9, 1, 450], 22: [9, 2, 560], 23: [9, 1, 640], 24: [9, 3, 720], 26: [9, 2, 780], 27: [9, 3, 840], 28: [9, 2, 900], 29: [10, 2, 1000] };

// v4.2 / v4.2.1 save shape (schema 3, bonus v1, layout absent). v4.1 = same without the bonus block.
function v42Save({ upTo = 30, golden = [10, 20, 30], solved = [1, 2, 3], best = { 1: 18, 2: 33, 3: 80 }, spare = 16, sessions = true } = {}) {
  const completed = Array.from({ length: upTo }, (_, i) => i + 1),
    lilies = Object.fromEntries(completed.map((id) => [id, L3(true, id % 2 === 0, id % 3 === 0)]));
  return {
    version: 3, nickname: "Seb", lilies, dailyLilies: { "2026-11-14": L3() }, completed, selected: "Bloom", starterChosen: true,
    goldenLilies: golden.filter((g) => g <= upTo), legacySelected: null, haptics: true, audio: false, music: true, tutorialSeen: true,
    powerIntroSeen: ["Bloom:secondChance"], rockIntroSeen: true, rocksReached: upTo >= 21, daily: { lastDay: 20405, streak: 6 },
    sessions: sessions ? { "pond-12": { cells: Array(49).fill(0).map((_, i) => (i === 3 ? 2 : i === 9 ? 1 : 0)), lives: 2, signature: "7|old|" }, "pond-5": { cells: Array(36).fill(0).map((_, i) => (i === 0 ? 2 : 0)), lives: 3, signature: "6|old|" } } : {},
    bonus: { v: 1, solved, best, spare: spare ? { forPond: spare } : null, dpad: true, controlsSeen: true },
  };
}
const v41Save = (o) => { const s = v42Save(o); delete s.bonus; return s; };

test("v4.3 roles (world 1 in v5.0): crate 5/10/15/20/25/30, gates 10/20/30, bosses 9/19/29, breathers 11/21", () => {
  assert.deepEqual(CRATE_PONDS.slice(0, 6), [5, 10, 15, 20, 25, 30]);
  assert.deepEqual(GATE_PONDS.slice(0, 3), [10, 20, 30]);
  assert.deepEqual(BOSS_PONDS.slice(0, 3), [9, 19, 29]);
  assert.deepEqual(Array.from({ length: 30 }, (_, i) => role(i + 1)).join(","),
    "normal,normal,normal,normal,crate,normal,normal,normal,boss,gate,breather,normal,normal,normal,crate,normal,normal,normal,boss,gate,breather,normal,normal,normal,crate,normal,normal,normal,boss,gate");
  assert.equal(pondLabel(29), "Boss Pond 29");
  assert.equal(pondLabel(30), "World Gate Pond 30"); // v5.0: the finale is 150
  assert.equal(pondLabel(10), "Gate Crate Pond 10");
  assert.equal(pondLabel(15), "Crate Pond 15");
});
test("v4.3 levels.json: 24 logic ponds on the PLAN ramp, all no-guess + unique, boss 29 10×10 near 1000", () => {
  assert.equal(data.contentVersion, "5.0"); // v5.0: world 1 = these 30 ponds, unchanged
  assert.equal(data.levels.length, 150);
  data.levels.forEach((l, i) => assert.equal(l.id, i + 1));
  for (const l of data.levels.slice(0, 30)) {
    if (isCrate(l.id)) { assert.ok(l.crate, `pond ${l.id} is a crate slot`); assert.deepEqual(l.zones, []); continue; }
    const [n, rocks] = PLAN[l.id];
    assert.equal(l.n, n, `pond ${l.id} size`);
    assert.equal(l.rocks.length, rocks, `pond ${l.id} rocks`);
    assert.ok(logic(l).ok, `pond ${l.id} no-guess`);
    assert.equal(enumerate(l).length, 1, `pond ${l.id} unique`);
    assert.ok(Math.max(...l.zones) < 10);
  }
  assert.ok(Math.max(...data.levels.filter((l) => !l.crate).map((l) => l.n)) <= 10);
  assert.ok(data.levels.slice(0, 30).filter((l) => !l.crate && l.id !== 29).every((l) => l.n <= 9), "world 1: 9×9 cap except boss 29");
  const pick = JSON.parse(fs.readFileSync(new URL("../reports/v4.3/levels-pick.json", import.meta.url))).report;
  for (const r of pick.filter((r) => r.target)) assert.ok(Math.abs(r.devPct) <= 10, `pond ${r.id} within 10% of target`);
  assert.ok(Math.abs(pick.find((r) => r.id === 29).score - 1000) <= 50);
  assert.deepEqual(data.v1Preserved, []);
});
test("v4.3 Daily pools: 365 + 365 at 7×7/8×8, rocks only in the eligible pool, all no-guess + unique", () => {
  assert.equal(data.daily.length, 365);
  assert.equal(data.dailySafe.length, 365);
  assert.ok([...data.daily, ...data.dailySafe].every((b) => [7, 8].includes(b.n)));
  assert.ok(data.dailySafe.every((b) => b.rocks.length === 0));
  for (const b of [...data.daily.slice(0, 40), ...data.dailySafe.slice(0, 40)]) assert.equal(enumerate(b).length, 1);
  const p = dailyPuzzle(data, new Date(2026, 10, 15), true);
  assert.equal(p.zones.length, p.n * p.n);
});
test("v4.3 crate ramp (Designer-reviewed): 6 ponds keyed 5..30, sizes 7/6/7/7/8/8, one par rule, stored solutions solve", () => {
  assert.equal(crateData.schema, 2);
  assert.deepEqual(crateData.levels.map((l) => l.pond), CRATE_PONDS);
  crateData.levels = crateData.levels.slice(0, 6); // v5.0 adds 24 more (tests/v50.test.js); C1–C6 stay as reviewed
  assert.deepEqual(crateData.levels.map((l) => l.n), [7, 6, 7, 7, 8, 8]);
  assert.deepEqual(crateData.levels.map((l) => l.optimalMoves), [26, 30, 39, 57, 66, 80]); // Designer v4.3 review
  assert.deepEqual(crateData.levels.map((l) => l.optimalPushes), [9, 13, 17, 20, 23, 26]);
  assert.deepEqual(crateData.levels.map((l) => l.par), [40, 45, 55, 85, 95, 115]);
  const D = { U: "up", D: "down", L: "left", R: "right" };
  for (const l of crateData.levels) {
    assert.equal(l.par, Math.round((l.optimalMoves * 1.45) / 5) * 5, `${l.pond} par = moves × 1.45 to the nearest 5`);
    const lv = parseLevel(l);
    let s = newCrateState(lv);
    for (const c of l.solution) { const r = stepCrate(lv, s, D[c.toUpperCase()]); assert.ok(r.moved); s = r.state; }
    assert.ok(isCrateSolved(lv, s));
    assert.equal(s.moves, l.optimalMoves);
  }
  // Ponds 10 and 20 keep the exact live Crate Cove 3 / Crate Cove 5 boards (their solves carry over).
  const old = JSON.parse(fs.readFileSync(new URL("../reports/v4.3/crate-ramp-draft.json", import.meta.url))).levels;
  assert.match(old[1].source, /Crate Cove 3/);
  assert.match(old[3].source, /Crate Cove 5/);
});
test("v4.3 crate lilies: Packed / Clean run / Par; Show me gives Packed only; never removes a lily", () => {
  const p = fresh();
  let r = awardCrate(p, 15, 55, { moves: 60, clean: false });
  assert.deepEqual(r.newly, [true, false, false]);
  assert.equal(r.granted, false);
  assert.ok(p.completed.includes(15));
  r = awardCrate(p, 15, 55, { moves: 50, clean: true });
  assert.deepEqual(r.newly, [false, true, true]);
  assert.equal(r.granted, true);
  assert.deepEqual(p.bonus.spare, { forPond: 16 });
  assert.equal(p.bonus.best[15], 50);
  r = awardCrate(p, 15, 55, { moves: 41, clean: true, shown: true });
  assert.deepEqual(r.newly, [false, false, false]);
  assert.equal(p.bonus.best[15], 50, "Show me never sets a best");
  assert.deepEqual(p.lilies[15].cleared && p.lilies[15].noMistakes && p.lilies[15].underTarget, true);
  const q = fresh();
  r = awardCrate(q, 5, 40, { moves: 26, clean: true, shown: true });
  assert.deepEqual(r.newly, [true, false, false]);
  assert.equal(r.par, false);
  assert.equal(q.bonus.spare, null, "no orange from Show me");
  assert.equal(SHOW_ME_AFTER, 3);
});
test("v4.3 spare orange: only from Par, for the next pond, never stacks, none from the finale", () => {
  assert.deepEqual(SPARE_PONDS.slice(0, 6), [6, 11, 16, 21, 26, 31]); // v5.0: 30 is a world gate, the finale is 150
  assert.equal(SPARE_PONDS.at(-1), 146);
  const p = fresh();
  assert.equal(awardCrate(p, 150, 180, { moves: 120, clean: true }).granted, false);
  assert.equal(p.bonus.spare, null);
  assert.equal(grantSpare(p.bonus, 10), true);
  assert.deepEqual(p.bonus.spare, { forPond: 11 });
  assert.equal(grantSpare(p.bonus, 10), false);
  assert.equal(claimSpare(p.bonus, 12), false);
  assert.equal(claimSpare(p.bonus, 11, true), false, "Daily leaves it waiting");
  assert.equal(claimSpare(p.bonus, 11), true);
  assert.equal(p.bonus.spare, null);
  for (const f of [6, 11, 16, 21, 26]) assert.deepEqual(cleanBonus({ v: 2, best: {}, spare: { forPond: f } }).spare, { forPond: f });
  assert.equal(cleanBonus({ v: 2, spare: { forPond: 151 } }).spare, null);
});
test("v4.3 golden lily: pure boss solve on 9/19/29 only", () => {
  assert.ok([9, 19, 29].every(isBoss) && ![10, 20, 30].some(isBoss));
  const src = fs.readFileSync(new URL("../powers.js", import.meta.url), "utf8");
  assert.match(src, /isBoss\(p\.id\)/);
  assert.doesNotMatch(src, /\[10, 20, 30\]/);
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
  assert.doesNotMatch(app, /% 10 === 0/);
  assert.doesNotMatch(app, /offerHTML|Optional bonus|not part of 100%/);
  assert.doesNotMatch(fs.readFileSync(new URL("../bonus-ui.js", import.meta.url), "utf8"), /not part of 100%|"Optional"|>Optional</);
});
test("v4.3 lily targets for 8×8/9×9/10×10", () => {
  assert.equal(targetMs(8), 360000);
  assert.equal(targetMs(9), 450000);
  assert.equal(targetMs(10), 570000);
  assert.equal(targetMs(7), 270000);
});
for (const [label, make] of [["v4.2.1", v42Save], ["v4.2", v42Save], ["v4.1", v41Save]])
  test(`v4.3 migration from a ${label} save: no lily lost, goldens 10/20/30 → 9/19/29, crate solves carry, sessions dropped once`, () => {
    const raw = make(), before = totalLilies({ lilies: raw.lilies }), store = memory(raw);
    const l = load(store, data), p = l.progress;
    assert.equal(l.readOnly, false);
    assert.equal(p.layout, 2);
    assert.ok(l.migrated);
    assert.ok(totalLilies(p) >= before, "no lily lost");
    for (const [id, r] of Object.entries(raw.lilies)) for (const k of ["cleared", "noMistakes", "underTarget"]) if (r[k]) assert.equal(p.lilies[id][k], true, `pond ${id} ${k}`);
    assert.deepEqual(p.goldenLilies.sort((a, b) => a - b), [9, 19, 29]);
    assert.equal(p.goldenLilies.length, raw.goldenLilies.length, "golden count kept");
    assert.deepEqual(Object.keys(p.sessions).filter((k) => k.startsWith("pond-")), [], "half-played boards dropped");
    assert.deepEqual(l.contentMigration.dropped.sort((a, b) => a - b), [5, 12]);
    assert.equal(p.daily.streak, 6);
    assert.ok(p.dailyLilies["2026-11-14"].cleared);
    if (label === "v4.1") {
      assert.equal(p.bonus.legacy, null);
      assert.deepEqual(p.bonus.best, {});
    } else {
      assert.deepEqual(p.bonus.legacy, { solved: [1, 2, 3], best: { 1: 18, 2: 33, 3: 80 } });
      assert.deepEqual(p.bonus.best, { 10: 33, 20: 80 });
      assert.deepEqual(p.bonus.spare, { forPond: 16 });
      assert.equal(p.bonus.dpad, true);
    }
    // Second launch: nothing else changes and no second "Ponds refreshed".
    const again = load(store, data);
    assert.deepEqual(again.progress, p);
    assert.equal(again.contentMigration.dropped.length, 0);
    assert.equal(again.migrated, false);
  });
test("v4.3 migration: Crate Cove 3/5 solves clear gate ponds 10/20 for a mid-game player (Par only when best ≤ par)", () => {
  const raw = v42Save({ upTo: 8, golden: [], solved: [1, 2, 3], best: { 1: 20, 2: 46, 3: 85 }, spare: 6, sessions: false });
  const p = load(memory(raw), data).progress;
  assert.ok(p.completed.includes(10) && p.completed.includes(20));
  assert.deepEqual(p.lilies[10], { ...p.lilies[10], cleared: true, noMistakes: false, underTarget: false });
  assert.deepEqual(p.lilies[20], { ...p.lilies[20], cleared: true, noMistakes: false, underTarget: true });
  assert.ok(!p.completed.includes(9), "Pond 9 not granted");
  assert.deepEqual(p.bonus.spare, { forPond: 6 });
  assert.deepEqual(p.bonus.legacy.solved, [1, 2, 3], "Crate Cove 1 kept in legacy");
});
test("v4.3 migration: a golden lily on 10 also marks boss 9 cleared when it was not", () => {
  const raw = v42Save({ upTo: 10, golden: [10], solved: [], sessions: false });
  raw.completed = raw.completed.filter((x) => x !== 9);
  delete raw.lilies[9];
  const p = load(memory(raw), data).progress;
  assert.deepEqual(p.goldenLilies, [9]);
  assert.ok(p.completed.includes(9) && p.lilies[9].cleared);
});
test("v4.3 migration: fresh v4.3 saves are layout 2 and untouched; layout-2 goldens survive sanitize", () => {
  const f = fresh();
  assert.equal(f.layout, 2);
  assert.equal(migrateLayout(f).changed, false);
  const p = { ...fresh(), completed: [1, 2, 3, 4, 5, 6, 7, 8, 9], goldenLilies: [9] };
  assert.deepEqual(sanitize(JSON.parse(JSON.stringify(p))).goldenLilies, [9]);
  const store = memory();
  save(store, p);
  const back = load(store, data).progress;
  assert.deepEqual(back.goldenLilies, [9]);
  assert.equal(back.layout, 2);
});
test("v4.3 migration: 10×10 / 9×9 / 8×8 sessions survive sanitize and resume when the board matches", () => {
  const q = data.levels[28], p = { ...fresh(), completed: Array.from({ length: 28 }, (_, i) => i + 1) };
  p.sessions["pond-29"] = { cells: Array(100).fill(0).map((_, i) => (i === 0 ? 1 : 0)), lives: 3, signature: boardSignature(q) };
  const store = memory();
  save(store, p);
  const back = load(store, data);
  assert.ok(back.progress.sessions["pond-29"]);
  assert.equal(back.progress.sessions["pond-29"].cells.length, 100);
  assert.equal(back.contentMigration.dropped.length, 0);
});
test("v4.3 migration fuzz: 400 random v4.1/v4.2 saves — no lily lost, golden count kept, idempotent", () => {
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32);
  for (let t = 0; t < 400; t++) {
    const upTo = Math.floor(rnd() * 31), golden = [10, 20, 30].filter(() => rnd() < 0.5), solved = [1, 2, 3].filter(() => rnd() < 0.5),
      best = Object.fromEntries(solved.map((k) => [k, 10 + Math.floor(rnd() * 120)])),
      raw = (rnd() < 0.3 ? v41Save : v42Save)({ upTo, golden, solved, best, spare: [null, 6, 16, 26][Math.floor(rnd() * 4)], sessions: rnd() < 0.5 });
    const kept = raw.goldenLilies.filter((g) => raw.completed.includes(g)).length, store = memory(raw), a = load(store, data).progress;
    for (const [id, r] of Object.entries(raw.lilies)) for (const k of ["cleared", "noMistakes", "underTarget"]) if (r[k]) assert.equal(a.lilies[id][k], true);
    assert.equal(a.goldenLilies.length, kept);
    assert.ok(a.goldenLilies.every(isBoss));
    for (const id of raw.completed) assert.ok(a.completed.includes(id));
    const b = load(store, data).progress;
    assert.deepEqual(b, a);
    assert.equal(migrateLayout(b).changed, false);
  }
});
test("v4.3 build labels", () => {
  assert.equal(BUILD.version, "4.3.1"); // v4.3.1 = v4.3 + iPhone fit
  assert.match(BUILD.cache, /^capydoku-v4\.3\.1-[0-9a-f]{12}$/);
  const pkg = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url)));
  assert.equal(pkg.version, "4.3.0");
});
test("Designer v4.3 check: zone colours 8–10, open-square zone-8 pattern, 10×10 ≥33 px at 360", async () => {
  const { colors } = await import("../theme.js");
  assert.deepEqual(colors.slice(7).map((c) => c[0]), ["#A6A5E7", "#E8A0BF", "#BCD49E"]);
  assert.equal(colors.length, 10);
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const z7 = app.match(/if \(z === 7\) body = `([^`]*)`/)[1];
  assert.match(z7, /<rect /);
  assert.doesNotMatch(z7, /l8 8|l-8 8/, "zone 8 must not use × crosses");
  const { boardMetrics } = await import("../layout.js");
  assert.ok(boardMetrics(10, 360).cell_px >= 33);
  assert.equal(boardMetrics(10, 412).cell_px, (412 * 35 / 36 - 22 - 27) / 10);
  for (const n of [7, 8, 9]) assert.equal(boardMetrics(n, 360).board_px, 350);
});
