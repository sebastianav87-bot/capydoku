// v5.0: final pick of the 24 new crate ponds (35…150) from the shortlist measured by the Designer's analyze.py
// (reports/v5.0/crates/analysis-*.json). C1–C6 (ponds 5…30) are kept byte-for-byte.
// Rules: the Designer solver's optimal move count must equal the generator's exact reverse-BFS count; no crate starts on
// a fruit; then the fewest silent traps (silent_trap_push_rate, early silent states ≤ 3 pushes, largest silent region),
// then the move count closest to the ramp target, then more pushes. par = round5(optimal × 1.45).
import fs from "node:fs";
import { CRATE_TARGETS } from "./shortlist-crates-v50.mjs";
const R = (f) => new URL(`../${f}`, import.meta.url);
const old = JSON.parse(fs.readFileSync(R("crate-levels.json")));
const keep = old.levels.filter((l) => l.pond <= 30);
if (keep.length !== 6) throw Error("expected C1–C6");
const short = JSON.parse(fs.readFileSync(R("reports/v5.0/crates/shortlist.json"))).levels;
const genMoves = Object.fromEntries(short.map((l) => [l.slot, l.moves]));
const A = fs.readdirSync(R("reports/v5.0/crates")).filter((f) => /^analysis-\d+\.json$/.test(f)).flatMap((f) => JSON.parse(fs.readFileSync(R(`reports/v5.0/crates/${f}`))));
const NAMES = {
  35: "Bamboo Raft", 40: "Summer Gate", 45: "Cicada Crates", 50: "Sunflower Gate", 55: "Lotus Crates", 60: "Bamboo World Gate",
  65: "Acorn Crates", 70: "Harvest Gate", 75: "Maple Leaf Crates", 80: "Lantern Gate", 85: "Mushroom Crates", 90: "Maple World Gate",
  95: "Snowdrift Crates", 100: "Frost Gate", 105: "Pine Crates", 110: "Icicle Gate", 115: "Sled Crates", 120: "Snowcap World Gate",
  125: "Firefly Crates", 130: "Moonrise Gate", 135: "Starlight Crates", 140: "Comet Gate", 145: "Aurora Crates", 150: "Cloudwater Finale",
};
const round5 = (m) => 5 * Math.round((m * 1.45) / 5);
const levels = [...keep], report = [];
let id = 7;
for (const pond of Object.keys(CRATE_TARGETS).map(Number)) {
  const [n, target] = CRATE_TARGETS[pond];
  const c = A.filter((a) => a.pond === pond && a.optimal_moves === genMoves[a.slot] && !a.crates_on_fruit_at_start.length);
  if (!c.length) throw Error(`pond ${pond}: no verified candidate`);
  const cost = (a) => a.silent_trap_push_rate * 100 + a.early_silent_trap_states_le3 * 0.5 + a.max_silent_region / 40 + Math.abs(a.optimal_moves - target) * 0.3 - a.optimal_pushes * 0.02;
  c.sort((a, b) => cost(a) - cost(b));
  const a = c[0];
  const L = { id: id++, slot: `C${id - 1}`, pond, name: NAMES[pond], n, rows: a.rows, fruit: ["watermelon", "banana", "pear"], optimalMoves: a.optimal_moves, optimalPushes: a.optimal_pushes, pushesInMoveOptimal: a.pushes_in_move_optimal, par: round5(a.optimal_moves), solution: a.solution, source: `v5.0 generator (scripts/gen-crates-v50.mjs, exact reverse BFS) · ${short.find((s) => s.slot === a.slot).file}`, review: `analyze.py: silent trap rate ${a.silent_trap_push_rate}, early silent ${a.early_silent_trap_states_le3}, max silent region ${a.max_silent_region}` };
  if (L.par !== a.par_suggested) throw Error(`par mismatch ${pond}`);
  levels.push(L);
  report.push({ pond, n, target, moves: a.optimal_moves, pushes: a.optimal_pushes, par: L.par, silentRate: a.silent_trap_push_rate, earlySilent: a.early_silent_trap_states_le3, maxSilent: a.max_silent_region, trapRate: a.trap_push_rate, pushStates: a.push_states, candidates: c.length });
}
fs.writeFileSync(R("crate-levels.json"), JSON.stringify({ ...old, levels }, null, 1));
fs.writeFileSync(R("reports/v5.0/crate-pick.json"), JSON.stringify({ report }, null, 1));
console.table(report);
