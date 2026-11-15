import { isBoss } from "./roles.js";
import { newMetrics } from "./rewards.js";
import { move, violations, enumerate, peers, cleanAttempt, solved, isLocked, withLocks, solutionCells } from "./core.js";
import { CHARACTERS } from "./characters.js";
export const POWER_NAMES = { peek: "Peek", secondChance: "Second chance", nap: "Nap" };
export function newAttempt(n) {
  return { cells: Array(n * n).fill(0), lives: 3, ...cleanAttempt({ metrics: newMetrics() }, n * n) };
}
export function effectivePower(selected) {
  return (CHARACTERS[selected] || CHARACTERS.Jun).power;
}
export function peekCandidates(p, s) {
  const solutions = enumerate(p),
    solution = solutions[0] || [];
  return solution.filter(
    (i) =>
      solutions.every((sol) => sol.includes(i)) &&
      s.cells[i] === 0 &&
      !p.rocks.includes(i) &&
      !p.fixed?.includes(i) &&
      !s.cells.some((v, j) => v === 2 && peers(p, i, j)),
  );
}
export function canUsePower(p, s, selected) {
  if (s.lives === 0 || s.power.used || solved(p, s.cells)) return false;
  const kind = effectivePower(selected);
  if (kind === "peek") return peekCandidates(p, s).length > 0;
  if (kind === "secondChance") return !!s.lastMistake && s.lives < 3;
  return true;
}
export function usePower(p, s, selected, rng = Math.random) {
  if (!canUsePower(p, s, selected)) return s;
  const kind = effectivePower(selected),
    next = { ...s, cells: [...s.cells], power: { used: true, kind, napRemaining: 0, peekCell: null } };
  if (kind === "peek") {
    const candidates = peekCandidates(p, s);
    next.power.peekCell = candidates[Math.min(candidates.length - 1, Math.max(0, Math.floor(rng() * candidates.length)))];
  }
  if (kind === "nap") next.power.napRemaining = 3;
  if (kind === "secondChance") {
    const i = s.lastMistake.cell;
    if (next.cells[i] === 2 && violations(p, next.cells).has(i)) {
      // A locked (correct) last move stays; Second chance removes the unlocked capys it clashed with instead.
      if (!isLocked(p, next, i)) next.cells[i] = 0;
      else next.cells.forEach((v, j) => v === 2 && j !== i && peers(p, i, j) && !isLocked(p, next, j) && (next.cells[j] = 0));
    }
    next.lives = Math.min(3, s.lives + 1);
    next.lastMistake = null;
  }
  return withLocks(p, next);
}
// Charges and power use are attempt resources: Undo never refunds them.
export function attemptMove(p, s, i, value) {
  if (s.lives === 0 || isLocked(p, s, i)) return s;
  if (value === 2 && s.cells[i] === 2) return s;
  const charge = (value === 2 && s.cells[i] !== 2) || (value === 1 && s.cells[i] === 0),
    protectedMove = charge && s.power.napRemaining > 0;
  const result = move(p, s, i, value, protectedMove);
  if (result === s) return s;
  const next = { ...s, ...result, power: { ...s.power }, metrics: { ...s.metrics } };
  if (result.rejected === undefined) delete next.rejected; // transient flag, only on the rejecting move
  // v4.2: the crate-bonus spare orange absorbs the first lost orange; the mistake itself is still counted below.
  if (result.lives < s.lives && s.spare > 0) {
    next.lives = s.lives;
    next.spare = 0;
    next.spareUsed = true;
  } else delete next.spareUsed;
  // A rejected capy (not in the solution) is always a mistake, Nap or not; it never stays on the board.
  if (result.rejected !== undefined || (value === 2 && violations(p, result.cells).has(i))) next.metrics.mistakes++;
  if (protectedMove) next.power.napRemaining--;
  if (result.lives < s.lives) next.lastMistake = { cell: i };
  if (next.power.peekCell !== null && next.cells[next.power.peekCell] !== 0) next.power.peekCell = null;
  return withLocks(p, next);
}
// v4.3 fix: Undo keeps locks (proven-correct capys), but it must never rebuild a board that never existed.
// Merging today's locks into an older snapshot used to bring back an unlocked capy that touches (row, column,
// zone or any of the 8 neighbours, diagonals included) a capy that was locked LATER, i.e. a lock the snapshot did
// not have. A capy "appeared" next to another one with no orange lost. Such a capy can never be correct (it clashes
// with a proven capy), so it stays cleared. Snapshots that really had the clash (e.g. undoing Clear conflicts) are
// restored exactly as before.
export function undoAttempt(s, cells, p = null) {
  const locked = p ? withLocks(p, s).locked : s.locked || [],
    future = locked.filter((j) => cells[j] !== 2),
    restored = cells.map((v, i) => (locked.includes(i) ? 2 : v)),
    next = {
      ...s,
      cells: p ? restored.map((v, i) => (v === 2 && !locked.includes(i) && future.some((j) => peers(p, i, j)) ? 0 : v)) : restored,
      locked: [...locked],
      power: { ...s.power, peekCell: s.power.peekCell !== null && cells[s.power.peekCell] === 0 ? s.power.peekCell : null },
    };
  return p ? withLocks(p, next) : next;
}
export function undoChanges(s, cells, p = null) {
  return undoAttempt(s, cells, p).cells.some((v, i) => v !== s.cells[i]);
}
export function awardPureBoss(progress, p, s, daily = false) {
  if (solved(p, s.cells) && !daily && isBoss(p.id) && !s.power.used && !progress.goldenLilies.includes(p.id)) {
    progress.goldenLilies.push(p.id);
    return true;
  }
  return false;
}

// v4.3 rev b: the Clear conflicts button and action were retired. Wrong capys are rejected on placement (core.move) and
// dropped from old saves on resume (core.dropWrongCapys), so a board can no longer hold a conflict to clear. The pure
// helper stays exported (unused by the UI) for old-board tooling and tests.
export function clearConflicts(p, s) {
  const bad = violations(p, s.cells);
  return bad.size ? { ...s, cells: s.cells.map((v, i) => (bad.has(i) && !isLocked(p, s, i) ? 0 : v)) } : s;
}

export const powerIntroKey = (selected, kind) => `${selected}:${kind}`;
export const needsPowerIntro = (progress, selected, kind) => !(progress.powerIntroSeen || []).includes(powerIntroKey(selected, kind));
export function rememberPowerIntro(progress, selected, kind) {
  const key = powerIntroKey(selected, kind);
  progress.powerIntroSeen ??= [];
  if (!progress.powerIntroSeen.includes(key)) progress.powerIntroSeen.push(key);
}
