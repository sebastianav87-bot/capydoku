# Capybara Calm — optional leaderboard Worker (Cloudflare Workers Free + D1)

**Status: written and tested locally only. NOT deployed. No Cloudflare account, login or API call has been made.**
The game ships with `GAME_CONFIG.leaderboardApi = ''` (app/config.js), so the shared leaderboard is OFF and the game
shows its local-only view. Nothing leaves the device until that URL is set *and* a player opts in.

## What it does
| Endpoint | Body / query | Result |
|---|---|---|
| `POST /v1/join` | `{player_id?, nickname?}` | `{player_id, nickname, opted_in:true}` (upsert; nickname optional, 2–16 chars) |
| `POST /v1/score` | `{player_id, world 1–5, score, ponds?:[{id, score}]}` | `{accepted, world, score, rank, top10}` |
| `GET /v1/leaderboard` | `?world=1–5&player_id=` | `{world, top10:[{rank, nickname, score, me?}], me:{rank, of, nickname, score}}` |
| `POST /v1/opt-out` | `{player_id}` | deletes the player row **and** all their scores |

Server-side checks (src/rules.js): impossible totals rejected (per world ≤ 72 450 = 9 crate/boss ponds × 3150 + 21 ponds × 2100;
optional per-pond breakdown must sum to the total, ponds must belong to that world and each stay within its
pond cap); **best-score-only** writes (`ON CONFLICT … WHERE excluded.score > world_scores.score`); fixed-window
rate limits in D1 (join 6/min + 30/h per IP, score 20/min per player + 60/min per IP, read 120/min, opt-out 10/min).
IP addresses are never stored: only a salted SHA-256 (`RATE_SALT`) inside short-lived rate-limit rows.
Personal data stored: a random UUID and the optional nickname. No email, no account, no device data.
CORS only for `ALLOWED_ORIGIN`.

## Tests (no account needed)
```
npm install          # miniflare (dev only)
npm test             # handler + rules on a node:sqlite D1 stand-in, then the real Worker in workerd via Miniflare with a local D1
```
The game's client tests (app/tests/v50-leaderboard.test.js) also run the client against `handle()` here.

## Deploy steps — for Sebastián, once the account exists (not done)
1. Create a free Cloudflare account (Workers Free plan; no payment method needed).
2. `npx wrangler login`
3. `npx wrangler d1 create capybara-calm-leaderboard` → copy the `database_id` into wrangler.toml.
4. Set `ALLOWED_ORIGIN` in wrangler.toml to the game origin (e.g. `https://<user>.github.io`).
5. `npx wrangler d1 execute capybara-calm-leaderboard --remote --file=schema.sql`
6. `npx wrangler secret put RATE_SALT` (any long random string).
7. `npx wrangler deploy` → note the `https://capybara-calm-leaderboard.<subdomain>.workers.dev` URL.
8. In the game, set `leaderboardApi` in app/config.js to that URL (https only), rebuild the service worker
   (`python3 build-sw.py --bump-cache`) and publish. Until then the app stays local-only.
9. Optional: add a Cloudflare rate-limiting rule / WAF as a second layer; Free plan limits (check the current Cloudflare docs; not
   verified live) are about 100 000 Worker requests/day and D1 5 M rows read / 100 000 rows written per day.

Local dev server without login (optional): `npx wrangler dev --local` needs wrangler installed; Miniflare (used in
the tests) is the same runtime.
