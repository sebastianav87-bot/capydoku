// Capybara Calm leaderboard Worker (Cloudflare Workers Free + D1). NOT DEPLOYED.
// Endpoints (JSON, CORS locked to ALLOWED_ORIGIN): POST /v1/join · POST /v1/score · GET /v1/leaderboard · POST /v1/opt-out
// Server checks: impossible totals rejected (rules.js), best-score-only writes, fixed-window rate limits (salted hashes).
import { checkScore, checkProgress, cleanNickname, UUID, LIMITS, WORLDS } from "./rules.js";
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
  if (Number(request.headers.get("content-length") || 0) > 16384) return null;
  try { const t = await request.text(); return t.length > 16384 ? null : JSON.parse(t || "{}"); } catch { return null; }
}
async function board(db, world, playerId) {
  const overall = world === 'overall';
  const source = overall
    ? `SELECT p.id player_id,p.nickname,COALESCE(SUM(s.score),0) score,COALESCE(c.last_cleared,0) last_cleared,p.created_at tie_at FROM players p LEFT JOIN world_scores s ON s.player_id=p.id LEFT JOIN campaign_progress c ON c.player_id=p.id GROUP BY p.id`
    : `SELECT p.id player_id,p.nickname,s.score,COALESCE(c.last_cleared,0) last_cleared,s.updated_at tie_at FROM world_scores s JOIN players p ON p.id=s.player_id LEFT JOIN campaign_progress c ON c.player_id=p.id WHERE s.world=${world}`;
  const ranked = `WITH totals AS (${source}), ranked AS (SELECT *,ROW_NUMBER() OVER(ORDER BY score DESC,last_cleared DESC,tie_at ASC,player_id ASC) rank,COUNT(*) OVER() total_players FROM totals)`;
  const top=(await db.prepare(ranked+' SELECT * FROM ranked WHERE rank<=10 ORDER BY rank').all()).results||[];
  const row=r=>({rank:r.rank,nickname:r.nickname||null,score:r.score,last_cleared:r.last_cleared});
  const top10=top.map(r=>({...row(r),...(r.player_id===playerId?{me:true}:{})}));
  const mine=playerId&&UUID.test(playerId)?await db.prepare(ranked+' SELECT * FROM ranked WHERE player_id=?1').bind(playerId).first():null;
  return {world,top10,me:mine?{...row(mine),of:mine.total_players}:{rank:null}};
}
export async function handle(request, env, now = Date.now()) {
  const url = new URL(request.url), cors = corsFor(request, env);
  if (!cors.ok) return json(403, { error: "origin" }, cors.headers);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors.headers });
  const db = env.DB, ip = request.headers.get("cf-connecting-ip") || "local", ipKey = await sha256((env.RATE_SALT || "dev-salt") + ip);
  const limited = () => json(429, { error: "rate-limited" }, { ...cors.headers, "retry-after": "60" });
  try {
    if ((url.pathname === '/' || url.pathname === '/health') && request.method === 'GET') {
      await db.prepare('SELECT COUNT(*) AS n FROM players').first();
      return json(200,{service:'Capybara Calm leaderboard',ok:true},cors.headers);
    }
    if (url.pathname === "/v1/leaderboard" && request.method === "GET") {
      if (!(await allow(db, `read:${ipKey}`, LIMITS.read.perMinute, 60000, now))) return limited();
      const query = url.searchParams.get("world");
      const world = query === null || query === 'overall' ? 'overall' : Number(query);
      if (world !== 'overall' && (!Number.isInteger(world) || world < 1 || world > WORLDS)) return json(400, { error: "world" }, cors.headers);
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
    if (url.pathname === '/v1/progress') {
      const id=body.player_id;
      if(typeof id!=='string'||!UUID.test(id))return json(400,{error:'player_id'},cors.headers);
      if(!(await allow(db,`progress:${ipKey}`,60,60000,now))||!(await allow(db,`progressp:${await sha256(id)}`,20,60000,now)))return limited();
      if(!await db.prepare('SELECT id FROM players WHERE id=?1').bind(id).first())return json(403,{error:'not-joined'},cors.headers);
      const checked=checkProgress(body);
      if(!checked.ok)return json(422,{error:checked.error},cors.headers);
      const statements=checked.worlds.map(w=>db.prepare('INSERT INTO world_scores (player_id,world,score,updated_at) VALUES (?1,?2,?3,?4) ON CONFLICT(player_id,world) DO UPDATE SET score=excluded.score,updated_at=excluded.updated_at WHERE excluded.score>world_scores.score').bind(id,w.world,w.score,now));
      statements.push(db.prepare('INSERT INTO campaign_progress (player_id,last_cleared) VALUES (?1,?2) ON CONFLICT(player_id) DO UPDATE SET last_cleared=MAX(campaign_progress.last_cleared,excluded.last_cleared)').bind(id,checked.last_cleared));
      await db.batch(statements);
      return json(200,{accepted:true,...await board(db,'overall',id)},cors.headers);
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
      await db.prepare("DELETE FROM campaign_progress WHERE player_id = ?1").bind(id).run();
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
