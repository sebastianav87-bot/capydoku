// Approved v5.0 selections: suffix : zero-based candidate index : minimum pushes.
// Reproducible import; C1–C6 are always read from the published v4.3.1 at the repo root.
import fs from "node:fs";
import assert from "node:assert/strict";
import { parseLevel, newCrateState, stepCrate, isCrateSolved } from "../crates.js";
const R = (f) => new URL(`../${f}`, import.meta.url);
const old = JSON.parse(fs.readFileSync(new URL("../../../crate-levels.json", import.meta.url)));
const NAMES = {
  35: "Bamboo Raft", 40: "Summer Gate", 45: "Cicada Crates", 50: "Sunflower Gate", 55: "Lotus Crates", 60: "Bamboo World Gate",
  65: "Acorn Crates", 70: "Harvest Gate", 75: "Maple Leaf Crates", 80: "Lantern Gate", 85: "Mushroom Crates", 90: "Maple World Gate",
  95: "Snowdrift Crates", 100: "Frost Gate", 105: "Pine Crates", 110: "Icicle Gate", 115: "Sled Crates", 120: "Snowcap World Gate",
  125: "Firefly Crates", 130: "Moonrise Gate", 135: "Starlight Crates", 140: "Comet Gate", 145: "Aurora Crates", 150: "Cloudwater Finale",
};
const selections = "9-s902:172:17, 9-s902:224:14, 9-s902:271:21, 9-s901:392:31, 9-s901:425:28, 9-s902:391:27, 9-s901:464:24, 9-s902:417:28, 9-s901:492:32, 9-s901:505:24, 9-s902:453:33, 8-s802:1375:31, 9-s901:528:26, 9-s901:534:36, 8-s802:1382:44, 8-s802:1387:42, 9-s902:474:23, 8-s801:1355:34, 8-s802:1395:27, 8-s802:1396:33, 8-s802:1397:37, 9-s901:552:50, 8-s802:1399:27, 9-s901:554:44".split(", ");
const levels = [...old.levels], report = [];
const dirs = { U: "up", D: "down", L: "left", R: "right" };
for (const [k, entry] of selections.entries()) {
  const [suffix, index, minimumPushes] = entry.split(":"), pond = 35 + 5 * k;
  const file = `reports/v5.0/crates/cand-${suffix}.json`;
  const candidate = JSON.parse(fs.readFileSync(R(file))).levels[Number(index)];
  assert.ok(candidate, `${file}[${index}] missing`);
  const { n, rows, moves, pushes, solution } = candidate;
  const c = { id: k + 7, slot: `C${k + 7}`, pond, name: NAMES[pond], n, rows,
    fruit: ["watermelon", "banana", "pear"], optimalMoves: moves,
    optimalPushes: Number(minimumPushes), pushesInMoveOptimal: pushes,
    par: 5 * Math.round(moves * 1.45 / 5), solution,
    source: `v5.0 generator · ${file} · index ${index}`,
    review: "User-selected candidate; minimum pushes supplied with selection" };
  const L = parseLevel(c);
  let state = newCrateState(L);
  assert.ok(!L.start.crates.some((x) => L.goals.includes(x)), `pond ${pond}: crate on fruit`);
  for (const ch of solution) {
    const result = stepCrate(L, state, dirs[ch.toUpperCase()]);
    assert.ok(result.moved, `pond ${pond}: blocked solution`);
    state = result.state;
  }
  assert.ok(isCrateSolved(L, state), `pond ${pond}: solution`);
  assert.equal(state.moves, moves);
  assert.equal(state.pushes, pushes);
  levels.push(c);
  report.push({ pond, file, index: Number(index), n, moves, minimumPushes: c.optimalPushes,
    pushesInMoveOptimal: pushes, par: c.par });
}
fs.writeFileSync(R("crate-levels.json"), JSON.stringify({ ...old, levels }, null, 1) + "\n");
fs.writeFileSync(R("reports/v5.0/crate-pick.json"), JSON.stringify({ report }, null, 1) + "\n");
console.table(report);
// Replace only the dry-run crate placeholders; keep every logic board and both daily pools.
const campaign = JSON.parse(fs.readFileSync(R("reports/v5.0/levels-dry.json")));
for (const c of levels.filter((c) => c.pond > 30)) {
  const placeholder = campaign.levels[c.pond - 1];
  assert.equal(placeholder.id, c.pond);
  assert.equal(placeholder.crate, null);
  Object.assign(placeholder, { n: c.n, crate: c.id });
}
fs.writeFileSync(R("levels.json"), JSON.stringify(campaign) + "\n");
const ramp = JSON.parse(fs.readFileSync(R("reports/v5.0/world-ramp.json")));
for (const world of ramp) world.crateMoves = levels.filter((c) => Math.ceil(c.pond / 30) === world.world).map((c) => c.optimalMoves).join(",");
fs.writeFileSync(R("reports/v5.0/world-ramp.json"), JSON.stringify(ramp, null, 1) + "\n");
