/* v4.2 crate bonus: pure Sokoban rules (no DOM). Levels are stored with an outer '#' border so the Designer's
 * verify/solver.py reads them unchanged; in the app that border is the board frame and only the n×n interior
 * is drawn. Cells are interior indices r*n+c. '#' inside = solid rock. */
export const DIRS = Object.freeze({ up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] });
export const FRUITS = Object.freeze(["watermelon", "banana", "pear"]); // never orange or mango (HUD oranges are lives)

export function parseLevel(def) {
  const rows = def.rows,
    n = rows.length - 2;
  if (!rows.every((r) => r.length === n + 2)) throw Error("crate level must be square");
  const rocks = [],
    goals = [],
    crates = [];
  let player = -1;
  for (let r = 1; r <= n; r++)
    for (let c = 1; c <= n; c++) {
      const ch = rows[r][c],
        i = (r - 1) * n + (c - 1);
      if (ch === "#") rocks.push(i);
      if (".*+".includes(ch)) goals.push(i);
      if ("$*".includes(ch)) crates.push(i);
      if ("@+".includes(ch)) player = i;
    }
  // the outer ring must be solid: it becomes the board frame
  for (let k = 0; k < n + 2; k++)
    if (rows[0][k] !== "#" || rows[n + 1][k] !== "#" || rows[k][0] !== "#" || rows[k][n + 1] !== "#") throw Error("open border");
  const fruit = Object.fromEntries(goals.map((g, k) => [g, (def.fruit || FRUITS)[k % 3]]));
  return Object.freeze({ id: def.id, name: def.name, n, rocks: Object.freeze(rocks), goals: Object.freeze(goals), fruit: Object.freeze(fruit), start: Object.freeze({ player, crates: Object.freeze([...crates].sort((a, b) => a - b)) }), par: def.par ?? null, optimalMoves: def.optimalMoves ?? null, optimalPushes: def.optimalPushes ?? null });
}
export const newCrateState = (L) => ({ player: L.start.player, crates: [...L.start.crates], moves: 0, pushes: 0 });
export function neighbor(L, i, dir) {
  const [dr, dc] = DIRS[dir],
    r = Math.floor(i / L.n) + dr,
    c = (i % L.n) + dc;
  return r < 0 || c < 0 || r >= L.n || c >= L.n ? -1 : r * L.n + c;
}
export const solid = (L, i) => i < 0 || L.rocks.includes(i);
export const packedCount = (L, s) => s.crates.filter((c) => L.goals.includes(c)).length;
export const isCrateSolved = (L, s) => L.goals.every((g) => s.crates.includes(g));

/** One step. Returns {state, moved, pushed, landed, crate} — state is unchanged (same object) when blocked. */
export function stepCrate(L, s, dir) {
  const to = neighbor(L, s.player, dir);
  if (solid(L, to)) return { state: s, moved: false, pushed: false, landed: false };
  const k = s.crates.indexOf(to);
  if (k < 0) return { state: { ...s, player: to, moves: s.moves + 1 }, moved: true, pushed: false, landed: false };
  const beyond = neighbor(L, to, dir);
  if (solid(L, beyond) || s.crates.includes(beyond)) return { state: s, moved: false, pushed: false, landed: false };
  const crates = [...s.crates];
  crates[k] = beyond;
  return {
    state: { ...s, player: to, crates, moves: s.moves + 1, pushes: s.pushes + 1 },
    moved: true,
    pushed: true,
    from: to,
    crate: beyond,
    landed: L.goals.includes(beyond) && !L.goals.includes(to),
  };
}
/** Tap to walk: shortest path over free floor, never pushing. Returns a list of dirs or null. */
export function walkPath(L, s, target) {
  if (target === s.player) return [];
  if (target < 0 || target >= L.n * L.n || solid(L, target) || s.crates.includes(target)) return null;
  const prev = new Map([[s.player, null]]),
    q = [s.player];
  while (q.length) {
    const i = q.shift();
    for (const d of Object.keys(DIRS)) {
      const j = neighbor(L, i, d);
      if (solid(L, j) || s.crates.includes(j) || prev.has(j)) continue;
      prev.set(j, [i, d]);
      if (j === target) {
        const out = [];
        for (let x = j; prev.get(x); x = prev.get(x)[0]) out.unshift(prev.get(x)[1]);
        return out;
      }
      q.push(j);
    }
  }
  return null;
}

/* Deadlocks: only situations that are PROVABLY unsolvable (verified exhaustively in tests/v42.test.js):
 * 1. corner: a crate off-fruit with solid cells on one vertical and one horizontal side;
 * 2. frozen 2×2: four cells all crate/solid, with at least one off-fruit crate;
 * 3. dead wall line: a crate off-fruit against a solid side whose whole run along that side (until a
 *    perpendicular solid cell blocks it on both ends) is walled and contains no fruit. */
