/* v5.0 pond scores (fully local, pure; unit-tested in tests/v50-score.test.js).
 * score = (1000 + 200 × oranges + timeBonus) × help × role, rounded.
 *   timeBonus = round(500 × (target − t) / target) for t < target, else 0 (never negative).
 *   help = 0.5 when Show me (crate) or Second chance (logic) was used in the attempt.
 *   role = 1.5 for bosses and crate ponds.
 * Crate ponds have no oranges: oranges = 3 if moves ≤ par, 2 if ≤ 1.25 × par, 1 if ≤ 1.5 × par, else 0; their
 * target time is max(60 s, 1.5 s × par). Daily ponds are not scored. Best per pond only ever rises. */
import { isBoss, isCrate, worldPonds, WORLD_COUNT } from "./roles.js";
export const SCORE_BASE = 1000, PER_ORANGE = 200, TIME_BONUS_MAX = 500, HELP_FACTOR = 0.5, ROLE_FACTOR = 1.5;
export const TARGET_SECONDS = Object.freeze({ 5: 120, 6: 150, 7: 180, 8: 240, 9: 330, 10: 420 });
export const crateTargetSeconds = (par) => Math.max(60, Math.round(1.5 * par));
export function timeBonus(seconds, target) {
  if (!Number.isFinite(seconds) || !Number.isFinite(target) || target <= 0 || seconds < 0 || seconds >= target) return 0;
  return Math.round((TIME_BONUS_MAX * (target - seconds)) / target);
}
export function crateOranges(moves, par) {
  if (!Number.isInteger(moves) || !Number.isFinite(par) || par <= 0) return 0;
  return moves <= par ? 3 : moves <= 1.25 * par ? 2 : moves <= 1.5 * par ? 1 : 0;
}
/** Logic pond. `oranges` = regular oranges left (0–3; the crate spare is not counted). */
export function logicScore({ id, n, oranges, seconds, helped = false, phases = 1 }) {
  const o = Math.max(0, Math.min(3, Number.isInteger(oranges) ? oranges : 0));
  const raw = (SCORE_BASE + PER_ORANGE * o + timeBonus(seconds, TARGET_SECONDS[n] * (phases === 2 ? 2 : 1))) * (helped ? HELP_FACTOR : 1) * (isBoss(id) ? ROLE_FACTOR : 1);
  return Math.round(raw);
}
export function crateScore({ id, moves, par, seconds, shown = false }) {
  const raw = (SCORE_BASE + PER_ORANGE * crateOranges(moves, par) + timeBonus(seconds, crateTargetSeconds(par))) * (shown ? HELP_FACTOR : 1) * (isCrate(id) ? ROLE_FACTOR : 1);
  return Math.round(raw);
}
export const MAX_SCORE = Math.round((SCORE_BASE + 3 * PER_ORANGE + TIME_BONUS_MAX) * ROLE_FACTOR); // 3150
export function cleanScores(raw) {
  const out = {};
  if (raw && typeof raw === "object")
    for (const [k, v] of Object.entries(raw)) {
      const id = Number(k);
      if (!Number.isInteger(id) || id < 1 || id > 150 || !Number.isInteger(v?.best) || v.best < 0 || v.best > MAX_SCORE) continue;
      out[id] = { best: v.best, at: Number.isFinite(v.at) ? v.at : 0 };
    }
  return out;
}
/** Records a pond score; only raises the best. Returns { score, best, newBest, previous }. */
export function recordScore(progress, id, score, now = Date.now()) {
  progress.scores ??= {};
  const previous = progress.scores[id]?.best ?? null,
    newBest = previous === null || score > previous;
  if (newBest) progress.scores[id] = { best: score, at: now };
  return { score, best: newBest ? score : previous, newBest, previous };
}
/** World w (0-based): sum of best scores; `scored` counts ponds with a score (migrated ponds stay unscored). */
export function worldScore(progress, w) {
  let total = 0, scored = 0;
  const ponds = [];
  for (const id of worldPonds(w)) {
    const b = progress.scores?.[id]?.best;
    if (Number.isInteger(b)) { total += b; scored++; ponds.push({ id, score: b }); }
  }
  return { world: w, total, scored, of: 30, ponds };
}
export const worldScores = (progress) => Array.from({ length: WORLD_COUNT }, (_, w) => worldScore(progress, w));
