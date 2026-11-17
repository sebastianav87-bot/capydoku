/* v5.0 optional shared leaderboard — CLIENT. Opt-in; nothing is sent unless the player joins.
 * Sent when joined: a random player id (UUID, not personal), an optional nickname (2–16 characters) and the best
 * world scores with their per-pond breakdown. Local scores always stay in the main save (score.js).
 * Backend (approved: Cloudflare Workers Free + D1, code in /workspace/capydoku/worker) speaks:
 *   POST /v1/join {player_id?, nickname?} → {player_id, nickname, opted_in}
 *   POST /v1/score {player_id, world 1–5, score, ponds?} → {accepted, world, score, rank, top10}
 *   GET  /v1/leaderboard?world=&player_id= → {world, top10:[{rank,nickname,score,me?}], me:{rank,of?,nickname,score}}
 *   POST /v1/opt-out {player_id} → {deleted}
 * Adapters share that contract: httpAdapter(base) for the Worker, mockAdapter (local, tests / `?lb=mock`), noneAdapter.
 * The real API URL is EMPTY in config.js (off) until Sebastián's Cloudflare account exists. */
import { nickname as checkNickname } from "./profile.js";
import { worldScores } from "./score.js";
import { GAME_CONFIG } from "./config.js";
export const lastCleared = (completed = []) => { const done = new Set(completed); let last = 0; while (done.has(last + 1) && last < 150) last++; return last; };
export function campaignSnapshot(progress) {
  return { completed: [...new Set(progress.completed || [])].filter(id => Number.isInteger(id) && id >= 1 && id <= 150).sort((a,b)=>a-b),
    worlds: worldScores(progress).map(w => ({ world:w.world+1, score:w.total, ponds:w.ponds })) };
}
export const TABLE_KEY = 'capydoku.leaderboard.tables';
const fingerprint = value => JSON.stringify(value);
export const LB_KEY = "capydoku.leaderboard"; // separate key; the main save key is unchanged
export const MOCK_DB_KEY = "capydoku.leaderboard.mockdb";
export const DEFAULT_NAME = "Anonymous capy";
export const BACKOFF_MS = Object.freeze({ base: 5000, max: 10 * 60 * 1000 });
export const WORLD_MAX = 72450; // 6 crate + 3 boss ponds at 3150, 21 normal at 2100 (same rule as the Worker)
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export class HttpError extends Error {
  constructor(status, code) { super(`leaderboard ${status} ${code}`); this.status = status; this.code = code; }
  get permanent() { return this.status >= 400 && this.status < 500 && this.status !== 429 && this.status !== 408; }
}
const cleanQueue = (q) => {
  const out = {};
  if (q && typeof q === "object")
    for (const [w, e] of Object.entries(q))
      if (/^[1-5]$/.test(w) && Number.isInteger(e?.score) && e.score >= 0 && e.score <= WORLD_MAX)
        out[w] = { score: e.score, ponds: Array.isArray(e.ponds) ? e.ponds.filter((p) => Number.isInteger(p?.id) && Number.isInteger(p?.score)).slice(0, 30).map((p) => ({ id: p.id, score: p.score })) : undefined };
  return out;
};
export function cleanLB(raw) {
  const r = raw && typeof raw === "object" ? raw : {},
    playerId = r.optIn === true && typeof r.playerId === "string" && UUID.test(r.playerId) ? r.playerId : null,
    optIn = !!playerId,
    name = optIn && typeof r.nickname === "string" && checkNickname(r.nickname).valid ? checkNickname(r.nickname).text : "";
  return {
    v: 3,
    snapshot: optIn && Array.isArray(r.snapshot?.completed) && Array.isArray(r.snapshot?.worlds) ? r.snapshot : null,
    sentSnapshot: optIn && typeof r.sentSnapshot === 'string' ? r.sentSnapshot.slice(0,16000) : '',
    optIn,
    playerId,
    nickname: name,
    registered: optIn && r.registered === true, // /v1/join acknowledged for this id + nickname
    queue: optIn ? cleanQueue(r.queue) : {},
    sent: optIn && r.sent && typeof r.sent === "object" ? Object.fromEntries(Object.entries(r.sent).filter(([w, s]) => /^[1-5]$/.test(w) && Number.isInteger(s))) : {},
    failures: optIn && Number.isInteger(r.failures) ? Math.max(0, Math.min(20, r.failures)) : 0,
    nextTry: optIn && Number.isFinite(r.nextTry) ? r.nextTry : 0,
    // ids that left while offline: their server copy is deleted on the next chance (even though no longer opted in)
    pendingOptOut: Array.isArray(r.pendingOptOut) ? r.pendingOptOut.filter((x) => typeof x === "string" && UUID.test(x)).slice(-5) : [],
  };
}
export const backoff = (failures) => Math.min(BACKOFF_MS.max, BACKOFF_MS.base * 2 ** Math.max(0, failures - 1));
export function uuid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 15) | 64;
  b[8] = (b[8] & 63) | 128;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
