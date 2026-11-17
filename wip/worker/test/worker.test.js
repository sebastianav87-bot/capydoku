// Worker handler tests on a local SQLite D1 stand-in. No Cloudflare account, no network.
import test from "node:test";
import assert from "node:assert/strict";
import { handle } from "../src/index.js";
import { worldMax, checkScore, cleanNickname, SPECIAL_MAX, NORMAL_MAX } from "../src/rules.js";
import { localD1 } from "./d1-shim.js";
const ORIGIN = "https://game.example";
const mk = () => ({ DB: localD1(), ALLOWED_ORIGIN: ORIGIN, RATE_SALT: "t" });
let ipN = 0;
const req = (env, method, path, body, { ip = "1.1.1." + (ipN++ % 250), origin = ORIGIN, now } = {}) =>
  handle(new Request("https://w.example" + path, { method, headers: { "content-type": "application/json", origin, "cf-connecting-ip": ip }, body: body === undefined ? undefined : JSON.stringify(body) }), env, now);
const id = (k) => `00000000-0000-4000-8000-${String(k).padStart(12, "0")}`;
test("rules: ceilings and nickname policy", () => {
  assert.equal(NORMAL_MAX, 2100);
  assert.equal(SPECIAL_MAX, 3150);
  for (let w = 1; w <= 5; w++) assert.equal(worldMax(w), 9 * 3150 + 21 * 2100); // 72 450
  assert.equal(checkScore({ world: 1, score: 72451 }).error, "impossible-total");
  assert.equal(checkScore({ world: 6, score: 1 }).error, "world");
  assert.equal(checkScore({ world: 1, score: 1.5 }).error, "score");
  assert.equal(checkScore({ world: 1, score: 10 }).error, "impossible-total"); // a scored world has ≥ 500
  assert.equal(checkScore({ world: 2, score: 2100, ponds: [{ id: 31, score: 2100 }] }).ok, true);
  assert.equal(checkScore({ world: 2, score: 2101, ponds: [{ id: 31, score: 2101 }] }).error, "impossible-pond");
  assert.equal(checkScore({ world: 2, score: 2100, ponds: [{ id: 1, score: 2100 }] }).error, "impossible-pond");
  assert.equal(checkScore({ world: 2, score: 3000, ponds: [{ id: 35, score: 3150 }] }).error, "ponds-sum");
  assert.deepEqual(cleanNickname(""), { ok: true, value: null });
  assert.equal(cleanNickname("x").ok, false);
  assert.equal(cleanNickname("a\u202eb").ok, false);
  assert.equal(cleanNickname("Seba 🌿").value, "Seba 🌿");
  assert.equal(cleanNickname("12345678901234567").ok, false);
});
test("join → score → leaderboard (top 10 + rank, ties by earliest) → opt-out", async () => {
  const env = mk();
  let r = await req(env, "POST", "/v1/join", { nickname: "Mossy" });
  assert.equal(r.status, 200);
  const minted = (await r.json()).player_id;
  assert.match(minted, /^[0-9a-f-]{36}$/);
  for (let k = 1; k <= 12; k++) {
    assert.equal((await req(env, "POST", "/v1/join", { player_id: id(k), nickname: `Capy${k}` })).status, 200);
    r = await req(env, "POST", "/v1/score", { player_id: id(k), world: 1, score: 1000 * k }, { now: 1000 + k });
    assert.equal(r.status, 200);
  }
  // tie with player 12's score, later → ranked after
  await req(env, "POST", "/v1/score", { player_id: minted, world: 1, score: 12000 }, { now: 5000 });
  r = await req(env, "GET", `/v1/leaderboard?world=1&player_id=${minted}`);
  const b = await r.json();
  assert.equal(b.top10.length, 10);
  assert.deepEqual(b.top10[0], { rank: 1, nickname: "Capy12", score: 12000, last_cleared:0 });
  assert.equal(b.top10[1].nickname, "Mossy");
  assert.equal(b.top10[1].me, true);
  assert.deepEqual(b.me, { rank: 2, of: 13, nickname: "Mossy", score: 12000, last_cleared:0 });
  r = await req(env, "GET", `/v1/leaderboard?world=1&player_id=${id(1)}`);
  assert.deepEqual((await r.json()).me, { rank: 13, of: 13, nickname: "Capy1", score: 1000, last_cleared:0 });
  assert.deepEqual((await (await req(env, "GET", "/v1/leaderboard?world=3")).json()).me, { rank: null });
  // opt-out deletes the player and their scores
  r = await req(env, "POST", "/v1/opt-out", { player_id: minted });
  assert.deepEqual(await r.json(), { player_id: minted, opted_in: false, deleted: true });
  assert.equal(env.DB.raw.prepare("SELECT COUNT(*) n FROM world_scores WHERE player_id = ?").get(minted).n, 0);
  assert.equal(env.DB.raw.prepare("SELECT COUNT(*) n FROM players WHERE id = ?").get(minted).n, 0);
  assert.equal((await (await req(env, "GET", "/v1/leaderboard?world=1")).json()).top10[1].nickname, "Capy11");
});
test("best-score-only writes; impossible totals and unknown players rejected", async () => {
  const env = mk();
  await req(env, "POST", "/v1/join", { player_id: id(1) });
  assert.equal((await (await req(env, "POST", "/v1/score", { player_id: id(1), world: 2, score: 5000 })).json()).accepted, true);
  let r = await (await req(env, "POST", "/v1/score", { player_id: id(1), world: 2, score: 4000 })).json();
  assert.equal(r.accepted, false);
  assert.equal(r.score, 5000);
  assert.equal((await (await req(env, "POST", "/v1/score", { player_id: id(1), world: 2, score: 6000 })).json()).score, 6000);
  r = await req(env, "POST", "/v1/score", { player_id: id(1), world: 2, score: 72451 });
  assert.equal(r.status, 422);
  assert.equal((await r.json()).error, "impossible-total");
  assert.equal((await req(env, "POST", "/v1/score", { player_id: id(99), world: 2, score: 600 })).status, 403);
  assert.equal((await req(env, "POST", "/v1/score", { player_id: "nope", world: 2, score: 600 })).status, 400);
  assert.equal((await req(env, "POST", "/v1/join", { player_id: id(2), nickname: "\u0007bad" })).status, 400);
  assert.equal(env.DB.raw.prepare("SELECT score FROM world_scores WHERE player_id = ? AND world = 2").get(id(1)).score, 6000);
});
test("rate limits per IP and per player (fixed windows)", async () => {
  const env = mk(), ip = "9.9.9.9";
  let ok = 0, limited = 0;
  for (let k = 0; k < 8; k++) { const s = (await req(env, "POST", "/v1/join", { player_id: id(100 + k) }, { ip, now: 60000 })).status; s === 200 ? ok++ : s === 429 && limited++; }
  assert.deepEqual([ok, limited], [6, 2]);
  assert.equal((await req(env, "POST", "/v1/join", { player_id: id(200) }, { ip, now: 120000 })).status, 200); // next minute
  await req(env, "POST", "/v1/join", { player_id: id(300) }, { ip: "8.8.8.8" });
  let statuses = [];
  for (let k = 0; k < 22; k++) statuses.push((await req(env, "POST", "/v1/score", { player_id: id(300), world: 1, score: 1000 + k }, { now: 600000 })).status);
  assert.equal(statuses.filter((s) => s === 200).length, 20);
  assert.equal(statuses.filter((s) => s === 429).length, 2);
  // raw IPs are never stored
  const keys = env.DB.raw.prepare("SELECT key FROM rate_limits").all().map((r) => r.key).join(" ");
  assert.ok(!keys.includes("9.9.9.9") && !keys.includes("8.8.8.8"));
});
test("CORS: only the game origin; preflight; bad routes/bodies", async () => {
  const env = mk();
  let r = await req(env, "GET", "/v1/leaderboard?world=1", undefined, { origin: "https://evil.example" });
  assert.equal(r.status, 403);
  r = await req(env, "OPTIONS", "/v1/score");
  assert.equal(r.status, 204);
  assert.equal(r.headers.get("access-control-allow-origin"), ORIGIN);
  assert.equal((await req(env, "GET", "/v1/leaderboard?world=1")).headers.get("access-control-allow-origin"), ORIGIN);
  assert.equal((await req(env, "GET", "/v1/leaderboard?world=0")).status, 400);
  assert.equal((await req(env, "GET", "/nope")).status, 404);
  assert.equal((await handle(new Request("https://w.example/v1/join", { method: "POST", headers: { origin: ORIGIN }, body: "{not json" }), env)).status, 400);
});

