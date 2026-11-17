// v5.0: shortlist crate candidates for ponds 35…150 (24 new levels; C1–C6 on 5…30 stay unchanged).
// Target optimal moves ramp within each world (world gate highest) and across worlds; the Designer's analyze.py then
// measures silent traps on the shortlist (scripts/pick-crates-v50.mjs makes the final choice).
import fs from "node:fs";
const R = (f) => new URL(`../${f}`, import.meta.url);
export const CRATE_TARGETS = {
  35: [8, 60], 40: [8, 68], 45: [8, 72], 50: [8, 78], 55: [8, 82], 60: [8, 88],
  65: [8, 66], 70: [8, 74], 75: [8, 80], 80: [9, 86], 85: [8, 90], 90: [9, 96],
  95: [8, 74], 100: [9, 80], 105: [8, 88], 110: [9, 94], 115: [9, 100], 120: [9, 106],
  125: [9, 84], 130: [9, 92], 135: [9, 100], 140: [9, 108], 145: [9, 116], 150: [9, 124],
};
if (import.meta.url === `file://${process.argv[1]}`) {
const per = Number(process.argv[2] || 6);
const cands = {};
for (const f of fs.readdirSync(R("reports/v5.0/crates")).filter((f) => /^cand-.*\.json$/.test(f)))
  for (const l of JSON.parse(fs.readFileSync(R(`reports/v5.0/crates/${f}`))).levels) (cands[l.n] ||= []).push({ ...l, file: f });
const seen = new Set(), out = [];
for (const [pond, [n, m]] of Object.entries(CRATE_TARGETS)) {
  // exact move target first (±2 if short), more pushes and more rocks-free floor preferred (= more crate work, less corridor walking)
  const pool = (cands[n] || []).filter((l) => !seen.has(l.rows.join("/")) && Math.abs(l.moves - m) <= 2);
  pool.sort((a, b) => Math.abs(a.moves - m) - Math.abs(b.moves - m) || b.pushes - a.pushes);
  const pick = pool.slice(0, per);
  if (pick.length < 2) console.error(`pond ${pond}: only ${pick.length} candidates near ${n}×${n}/${m}`);
  for (const l of pick) { seen.add(l.rows.join("/")); out.push({ slot: `P${pond}-${out.length}`, pond: Number(pond), rows: l.rows, moves: l.moves, pushes: l.pushes, file: l.file }); }
}
fs.writeFileSync(R("reports/v5.0/crates/shortlist.json"), JSON.stringify({ levels: out }));
console.log(`${out.length} shortlisted`);
}
