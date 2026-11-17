/* v5.0 explanatory feedback (pure, no DOM). Every capy that is not in the unique solution is still rejected and still
 * costs an orange (v4.3 rev b rule, Nap / Second chance unchanged); this only explains WHY:
 *  - kind "rule": it breaks a visible rule against the capys already on the board (all of them are correct ones):
 *    the row / column / zone that already has a capy, and/or the capys it would touch (8 neighbours, diagonals included);
 *  - kind "offSolution": it breaks no visible rule, it just doesn't fit the (unique) solution. */
export const OFF_SOLUTION_HINT = "Doesn't fit the solution";
export const touching = (n, a, b) => a !== b && Math.max(Math.abs(Math.floor(a / n) - Math.floor(b / n)), Math.abs((a % n) - (b % n))) <= 1;
export function neighbours8(n, i) {
  const r = Math.floor(i / n), c = i % n, out = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue;
    const rr = r + dr, cc = c + dc;
    if (rr >= 0 && cc >= 0 && rr < n && cc < n) out.push(rr * n + cc);
  }
  return out;
}
/** Why a capy on cell i (before it is placed; `cells` = the board before the move) is wrong. */
export function explainCapy(p, cells, i) {
  const n = p.n, r = Math.floor(i / n), c = i % n, z = p.zones[i],
    capys = cells.flatMap((v, j) => (v === 2 && j !== i ? [j] : [])),
    breaks = [];
  const row = capys.filter((j) => Math.floor(j / n) === r),
    col = capys.filter((j) => j % n === c),
    zone = capys.filter((j) => p.zones[j] === z),
    touch = capys.filter((j) => touching(n, i, j));
  if (row.length) breaks.push({ rule: "row", index: r, capys: row, cells: Array.from({ length: n }, (_, k) => r * n + k) });
  if (col.length) breaks.push({ rule: "column", index: c, capys: col, cells: Array.from({ length: n }, (_, k) => k * n + c) });
  if (zone.length) breaks.push({ rule: "zone", index: z, capys: zone, cells: p.zones.flatMap((zz, k) => (zz === z ? [k] : [])) });
  if (touch.length) breaks.push({ rule: "touch", capys: touch, cells: touch });
  if (!breaks.length) return { kind: "offSolution", cell: i, breaks, message: OFF_SOLUTION_HINT };
  const say = { row: `Row ${r + 1} already has a capy`, column: `Column ${c + 1} already has a capy`, zone: "This zone already has a capy", touch: "Touches a capy · diagonals count" };
  return { kind: "rule", cell: i, breaks, message: breaks.slice(0, 2).map((b) => say[b.rule]).join(" · ") };
}
/** Zones that hold a capy (on a v5.0 board every capy left standing is a correct one), as a Set of zone ids. */
export function solvedZones(p, cells) {
  return new Set(cells.flatMap((v, i) => (v === 2 && !p.rocks.includes(i) ? [p.zones[i]] : [])));
}
/** The cell that carries a solved zone's small mark: its top-left-most cell. */
export function zoneMarkCells(p, zones) {
  const out = new Map();
  p.zones.forEach((z, i) => { if (zones.has(z) && !out.has(z) && !p.rocks.includes(i)) out.set(z, i); });
  return new Set(out.values());
}
