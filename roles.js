/* v5.0 (Capybara Calm): the ONE table of pond roles, now 150 ponds = 5 worlds × 30.
 * Every 5th pond is a crate pond; every 10th is a crate gate (grows the Hot Spring); every 30th is a world gate
 * (opens the next world); 150 is the finale. The logic boss is the pond ending in 9; ponds ending in 1 (after a
 * gate) are breathers. World 1 (1–30) is exactly the v4.3 campaign. */
export const POND_COUNT = 150;
export const WORLD_SIZE = 30;
export const WORLD_COUNT = POND_COUNT / WORLD_SIZE;
const ids = (f) => Object.freeze(Array.from({ length: POND_COUNT }, (_, i) => i + 1).filter(f));
export const CRATE_PONDS = ids((id) => id % 5 === 0);
export const GATE_PONDS = ids((id) => id % 10 === 0);
export const WORLD_GATES = ids((id) => id % WORLD_SIZE === 0);
export const BOSS_PONDS = ids((id) => id % 10 === 9);
export const BREATHER_PONDS = ids((id) => id % 10 === 1 && id > 1);
export const NEW_WORLD_PONDS = ids((id) => id % WORLD_SIZE === 1 && id > 1);
export const FINALE_POND = POND_COUNT;
export const isCrate = (id) => id % 5 === 0 && id >= 5 && id <= POND_COUNT;
export const isGate = (id) => id % 10 === 0 && id >= 10 && id <= POND_COUNT;
export const isWorldGate = (id) => id % WORLD_SIZE === 0 && id >= WORLD_SIZE && id <= POND_COUNT;
export const isBoss = (id) => id % 10 === 9 && id <= POND_COUNT;
export const isPondId = (id) => Number.isInteger(id) && id >= 1 && id <= POND_COUNT;
/** 0-based world index (0–4) of a pond. */
export const worldOf = (id) => Math.floor((id - 1) / WORLD_SIZE);
export const worldPonds = (w) => Array.from({ length: WORLD_SIZE }, (_, i) => w * WORLD_SIZE + i + 1);
export function role(id) {
  return isCrate(id) ? (isGate(id) ? "gate" : "crate") : isBoss(id) ? "boss" : BREATHER_PONDS.includes(id) ? "breather" : "normal";
}
export function pondLabel(id) {
  return isGate(id)
    ? id === FINALE_POND
      ? `Finale Crate Pond ${id}`
      : isWorldGate(id)
        ? `World Gate Pond ${id}`
        : `Gate Crate Pond ${id}`
    : isCrate(id)
      ? `Crate Pond ${id}`
      : isBoss(id)
        ? `Boss Pond ${id}`
        : `Pond ${id}`;
}
// v4.2 golden-lily ids → v4.3 boss ids (save migration; only v4.2 saves, which never go past 30).
export const GOLDEN_REMAP = Object.freeze({ 10: 9, 20: 19, 30: 29 });