function deadCorner(L, i) {
  const v = solid(L, neighbor(L, i, "up")) || solid(L, neighbor(L, i, "down")),
    h = solid(L, neighbor(L, i, "left")) || solid(L, neighbor(L, i, "right"));
  return v && h;
}
function deadLine(L, i) {
  for (const [side, along] of [["up", ["left", "right"]], ["down", ["left", "right"]], ["left", ["up", "down"]], ["right", ["up", "down"]]]) {
    if (!solid(L, neighbor(L, i, side))) continue;
    let ok = true,
      hasGoal = false;
    for (const d of along) {
      let j = i;
      for (;;) {
        if (L.goals.includes(j)) hasGoal = true;
        if (!solid(L, neighbor(L, j, side))) { ok = false; break; } // the wall opens: crate could leave the line
        const nx = neighbor(L, j, d);
        if (solid(L, nx)) break;
        j = nx;
      }
      if (!ok) break;
    }
    if (ok && !hasGoal) return true;
  }
  return false;
}
export function deadSquares(L) {
  const out = [];
  for (let i = 0; i < L.n * L.n; i++) if (!solid(L, i) && !L.goals.includes(i) && (deadCorner(L, i) || deadLine(L, i))) out.push(i);
  return out;
}
export function deadlocks(L, s) {
  const dead = new Set(),
    occ = (i) => solid(L, i) || s.crates.includes(i);
  for (const c of s.crates) if (!L.goals.includes(c) && (deadCorner(L, c) || deadLine(L, c))) dead.add(c);
  for (const c of s.crates) {
    const r = Math.floor(c / L.n),
      col = c % L.n;
    for (const [dr, dc] of [[0, 0], [-1, 0], [0, -1], [-1, -1]]) {
      const r0 = r + dr,
        c0 = col + dc,
        sq = [[r0, c0], [r0, c0 + 1], [r0 + 1, c0], [r0 + 1, c0 + 1]].map(([a, b]) => (a < 0 || b < 0 || a >= L.n || b >= L.n ? -1 : a * L.n + b));
      if (sq.every(occ)) {
        const box = sq.filter((i) => i >= 0 && s.crates.includes(i));
        if (box.some((i) => !L.goals.includes(i))) box.forEach((i) => !L.goals.includes(i) && dead.add(i));
      }
    }
  }
  return [...dead].sort((a, b) => a - b);
}

/** Exact BFS (optimal moves) used by tests and the generator; mirrors verify/solver.py. */
export function solveCrates(L, limit = 3e6) {
  const key = (p, cs) => p + ":" + cs.join(","),
    start = newCrateState(L),
    seen = new Map([[key(start.player, start.crates), null]]),
    dead = new Set(deadSquares(L));
  let q = [start];
  while (q.length) {
    const next = [];
    for (const s of q) {
      if (isCrateSolved(L, s)) {
        const path = [];
        for (let k = key(s.player, s.crates); seen.get(k); k = seen.get(k)[0]) path.unshift(seen.get(k)[1]);
        return { solvable: true, moves: path.length, pushes: s.pushes, path, explored: seen.size };
      }
      for (const d of Object.keys(DIRS)) {
        const r = stepCrate(L, s, d);
        if (!r.moved || (r.pushed && dead.has(r.crate))) continue;
        const ns = { ...r.state, crates: [...r.state.crates].sort((a, b) => a - b) },
          k = key(ns.player, ns.crates);
        if (seen.has(k)) continue;
        seen.set(k, [key(s.player, s.crates), d]);
        next.push(ns);
        if (seen.size > limit) return { solvable: null, explored: seen.size };
      }
    }
    q = next;
  }
  return { solvable: false, explored: seen.size };
}

/* v4.2 bonus reward: +1 spare orange for the NEXT pond only. Pure helpers so the rules are unit-tested. */
export const BONUS_AFTER = Object.freeze({ 5: 1, 15: 2, 25: 3 }); // pond cleared → bonus level number
export function cleanBonus(raw) {
  const b = raw && typeof raw === "object" ? raw : {},
    solved = [...new Set((Array.isArray(b.solved) ? b.solved : []).filter((k) => [1, 2, 3].includes(k)))].sort(),
    best = {};
  for (const k of solved) if (Number.isInteger(b.best?.[k]) && b.best[k] > 0 && b.best[k] < 100000) best[k] = b.best[k];
  const forPond = Number.isInteger(b.spare?.forPond) && [6, 16, 26].includes(b.spare.forPond) ? b.spare.forPond : null;
  return { v: 1, solved, best, spare: forPond ? { forPond } : null, dpad: b.dpad === true, controlsSeen: b.controlsSeen === true };
}
/** Solving a bonus grants one spare orange for the pond right after; never stacks. Returns true if newly granted. */
export function grantSpare(bonus, afterPond) {
  const forPond = afterPond + 1;
  if (bonus.spare?.forPond === forPond) return false;
  bonus.spare = { forPond };
  return true;
}
/** The spare is spent by the first attempt started on the pond it was earned for ("for Pond 6"); other ponds and the
 * Daily leave it waiting. Returns true when this attempt gets the spare orange. */
export function claimSpare(bonus, pondId, daily = false) {
  if (!bonus.spare || daily || bonus.spare.forPond !== pondId) return false;
  bonus.spare = null;
  return true;
}