test('public Overall: migrated progress, best totals, consecutive tie break, replay and deletion',async()=>{
 const env=mk(),done=n=>Array.from({length:n},(_,i)=>i+1);
 const snapshot=(player_id,score,last)=>({player_id,completed:done(last),worlds:Array.from({length:5},(_,i)=>({world:i+1,score:i===0?score:0,ponds:i===0&&score?[{id:1,score}]:[]}))});
 const anonymous=await (await req(env,'GET','/v1/leaderboard')).json();assert.deepEqual(anonymous.top10,[]);assert.equal(env.DB.raw.prepare('SELECT COUNT(*) n FROM players').get().n,0);
 for(const k of [1,2])await req(env,'POST','/v1/join',{player_id:id(k),nickname:`Capy${k}`});
 assert.equal((await req(env,'POST','/v1/progress',snapshot(id(1),2000,41))).status,200);
 assert.equal((await req(env,'POST','/v1/progress',snapshot(id(2),2000,42))).status,200);
 let board=await (await req(env,'GET',`/v1/leaderboard?player_id=${id(1)}`)).json();
 assert.equal(board.world,'overall');assert.deepEqual(board.top10.map(r=>[r.nickname,r.score,r.last_cleared]),[['Capy2',2000,42],['Capy1',2000,41]]);assert.equal(board.me.rank,2);
 await req(env,'POST','/v1/progress',snapshot(id(1),2100,41));
 board=await (await req(env,'GET','/v1/leaderboard')).json();assert.equal(board.top10[0].nickname,'Capy1');assert.equal(board.top10[0].last_cleared,41);
 await req(env,'POST','/v1/progress',snapshot(id(1),1000,2));
 board=await (await req(env,'GET','/v1/leaderboard')).json();assert.equal(board.top10[0].score,2100);assert.equal(board.top10[0].last_cleared,41);
 const migrated=snapshot(id(2),0,60);await req(env,'POST','/v1/progress',migrated);
 board=await (await req(env,'GET','/v1/leaderboard?world=1')).json();assert.equal(board.top10.find(r=>r.nickname==='Capy2').last_cleared,60);
 await req(env,'POST','/v1/opt-out',{player_id:id(1)});assert.equal(env.DB.raw.prepare('SELECT COUNT(*) n FROM campaign_progress WHERE player_id=?').get(id(1)).n,0);
 assert.equal((await (await req(env,'GET','/v1/leaderboard')).json()).top10.length,1);
 const invalid=snapshot(id(2),1000,2);invalid.worlds[2].score=999999;assert.equal((await req(env,'POST','/v1/progress',invalid)).status,422);
 assert.equal(env.DB.raw.prepare('SELECT last_cleared n FROM campaign_progress WHERE player_id=?').get(id(2)).n,60);
 const gap=snapshot(id(2),0,2);gap.completed=[1,2,4,5];const freshId=id(3);await req(env,'POST','/v1/join',{player_id:freshId});gap.player_id=freshId;await req(env,'POST','/v1/progress',gap);
 assert.equal(env.DB.raw.prepare('SELECT last_cleared n FROM campaign_progress WHERE player_id=?').get(freshId).n,2);
});