export const noneAdapter = Object.freeze({
  name: "none",
  connected: false,
  async join() { throw new HttpError(503, "no-backend"); },
  async score() { throw new HttpError(503, "no-backend"); },
  async leaderboard() { throw new HttpError(503, "no-backend"); },
  async optOut() { throw new HttpError(503, "no-backend"); },
});
/** The Cloudflare Worker over fetch(). Only used when GAME_CONFIG.leaderboardApi is set. */
export function httpAdapter(base, fetchImpl = (...a) => fetch(...a)) {
  const root = String(base).replace(/\/+$/, "");
  const call = async (method, path, body) => {
    const res = await fetchImpl(root + path, { method, headers: body ? { "content-type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined, credentials: "omit", cache: "no-store" });
    let data = null;
    try { data = await res.json(); } catch {}
    if (!res.ok) throw new HttpError(res.status, data?.error || "error");
    return data;
  };
  return {
    name: "http",
    connected: true,
    join: (b) => call("POST", "/v1/join", b),
    score: (b) => call("POST", "/v1/score", b),
    progress: (b) => call("POST", "/v1/progress", b),
    leaderboard: (world, playerId) => call("GET", `/v1/leaderboard?world=${world}${playerId ? `&player_id=${encodeURIComponent(playerId)}` : ""}`),
    optOut: (playerId) => call("POST", "/v1/opt-out", { player_id: playerId }),
  };
}
/** Local mock with the same contract as the Worker (localStorage-backed so E2E tests can inspect it). */
export function mockAdapter(storage, { seedPlayers = true } = {}) {
  const read = () => { try { return JSON.parse(storage.getItem(MOCK_DB_KEY) || "null") || { players: {}, fail: false }; } catch { return { players: {}, fail: false }; } };
  const write = (db) => storage.setItem(MOCK_DB_KEY, JSON.stringify(db));
  let t = 0;
  if (seedPlayers && !Object.keys(read().players).length) {
    const db = read(), names = ["Mossy", "Yuzu", "Pebble", "Biscuit", "Nori", "Clover", "Mochi", "Tansy", "Ripple", "Fern", "Juniper", "Puddle"];
    names.forEach((n, i) => (db.players[`00000000-0000-4000-8000-${String(i).padStart(12, "0")}`] = { nickname: n, scores: Object.fromEntries([1, 2, 3, 4, 5].map((w) => [w, { score: 60000 - i * 3700 - w * 900, at: i }])) }));
    write(db);
  }
  const guard = () => { if (read().fail) throw new HttpError(503, "mock-unavailable"); };
  const sorted = (world) => Object.entries(read().players).filter(([,p])=>world==='overall'||p.scores?.[world]).map(([id,p])=>({id,nickname:p.nickname||null,score:world==='overall'?Object.values(p.scores||{}).reduce((sum,s)=>sum+s.score,0):p.scores[world].score,last_cleared:p.last_cleared||0,at:world==='overall'?p.at||0:p.scores[world].at})).sort((a,b)=>b.score-a.score||b.last_cleared-a.last_cleared||a.at-b.at||a.id.localeCompare(b.id));
  const boardFor = (world, playerId) => {
    const all = sorted(world), i = all.findIndex((e) => e.id === playerId);
    return { world, top10: all.slice(0, 10).map((e, k) => ({ rank: k + 1, nickname: e.nickname, score: e.score, last_cleared: e.last_cleared, ...(e.id === playerId ? { me: true } : {}) })), me: i < 0 ? { rank: null } : { rank: i + 1, of: all.length, nickname: all[i].nickname, score: all[i].score, last_cleared: all[i].last_cleared } };
  };
  return {
    name: "mock",
    connected: true,
    async join({ player_id, nickname }) {
      guard();
      const db = read();
      db.players[player_id] = { ...(db.players[player_id] || { scores: {} }), nickname: nickname || null };
      write(db);
      return { player_id, nickname: nickname || null, opted_in: true };
    },
    async score({ player_id, world, score }) {
      guard();
      const db = read(), p = db.players[player_id];
      if (!p) throw new HttpError(403, "not-joined");
      if (!Number.isInteger(world) || world < 1 || world > 5 || !Number.isInteger(score) || score < 0 || score > WORLD_MAX) throw new HttpError(422, "impossible-total");
      const accepted = !p.scores[world] || score > p.scores[world].score;
      if (accepted) p.scores[world] = { score, at: Date.now() + t++ };
      write(db);
      const b = boardFor(world, player_id);
      return { accepted, world, score: b.me.score, rank: b.me.rank, top10: b.top10 };
    },
    async progress({player_id,completed,worlds}) {
      guard();const db=read(),p=db.players[player_id];if(!p)throw new HttpError(403,'not-joined');
      p.last_cleared=Math.max(p.last_cleared||0,lastCleared(completed));
      for(const w of worlds)if(!p.scores[w.world]||w.score>p.scores[w.world].score)p.scores[w.world]={score:w.score,at:Date.now()+t++};
      write(db);return {accepted:true,...boardFor('overall',player_id)};
    },
    async leaderboard(world, playerId) { guard(); return boardFor(world, playerId); },
    async optOut(playerId) { guard(); const db = read(); delete db.players[playerId]; write(db); return { player_id: playerId, opted_in: false, deleted: true }; },
  };
}
export function createLeaderboard({ storage, adapter = noneAdapter, online = () => globalThis.navigator?.onLine !== false, now = () => Date.now(), newId = uuid } = {}) {
  let st = load(), flushing = null;
  let tables = {};
  try { tables = JSON.parse(storage.getItem(TABLE_KEY) || '{}') || {}; } catch {}
  const saveTables = () => { try { storage.setItem(TABLE_KEY,JSON.stringify(tables)); } catch {} };
  function load() { try { return cleanLB(JSON.parse(storage.getItem(LB_KEY) || "null")); } catch { return cleanLB(null); } }
  function persist() { try { storage.setItem(LB_KEY, JSON.stringify(st)); } catch {} }
  const api = {
    adapter,
    state: () => JSON.parse(JSON.stringify(st)),
    displayName: () => st.nickname || DEFAULT_NAME,
    /** Opt in (or change the nickname). `name` is optional; an invalid one is rejected (returns false). */
    join(name = "") {
      const trimmed = typeof name === "string" ? name.trim() : "";
      if (trimmed && !checkNickname(trimmed).valid) return false;
      const text = trimmed ? checkNickname(trimmed).text : "";
      st = cleanLB({ ...st, optIn: true, playerId: st.playerId || newId(), nickname: text, registered: st.registered && st.nickname === text, failures: 0, nextTry: 0 });
      persist();
      return true;
    },
    /** Leave: deletes the nickname, id and queue here, and asks the backend to delete the entries.
     * If the backend can't be reached, the deletion is retried later (pendingOptOut). */
    async leave() {
      const id = st.playerId;
      tables = {}; saveTables();
      st = cleanLB({ pendingOptOut: [...st.pendingOptOut, ...(id ? [id] : [])] });
      persist();
      return { removed: await api.flushOptOuts() };
    },
    async flushOptOuts() {
      if (!st.pendingOptOut.length) return true;
      if (!adapter.connected || !online()) return false;
      for (const id of [...st.pendingOptOut])
        try { await adapter.optOut(id); st.pendingOptOut = st.pendingOptOut.filter((x) => x !== id); persist(); } catch { return false; }
      return true;
    },
    /** Queue best world scores (`world` 0-based from score.js; sent 1-based). Only while opted in; never lowers. */
    enqueue(worldTotals) {
      if (!st.optIn) return false;
      for (const { world, total, scored, ponds } of worldTotals) {
        const w = world + 1;
        if (scored > 0 && total > (st.sent[w] ?? -1) && total > (st.queue[w]?.score ?? -1)) st.queue[w] = { score: total, ponds: ponds?.map((p) => ({ id: p.id, score: p.score })) };
      }
      persist();
      return Object.keys(st.queue).length > 0;
    },
    enqueueProgress(progress) {
      if (!st.optIn) return false;
      const snapshot=campaignSnapshot(progress);
      if (fingerprint(snapshot)!==st.sentSnapshot) st.snapshot=snapshot;
      persist();return !!st.snapshot || Object.keys(st.queue).length>0;
    },
    pending: () => Object.keys(st.queue).length + (st.snapshot ? 1 : 0),
    flush(force = false) {
      if (flushing) return flushing;
      flushing=api.flushOnce(force).finally(()=>{flushing=null;});
      return flushing;
    },
    async flushOnce(force = false) {
      await api.flushOptOuts();
      if (!st.optIn) return { sent: 0, reason: "not-joined" };
      if (!adapter.connected) return { sent: 0, reason: "no-backend" };
      if (!online()) return { sent: 0, reason: "offline" };
      if (!force && now() < st.nextTry) return { sent: 0, reason: "backoff" };
      let sent = 0;
      const playerId=st.playerId;
      const stillJoined=()=>st.optIn&&st.playerId===playerId;
      try {
        if (!st.registered) {
          await adapter.join({ player_id: st.playerId, nickname: st.nickname || undefined });
          if(!stillJoined()){ await adapter.optOut(playerId);return {sent,reason:'not-joined'}; }
          st.registered = true;
          persist();
        }
        for (const [w, e] of Object.entries({ ...st.queue })) {
          try {
            const r = await adapter.score({ player_id: st.playerId, world: Number(w), score: e.score, ...(e.ponds?.length ? { ponds: e.ponds } : {}) });
            st.sent[w] = Math.max(st.sent[w] ?? 0, r?.score ?? e.score);
            sent++;
          } catch (err) {
            if (!(err instanceof HttpError) || !err.permanent) throw err;
            if (err.code === "not-joined") { st.registered = false; persist(); throw err; }
            // a permanent rejection (e.g. impossible total) is dropped, never retried forever
          }
          if (st.queue[w]?.score === e.score) delete st.queue[w];
          persist();
        }
        for(let pass=0;pass<8&&st.snapshot&&stillJoined();pass++) {
          const snapshot=st.snapshot,key=fingerprint(snapshot);
          await adapter.progress({player_id:playerId,...snapshot});
          if(!stillJoined()){await api.flushOptOuts();return {sent,reason:'not-joined'};}
          st.sentSnapshot=key;if(fingerprint(st.snapshot)===key)st.snapshot=null;
          sent++;persist();
        }
        if(!stillJoined()){await api.flushOptOuts();return {sent,reason:'not-joined'};}
        st.failures = 0;
        st.nextTry = 0;
        persist();
        return { sent, reason: "ok" };
      } catch (err) {
        if(err instanceof HttpError && err.code === 'not-joined') st.registered=false;
        st.failures = Math.min(20, st.failures + 1);
        st.nextTry = now() + backoff(st.failures);
        persist();
        return { sent, reason: "error", retryInMs: backoff(st.failures) };
      }
    },
    /** Top 10 for a world (0-based). Returns { mode:"shared", entries, me } or { mode:"local", reason, me }. */
    async board(world, local) {
      const key=world==='overall'?'overall':String(world+1);
      const me={nickname:api.displayName(),score:local?.total||0,scored:local?.scored||0,last_cleared:local?.last_cleared||0};
      const cached=()=>tables[key]?.entries?.length>=0?{...tables[key],mode:'cached',reason:online()?'error':'offline'}:null;
      if(!adapter.connected)return {mode:'local',reason:'no-backend',me};
      if(!online())return cached()||{mode:'local',reason:'offline',me};
      try {
        const b=await adapter.leaderboard(key==='overall'?'overall':Number(key),st.optIn?st.playerId:undefined);
        const result={mode:'shared',entries:b.top10.map(e=>({nickname:e.nickname||DEFAULT_NAME,score:e.score,rank:e.rank,last_cleared:e.last_cleared||0,me:e.me===true})),me:{...me,...b.me,nickname:b.me?.nickname||me.nickname},syncedAt:now()};
        tables[key]=result;saveTables();return result;
      }catch{return cached()||{mode:'local',reason:'error',me};}
    },
  };
  return api;
}
/** Which adapter this page uses. Test hook first (`?lb=mock` or localStorage capydoku.leaderboard.adapter = "mock"),
 * then the configured Worker URL (empty → off), else none. */
export function pickAdapter(storage, search = "", api = GAME_CONFIG.leaderboardApi) {
  let want = "";
  try { want = new URLSearchParams(search).get("lb") || storage.getItem("capydoku.leaderboard.adapter") || ""; } catch {}
  if (want === "none" && ["127.0.0.1","localhost"].includes(globalThis.location?.hostname)) return noneAdapter;
  if (want === "mock") return mockAdapter(storage);
  if (['127.0.0.1','localhost'].includes(globalThis.location?.hostname) && /^http:\/\/(127\.0\.0\.1|localhost):[0-9]+$/.test(want)) return httpAdapter(want);
  if (typeof api === "string" && /^https:\/\//.test(api)) return httpAdapter(api);
  return noneAdapter;
}
