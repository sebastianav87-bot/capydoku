// v4.2: exhaustive soundness audit of crates.js deadlocks(): every reachable state it flags must be unsolvable.
// Builds the full (unpruned) state graph per level, computes which states can still reach the goal, and compares.
import fs from "node:fs";
import { parseLevel, newCrateState, stepCrate, DIRS, isCrateSolved, deadlocks } from "../crates.js";
const data = JSON.parse(fs.readFileSync(new URL("../crate-levels.json", import.meta.url)));
const results = [];
for (const def of data.levels) {
  const L = parseLevel(def), key = (s) => s.player + ":" + [...s.crates].sort((a, b) => a - b).join(",");
  const ids = new Map(), states = [], edges = [];
  const add = (s) => { const k = key(s); if (!ids.has(k)) { ids.set(k, states.length); states.push(s); edges.push([]); } return ids.get(k); };
  add(newCrateState(L));
  for (let i = 0; i < states.length; i++) for (const d of Object.keys(DIRS)) { const r = stepCrate(L, states[i], d); if (r.moved) edges[i].push(add(r.state)); }
  const rev = states.map(() => []); edges.forEach((es, i) => es.forEach((j) => rev[j].push(i)));
  const good = new Uint8Array(states.length), q = [];
  states.forEach((s, i) => isCrateSolved(L, s) && (good[i] = 1, q.push(i)));
  while (q.length) { const j = q.pop(); for (const i of rev[j]) if (!good[i]) { good[i] = 1; q.push(i); } }
  let flagged = 0, falsePos = 0, dead = 0;
  states.forEach((s, i) => { const f = deadlocks(L, s).length > 0; if (!good[i]) dead++; if (f) { flagged++; if (good[i]) falsePos++; } });
  results.push({ level: def.name, reachable: states.length, unsolvableReachable: dead, flagged, falsePositives: falsePos, recall: +(flagged / Math.max(1, dead)).toFixed(3) });
}
console.log(JSON.stringify(results, null, 1));
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(results, null, 2) + "\n");
if (results.some((r) => r.falsePositives)) process.exit(1);
