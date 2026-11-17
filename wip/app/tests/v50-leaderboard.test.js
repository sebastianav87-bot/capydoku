// v5.0 leaderboard client: opt-in only, privacy (nothing queued or sent before joining), offline queue + backoff,
// leave deletes (retried if offline), adapter contract — the local mock AND the real Worker handler
// (worker/src/index.js on a local SQLite stand-in; no Cloudflare account, no network).
import test from "node:test";
import assert from "node:assert/strict";
import { createLeaderboard, mockAdapter, noneAdapter, httpAdapter, cleanLB, backoff, LB_KEY, MOCK_DB_KEY, pickAdapter, DEFAULT_NAME, WORLD_MAX } from "../leaderboard.js";
import { handle } from "../../worker/src/index.js";
import { worldMax } from "../../worker/src/rules.js";
import { localD1 } from "../../worker/test/d1-shim.js";
const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }; };
const W = (world, total, scored = 1, ponds) => ({ world, total, scored, ponds });
let n = 0;
const ids = () => `00000000-0000-4000-9000-${String(++n).padStart(12, "0")}`;
// The real Worker, reached through httpAdapter with an in-process fetch.
function workerAdapter() {
  const env = { DB: localD1(new URL("../../worker/schema.sql", import.meta.url)), ALLOWED_ORIGIN: "https://game.example", RATE_SALT: "t" };
  let ip = 0;
  const fetchImpl = (url, init) => handle(new Request(url, { ...init, headers: { ...init.headers, origin: "https://game.example", "cf-connecting-ip": `10.0.0.${ip++ % 250}` } }), env);
  const seed = httpAdapter("https://w.example/", fetchImpl);
  return { env, adapter: seed };
}
test("client and Worker share the same world ceiling", () => {
  for (let w = 1; w <= 5; w++) assert.equal(worldMax(w), WORLD_MAX);
});
for (const kind of ["mock", "worker"]) {
  const make = () => {
    const s = mem();
    return kind === "mock" ? { s, adapter: mockAdapter(s) } : { s, ...workerAdapter() };
  };
  test(`[${kind}] not joined: nothing queued or sent; local view`, async () => {
    const { s, adapter } = make(), lb = createLeaderboard({ storage: s, adapter, newId: ids });
    assert.equal(lb.enqueue([W(0, 5000)]), false);
    assert.deepEqual(await lb.flush(), { sent: 0, reason: "not-joined" });
    const b = await lb.board(0, { total: 5000, scored: 3 });
    assert.deepEqual([b.mode, b.reason, b.me.nickname], ["local", "not-joined", DEFAULT_NAME]);
    assert.ok(!(await adapter.leaderboard(1)).top10.some((e) => e.score === 5000));
  });
  test(`[${kind}] join (optional nickname) → queue → flush → top 10 + rank → leave deletes`, async () => {
    const { s, adapter, env } = make(), lb = createLeaderboard({ storage: s, adapter, newId: ids });
    assert.equal(lb.join("x"), false);
    assert.equal(lb.state().optIn, false);
    assert.equal(lb.join(""), true);
    assert.equal(lb.displayName(), DEFAULT_NAME);
    assert.equal(lb.join("Seba 🌿"), true);
    if (kind === "worker") for (let k = 0; k < 11; k++) { const id = ids(); await adapter.join({ player_id: id, nickname: `C${k}` }); await adapter.score({ player_id: id, world: 1, score: 1000 + k * 100 }); }
    assert.ok(lb.enqueue([W(0, 70000, 30), W(1, 0, 0)]));
    assert.equal(lb.pending(), 1);
    assert.deepEqual(await lb.flush(), { sent: 1, reason: "ok" });
    assert.equal(lb.pending(), 0);
    const b = await lb.board(0, { total: 70000, scored: 30 });
    assert.equal(b.mode, "shared");
    assert.equal(b.entries.length, 10);
    assert.deepEqual([b.entries[0].nickname, b.entries[0].me, b.me.rank], ["Seba 🌿", true, 1]);
    lb.enqueue([W(0, 100)]); // lower never re-queued
    assert.equal(lb.pending(), 0);
    const id = lb.state().playerId;
    assert.deepEqual(await lb.leave(), { removed: true });
    const st = JSON.parse(s.getItem(LB_KEY));
    assert.deepEqual([st.optIn, st.playerId, st.nickname, st.queue, st.pendingOptOut], [false, null, "", {}, []]);
    assert.equal((await adapter.leaderboard(1, id)).me.rank, null);
    if (kind === "worker") assert.equal(env.DB.raw.prepare("SELECT COUNT(*) n FROM players WHERE id = ?").get(id).n, 0);
  });
  test(`[${kind}] offline: queued, survives reload, flushes when back online`, async () => {
    const { s, adapter } = make();
    let on = false;
    const lb = createLeaderboard({ storage: s, adapter, online: () => on, newId: ids });
    lb.join("Mo");
    lb.enqueue([W(2, 4100, 2, [{ id: 61, score: 2100 }, { id: 62, score: 2000 }])]);
    assert.deepEqual(await lb.flush(), { sent: 0, reason: "offline" });
    assert.equal((await lb.board(2, { total: 4100, scored: 2 })).reason, "offline");
    const lb2 = createLeaderboard({ storage: s, adapter, online: () => on, newId: ids });
    assert.equal(lb2.pending(), 1);
    on = true;
    assert.equal((await lb2.flush()).sent, 1);
    assert.equal((await lb2.board(2, { total: 4100, scored: 2 })).me.rank >= 1, true);
  });
}
test("server errors back off exponentially (5 s … 10 min); permanent rejections are dropped", async () => {
  const s = mem(), mock = mockAdapter(s);
  let t = 1000;
  const lb = createLeaderboard({ storage: s, adapter: mock, now: () => t, newId: ids });
  lb.join("");
  lb.enqueue([W(0, 1234)]);
  const setFail = (v) => s.setItem(MOCK_DB_KEY, JSON.stringify({ ...JSON.parse(s.getItem(MOCK_DB_KEY)), fail: v }));
  setFail(true);
  assert.equal((await lb.flush()).reason, "error");
  assert.equal(lb.state().nextTry, 1000 + 5000);
  assert.equal((await lb.flush()).reason, "backoff");
  t += 5000;
  assert.equal((await lb.flush()).reason, "error");
  assert.equal(lb.state().nextTry, t + 10000);
  assert.equal(backoff(1), 5000);
  assert.equal(backoff(30), 600000);
  setFail(false);
  assert.equal((await lb.flush(true)).sent, 1);
  assert.equal(lb.state().failures, 0);
  // the Worker refuses an impossible total → dropped from the queue, not retried forever
  const { adapter } = workerAdapter(), lb2 = createLeaderboard({ storage: mem(), adapter, newId: ids });
  lb2.join("Cheat");
  lb2.enqueue([W(0, 72000, 1, [{ id: 1, score: 72000 }])]);
  assert.deepEqual(await lb2.flush(), { sent: 0, reason: "ok" });
  assert.equal(lb2.pending(), 0);
});
test("leaving while offline deletes locally now and on the server later", async () => {
  const s = mem(), mock = mockAdapter(s);
  let on = true;
  const lb = createLeaderboard({ storage: s, adapter: mock, online: () => on, newId: ids });
  lb.join("Pip");
  lb.enqueue([W(0, 3000)]);
  await lb.flush();
  const id = lb.state().playerId;
  on = false;
  assert.deepEqual(await lb.leave(), { removed: false });
  assert.equal(lb.state().optIn, false);
  assert.deepEqual(lb.state().pendingOptOut, [id]);
  assert.ok(JSON.parse(s.getItem(MOCK_DB_KEY)).players[id]);
  on = true;
  await lb.flush();
  assert.equal(JSON.parse(s.getItem(MOCK_DB_KEY)).players[id], undefined);
  assert.deepEqual(lb.state().pendingOptOut, []);
});
test("adapter choice: none by default (API URL empty), mock only via the test hook, http only with an https URL", async () => {
  const s = mem();
  assert.equal(pickAdapter(s, "").name, "none");
  assert.equal(pickAdapter(s, "?lb=mock").name, "mock");
  assert.equal(pickAdapter(s, "", "http://insecure.example").name, "none");
  assert.equal(pickAdapter(s, "", "https://x.workers.dev").name, "http");
  s.setItem("capydoku.leaderboard.adapter", "mock");
  assert.equal(pickAdapter(s, "").name, "mock");
  const { GAME_CONFIG } = await import("../config.js");
  assert.equal(GAME_CONFIG.leaderboardApi, "");
  const lb = createLeaderboard({ storage: mem(), adapter: noneAdapter, newId: ids });
  lb.join("Zed");
  lb.enqueue([W(0, 5)]);
  assert.deepEqual(await lb.flush(), { sent: 0, reason: "no-backend" });
  assert.equal((await lb.board(0, { total: 5, scored: 1 })).reason, "no-backend");
  assert.equal(cleanLB({ optIn: true }).optIn, false);
  assert.deepEqual(cleanLB({ optIn: false, playerId: "00000000-0000-4000-8000-000000000001", nickname: "Hi", queue: { 1: { score: 5 } } }), cleanLB(null));
  assert.deepEqual(cleanLB({ optIn: true, playerId: "00000000-0000-4000-8000-000000000001", queue: { 1: { score: 5 }, 9: { score: 1 }, 2: { score: -3 }, 3: { score: 99999 } } }).queue, { 1: { score: 5, ponds: undefined } });
});
