// Capybara Calm leaderboard Worker (Cloudflare Workers Free + D1). NOT DEPLOYED.
// Endpoints (JSON, CORS locked to ALLOWED_ORIGIN): POST /v1/join · POST /v1/score · GET /v1/leaderboard · POST /v1/opt-out
// Server checks: impossible totals rejected (rules.js), best-score-only writes, fixed-window rate limits (salted hashes).
import { checkScore, cleanNickname, UUID, LIMITS, WORLDS } from "./rules.js";
const json = (status, body, cors) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...cors } });
function corsFor(request, env) {
  const origin = request.headers.get("origin"), allowed = (env.ALLOWED_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean);
  const ok = origin && allowed.includes(origin);
  return { ok: !origin || ok, headers: ok ? { "access-control-allow-origin": origin, vary: "origin", "access-control-allow-methods": "GET, POST, OPTIONS", "access-control-allow-headers": "content-type", "access-control-max-age": "86400" } : { vary: "origin" } };
}
async function sha256(text) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}
/** Fixed-window counter in D1. Returns true when the request is allowed. */
export async function allow(db, key, limit, windowMs, now) {
  const window = Math.floor(now / windowMs);
  const row = await db.prepare("INSERT INTO rate_limits (key, window, count) VALUES (?1, ?2, 1) ON CONFLICT (key, window) DO UPDATE SET count = count + 1 RETURNING count").bind(key, window).first();
  if (Math.random() < 0.02) await db.prepare("DELETE FROM rate_limits WHERE window < ?1 AND key LIKE ?2").bind(window - 2, key.split(":")[0] + ":%").run();
  return (row?.count ?? 1) <= limit;
}
async function readBody(request) {
  if (Number(request.headers.get("content-length") || 0) > 4096) return null;
  try { const t = await request.text(); return t.length > 4096 ? null : JSON.parse(t || "{}"); } catch { return null; }
}
async function board(db, world, playerId) {
  const top = (await db.prepare("SELECT p.nickname AS nickname, s.score AS score, s.player_id AS player_id FROM world_scores s JOIN players p ON p.id = s.player_id WHERE s.world = ?1 ORDER BY s.score DESC, s.updated_at ASC, s.player_id ASC LIMIT 10").bind(world).all()).results || [];
  const top10 = top.map((r, i) => ({ rank: i + 1, nickname: r.nickname || null, score: r.score, ...(r.player_id === playerId ? { me: true } : {}) }));
  let me = { rank: null };
  if (playerId && UUID.test(playerId)) {
    const mine = await db.prepare("SELECT s.score AS score, s.updated_at AS updated_at, p.nickname AS nickname FROM world_scores s JOIN players p ON p.id = s.player_id WHERE s.world = ?1 AND s.player_id = ?2").bind(world, playerId).first();
    if (mine) {
      const ahead = await db.prepare("SELECT COUNT(*) AS n FROM world_scores WHERE world = ?1 AND (score > ?2 OR (score = ?2 AND updated_at < ?3) OR (score = ?2 AND updated_at = ?3 AND player_id < ?4))").bind(world, mine.score, mine.updated_at, playerId).first();
      const total = await db.prepare("SELECT COUNT(*) AS n FROM world_scores WHERE world = ?1").bind(world).first();
      me = { rank: ahead.n + 1, of: total.n, nickname: mine.nickname || null, score: mine.score };
    }
  }
  return { world, top10, me };
}
export async function handle(request, env, now = Date.now()) {
  const url = new URL(request.url), cors = corsFor(request, env);
  if (!cors.ok) return json(403, { error: "origin" }, cors.headers);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors.headers });
  const db = env.DB, ip = request.headers.get("cf-connecting-ip") || "local", ipKey = await sha256((env.RATE_SALT || "dev-salt") + ip);
  const limited = () => json(429, { error: "rate-limited" }, { ...cors.headers, "retry-after": "60" });
  try {
    if (url.pathname === "/v1/leaderboard" && request.method === "GET") {
      if (!(await allow(db, `read:${ipKey}`, LIMITS.read.perMinute, 60000, now))) return limited();
      const world = Number(url.searchParams.get("world"));
      if (!Number.isInteger(world) || world < 1 || world > WORLDS) return json(400, { error: "world" }, cors.headers);
      return json(200, await board(db, world, url.searchParams.get("player_id")), cors.headers);
    }
    if (request.method !== "POST") return json(404, { error: "not-found" }, cors.headers);
    const body = await readBody(request);
    if (!body || typeof body !== "object") return json(400, { error: "body" }, cors.headers);
    if (url.pathname === "/v1/join") {
      if (!(await allow(db, `join:${ipKey}`, LIMITS.join.perMinute, 60000, now)) || !(await allow(db, `joinh:${ipKey}`, LIMITS.join.perHour, 3600000, now))) return limited();
      const id = body.player_id === undefined ? crypto.randomUUID() : body.player_id;
      if (typeof id !== "string" || !UUID.test(id)) return json(400, { error: "player_id" }, cors.headers);
      const nick = cleanNickname(body.nickname);
      if (!nick.ok) return json(400, { error: "nickname" }, cors.headers);
      await db.prepare("INSERT INTO players (id, nickname, created_at, opted_in_at) VALUES (?1, ?2, ?3, ?3) ON CONFLICT (id) DO UPDATE SET nickname = excluded.nickname").bind(id, nick.value, now).run();
      return json(200, { player_id: id, nickname: nick.value, opted_in: true }, cors.headers);
    }
    if (url.pathname === "/v1/score") {
      const id = body.player_id;
      if (typeof id !== "string" || !UUID.test(id)) return json(400, { error: "player_id" }, cors.headers);
      if (!(await allow(db, `score:${ipKey}`, LIMITS.score.perMinute * 3, 60000, now)) || !(await allow(db, `scorep:${await sha256(id)}`, LIMITS.score.perMinute, 60000, now))) return limited();
      const player = await db.prepare("SELECT id FROM players WHERE id = ?1").bind(id).first();
      if (!player) return json(403, { error: "not-joined" }, cors.headers);
      const c = checkScore(body);
      if (!c.ok) return json(422, { error: c.error }, cors.headers);
      // best-score-only: the WHERE on the upsert never lowers a stored score
      const res = await db.prepare("INSERT INTO world_scores (player_id, world, score, updated_at) VALUES (?1, ?2, ?3, ?4) ON CONFLICT (player_id, world) DO UPDATE SET score = excluded.score, updated_at = excluded.updated_at WHERE excluded.score > world_scores.score").bind(id, c.world, c.score, now).run();
      const b = await board(db, c.world, id);
      return json(200, { accepted: (res.meta?.changes ?? 0) > 0, world: c.world, score: b.me.score ?? c.score, rank: b.me.rank, top10: b.top10 }, cors.headers);
    }
    if (url.pathname === "/v1/opt-out") {
      if (!(await allow(db, `optout:${ipKey}`, LIMITS.optOut.perMinute, 60000, now))) return limited();
      const id = body.player_id;
      if (typeof id !== "string" || !UUID.test(id)) return json(400, { error: "player_id" }, cors.headers);
      await db.prepare("DELETE FROM world_scores WHERE player_id = ?1").bind(id).run(); // explicit (D1 FKs are on, but be sure)
      await db.prepare("DELETE FROM players WHERE id = ?1").bind(id).run();
      return json(200, { player_id: id, opted_in: false, deleted: true }, cors.headers);
    }
    return json(404, { error: "not-found" }, cors.headers);
  } catch (e) {
    return json(500, { error: "server" }, cors.headers);
  }
}
export default { fetch: (request, env) => handle(request, env) };
