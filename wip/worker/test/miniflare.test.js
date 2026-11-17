// Runs the real Worker in workerd via Miniflare with a LOCAL D1 (in-memory). No Cloudflare account, no login,
// no network: Miniflare never contacts Cloudflare for these bindings.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Miniflare } from "miniflare";
test("Worker + local D1 under Miniflare (workerd)", async (t) => {
  const mf = new Miniflare({
    modules: true,
    scriptPath: new URL("../src/index.js", import.meta.url).pathname,
    modulesRules: [{ type: "ESModule", include: ["**/*.js"] }],
    compatibilityDate: "2026-08-01",
    d1Databases: { DB: "capybara-calm-local" },
    bindings: { ALLOWED_ORIGIN: "https://game.example", RATE_SALT: "local-test" },
  });
  t.after(() => mf.dispose());
  const db = await mf.getD1Database("DB");
  const schema = (await readFile(new URL("../schema.sql", import.meta.url), "utf8")).replace(/--.*$/gm, "");
  for (const stmt of schema.split(";").map((s) => s.trim()).filter(Boolean)) await db.prepare(stmt).run();
  const H = { origin: "https://game.example", "content-type": "application/json" };
  const post = (p, b) => mf.dispatchFetch(`http://local${p}`, { method: "POST", headers: H, body: JSON.stringify(b) });
  const id = "11111111-1111-4111-8111-111111111111";
  let r = await post("/v1/join", { player_id: id, nickname: "Seba" });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).opted_in, true);
  r = await post("/v1/score", { player_id: id, world: 1, score: 4100, ponds: [{ id: 1, score: 2100 }, { id: 2, score: 2000 }] });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).rank, 1);
  r = await post("/v1/score", { player_id: id, world: 1, score: 3000 });
  assert.equal((await r.json()).accepted, false); // best-only
  r = await post("/v1/score", { player_id: id, world: 1, score: 99999 });
  assert.equal(r.status, 422); // impossible total
  r = await mf.dispatchFetch(`http://local/v1/leaderboard?world=1&player_id=${id}`, { headers: H });
  const b = await r.json();
  assert.deepEqual([b.top10[0].nickname, b.top10[0].score, b.me.rank], ["Seba", 4100, 1]);
  r = await mf.dispatchFetch("http://local/v1/leaderboard?world=1", { headers: { origin: "https://evil.example" } });
  assert.equal(r.status, 403);
  r = await post("/v1/opt-out", { player_id: id });
  assert.equal(r.status, 200);
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM world_scores").first()).n, 0);
});
