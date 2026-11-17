// Pure server-side rules shared by the Worker and its tests. Mirrors app/score.js (v5.0 formula).
// pond = (1000 + 200 × oranges(≤3) + timeBonus(≤500)) × 0.5 if helped × 1.5 for bosses (id ending 9) and crate ponds (every 5th).
export const WORLDS = 5, PONDS_PER_WORLD = 30;
export const NORMAL_MAX = 1000 + 3 * 200 + 500; // 2100
export const SPECIAL_MAX = Math.round(NORMAL_MAX * 1.5); // 3150
export const pondMax = (id) => (id % 5 === 0 || id % 10 === 9 ? SPECIAL_MAX : NORMAL_MAX);
export const pondMin = (id) => Math.round(1000 * 0.5 * (id % 5 === 0 || id % 10 === 9 ? 1.5 : 1)); // a solved pond scores at least this
export const worldPondIds = (world) => Array.from({ length: PONDS_PER_WORLD }, (_, i) => (world - 1) * PONDS_PER_WORLD + i + 1);
/** Hard per-world ceiling: every pond at its maximum (6 crate + 3 boss at 3150, 21 normal at 2100) = 72 450. */
export const worldMax = (world) => worldPondIds(world).reduce((a, id) => a + pondMax(id), 0);
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const BLOCKED = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/u;
/** Nickname: optional; 2–16 visible characters (grapheme count), no control/bidi characters. null = anonymous. */
export function cleanNickname(raw) {
  if (raw === undefined || raw === null || raw === "") return { ok: true, value: null };
  if (typeof raw !== "string" || raw.length > 64 || BLOCKED.test(raw)) return { ok: false, error: "nickname" };
  const text = raw.trim().normalize("NFC");
  if (!text) return { ok: true, value: null };
  const count = [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)].length;
  if (count < 2 || count > 16 || !/[^\s\p{M}\p{Cf}]/u.test(text)) return { ok: false, error: "nickname" };
  return { ok: true, value: text };
}
/** Validates a /v1/score body. Returns { ok, world, score } or { ok:false, error }. */
export function checkScore(body) {
  const world = body?.world, score = body?.score;
  if (!Number.isInteger(world) || world < 1 || world > WORLDS) return { ok: false, error: "world" };
  if (!Number.isInteger(score) || score < 0) return { ok: false, error: "score" };
  if (score > worldMax(world)) return { ok: false, error: "impossible-total" };
  if (body.ponds !== undefined) {
    const ids = new Set(worldPondIds(world));
    if (!Array.isArray(body.ponds) || body.ponds.length > PONDS_PER_WORLD) return { ok: false, error: "ponds" };
    const seen = new Set();
    let sum = 0;
    for (const p of body.ponds) {
      if (!ids.has(p?.id) || seen.has(p.id) || !Number.isInteger(p.score) || p.score < pondMin(p.id) || p.score > pondMax(p.id)) return { ok: false, error: "impossible-pond" };
      seen.add(p.id);
      sum += p.score;
    }
    if (sum !== score) return { ok: false, error: "ponds-sum" };
  } else if (score > 0 && score < pondMin(worldPondIds(world)[0])) return { ok: false, error: "impossible-total" };
  return { ok: true, world, score };
}
export const LIMITS = Object.freeze({
  join: { perMinute: 6, perHour: 30 }, // per IP hash
  score: { perMinute: 20 }, // per player and per IP hash
  read: { perMinute: 120 }, // per IP hash
  optOut: { perMinute: 10 },
});
