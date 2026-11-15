/* v4.3: the ONE table of pond roles. Every 5th pond is a crate pond (10/20/30 are world gates);
 * the logic boss is the pond right before each gate; the first pond of worlds 2 and 3 is a breather. */
export const CRATE_PONDS = Object.freeze([5, 10, 15, 20, 25, 30]);
export const GATE_PONDS = Object.freeze([10, 20, 30]);
export const BOSS_PONDS = Object.freeze([9, 19, 29]);
export const BREATHER_PONDS = Object.freeze([11, 21]);
export const FINALE_POND = 30;
export const isCrate = (id) => CRATE_PONDS.includes(id);
export const isGate = (id) => GATE_PONDS.includes(id);
export const isBoss = (id) => BOSS_PONDS.includes(id);
export const worldOf = (id) => Math.floor((id - 1) / 10);
export function role(id) {
  return isCrate(id) ? (isGate(id) ? "gate" : "crate") : isBoss(id) ? "boss" : BREATHER_PONDS.includes(id) ? "breather" : "normal";
}
export function pondLabel(id) {
  return isGate(id) ? (id === FINALE_POND ? `Finale Crate Pond ${id}` : `Gate Crate Pond ${id}`) : isCrate(id) ? `Crate Pond ${id}` : isBoss(id) ? `Boss Pond ${id}` : `Pond ${id}`;
}
// v4.2 golden-lily ids → v4.3 boss ids (save migration).
export const GOLDEN_REMAP = Object.freeze({ 10: 9, 20: 19, 30: 29 });
