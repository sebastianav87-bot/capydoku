/* Two-phase bosses. The phase-two checkpoint is written BEFORE any visual change.
   Attempt metrics and the single power budget belong to the whole boss, not to a life refill. */
import { newAttempt } from './powers.js';
import { isBoss } from './roles.js';
export const bossPhase = (s) => s?.boss?.phase === 2 ? 2 : 1;
export function bossBoard(data, id, phase = 1) {
  const original = data.levels[id - 1];
  if (!original || !isBoss(id)) return original;
  const board = phase === 2 ? data.bosses?.find((p) => p.id === id) : original;
  if (!board) throw new Error(`Missing boss phase two for pond ${id}`);
  return { ...board, bossPhases: 2, bossPhase: phase };
}
export function freshBossAttempt(board) {
  return { ...newAttempt(board.n), boss: { phase: 1, rewarded: false } };
}
export function phaseTwoAttempt(board, previous) {
  const next = newAttempt(board.n);
  for (const i of board.fixed) next.cells[i] = 2;
  return { ...next, boss: { phase: 2, rewarded: false },
    metrics: { ...previous.metrics },
    power: { ...previous.power, peekCell: null } };
}
export function restoreBoss(board, state) {
  const cells = [...state.cells];
  for (const i of board.fixed || []) cells[i] = 2;
  return { ...state, cells, boss: state.boss || { phase: 1, rewarded: false } };
}
