// Shared leaderboard: automatic enrollment, aggregate scores, offline sync and legacy migration.
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
  test(`[${kind}] spectator: nothing queued or published; public shared view`, async () => {
    const { s, adapter } = make(), lb = createLeaderboard({ storage: s, adapter, newId: ids });
    assert.equal(lb.enqueue([W(0, 5000)]), false);
    assert.deepEqual(await lb.flush(), { sent: 0, reason: "not-joined" });
    const b = await lb.board(0, { total: 5000, scored: 3 });
    assert.deepEqual([b.mode, b.reason, b.me.nickname], ["shared", undefined, DEFAULT_NAME]);
    assert.ok(!(await adapter.leaderboard(1)).top10.some((e) => e.score === 5000));
  });
  test(`[${kind}] join (optional nickname) → queue → flush → top 10 + rank → reload preserves membership`, async () => {
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
    assert.equal(typeof lb.leave, 'undefined');
    const resumed = createLeaderboard({storage:s,adapter,newId:ids});
    assert.equal(resumed.state().playerId,id);assert.equal((await resumed.board(0)).me.rank,1);
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
test("adapter choice: none with an empty API URL, mock only via the test hook, http only with an https URL", async () => {
  const s = mem();
  assert.equal(pickAdapter(s, "", "").name, "none");
  assert.equal(pickAdapter(s, "?lb=mock").name, "mock");
  assert.equal(pickAdapter(s, "", "http://insecure.example").name, "none");
  assert.equal(pickAdapter(s, "", "https://x.workers.dev").name, "http");
  s.setItem("capydoku.leaderboard.adapter", "mock");
  assert.equal(pickAdapter(s, "").name, "mock");
  const { GAME_CONFIG } = await import("../config.js");
  assert.match(GAME_CONFIG.leaderboardApi, /^https:\/\//);
  const lb = createLeaderboard({ storage: mem(), adapter: noneAdapter, newId: ids });
  lb.join("Zed");
  lb.enqueue([W(0, 5)]);
  assert.deepEqual(await lb.flush(), { sent: 0, reason: "no-backend" });
  assert.equal((await lb.board(0, { total: 5, scored: 1 })).reason, "no-backend");
  assert.equal(cleanLB({ optIn: true }).optIn, false);
  assert.deepEqual(cleanLB({ optIn: false, playerId: "00000000-0000-4000-8000-000000000001", nickname: "Hi", queue: { 1: { score: 5 } } }), cleanLB(null));
  assert.deepEqual(cleanLB({ optIn: true, playerId: "00000000-0000-4000-8000-000000000001", queue: { 1: { score: 5 }, 9: { score: 1 }, 2: { score: -3 }, 3: { score: 99999 } } }).queue, { 1: { score: 5, ponds: undefined } });
});

test('game nicknames enroll two existing profiles with historical scores without a separate join', async () => {
  const { adapter } = workerAdapter(), a = createLeaderboard({storage:mem(),adapter,newId:ids}), b = createLeaderboard({storage:mem(),adapter,newId:ids});
  assert.equal(a.autoJoin('Juniper'),true);assert.equal(b.autoJoin('Pebble'),true);
  a.enqueueProgress({completed:[1,2],scores:{1:{best:1200}}});b.enqueueProgress({completed:[1],scores:{1:{best:900}}});
  await a.flush();await b.flush();
  const board=await b.board('overall');assert.deepEqual(board.entries.map(r=>[r.nickname,r.score,r.last_cleared]),[['Juniper',1200,2],['Pebble',900,1]]);
  assert.equal(a.autoJoin('Another name'),false);assert.equal(a.displayName(),'Juniper');
});

test('automatic enrollment survives offline reload without exposing a leave operation', async () => {
  const s=mem(),{adapter}=workerAdapter();let online=false;
  let lb=createLeaderboard({storage:s,adapter,online:()=>online,newId:ids});
  assert.equal(lb.autoJoin('Fern'),true);lb.enqueueProgress({completed:[1],scores:{1:{best:700}}});
  assert.equal((await lb.flush()).reason,'offline');
  lb=createLeaderboard({storage:s,adapter,online:()=>online,newId:ids});online=true;await lb.flush();
  assert.equal((await lb.board('overall')).entries[0].score,700);assert.equal(typeof lb.leave,'undefined');
});

test('legacy exclusions no longer prevent automatic enrollment; pending old deletions reuse their identity', async () => {
  const s=mem(),{adapter}=workerAdapter(),id=ids();
  await adapter.join({player_id:id,nickname:'Legacy'});
  s.setItem(LB_KEY,JSON.stringify({v:3,optIn:false,excluded:true,pendingOptOut:[id]}));
  const lb=createLeaderboard({storage:s,adapter,newId:ids});assert.equal(lb.autoJoin('Legacy'),true);assert.equal(lb.state().playerId,id);assert.deepEqual(lb.state().pendingOptOut,[]);
  lb.enqueueProgress({completed:[1],scores:{1:{best:600}}});await lb.flush();assert.equal((await lb.board('overall')).entries.length,1);
  assert.equal(createLeaderboard({storage:mem(),adapter:noneAdapter,newId:ids}).autoJoin('Local'),false);
  assert.equal(createLeaderboard({storage:mem(),adapter:mockAdapter(mem()),newId:ids}).autoJoin(''),false);
});
