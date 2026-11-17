# Capybara Calm v5.0 — shared leaderboard backend options

**Research only.** No accounts were created, no services were signed up for, and no money was spent. This note is for The Producer to take to Sebastián before any account is opened.

Checked against official pricing and limit pages on **16 November 2026** (America/New_York). Limits change; re-check the cited URLs before signing up.

## Constraints (from the approved brief)

- Static PWA, GitHub Pages–style hosting. The game itself stays a static site.
- Opt-in shared ranking only. Local scores always work offline; upload happens after the player joins.
- Optional nickname, and no other personal data.
- 5 worlds; a world score is the sum of that player's best pond scores. Need a per-world top 10 and the player's rank.
- Hobby scale: likely under a few thousand players.
- Must stay **free**, with **no card on file** and no paid tier.

A client-only puzzle game cannot fully prevent cheat scores. The backend should still reject impossible values, keep a best-score-only write, rate-limit, and never expose a write secret in the PWA.

---

## Recommendation

**Use Cloudflare Workers (Free) + D1 as the shared leaderboard API.**

The PWA keeps talking to a public HTTPS endpoint with ordinary `fetch()`. The Worker is the only thing that can write to the database, so secrets stay off the client, scores can be checked server-side, and the static GitHub Pages site does not need to move.

**Runner-up: Supabase Free** (Postgres + Row Level Security + Edge Functions). Slightly easier dashboard and client library, but free projects pause after a week of low activity, which is a real risk for a quiet hobby game.

Do not open an account until Sebastián confirms. Suggested later steps and a minimal schema are at the end of this note.

---

## Snapshot

| Option | Card on free tier? | Stays free if we never upgrade? | Server-side score checks on the free tier? | Safe from a public PWA? | Main free-tier risk |
|---|---|---|---|---|---|
| **Cloudflare Workers + D1** | No (signup is email + password; Workers Free is the default $0 plan) | Yes. Over-limit calls return errors; no bill. | Yes, in the Worker. | Yes, if the client only calls the Worker. | 100k Worker requests/day and 10 ms CPU; daily D1 caps. |
| **Supabase Free** | No (a card is required only for paid plans) | Yes, if the org stays on Free and no card is added. | Yes, via Edge Functions (500k invocations/month). | Yes, if the anon key cannot write scores directly (RLS + function). | Project **pauses after ~1 week** of low activity. |
| **Firebase Spark (Firestore)** | No. Official page: “No payment method needed.” | Yes. Over-quota usage is **shut off**, not billed. | **No.** Cloud Functions are not on Spark (they need Blaze, which needs a billing account). | Only partially: Security Rules can bound and lock a player's own row. A cheater can still submit the maximum allowed score. | Daily read/write caps; leaderboard goes down for the rest of the month if a monthly quota is exceeded. |
| **Upstash Redis Free** | No. Official docs: “No credit card required.” | Yes, until a payment method is added (adding a card moves **all** free resources to paid). | Not by itself. | **No**, if the standard (write) token is in the PWA. A read-only token is only safe for public reads. Writes need another free server (e.g. a Worker), at which point D1 is simpler. | 500k commands/month; **archived after ≥30 days** of inactivity. |
| **PocketBase (self-host)** | The software is free. Hosting a server is not. | No, not under a $0 / no-card rule. A VPS, even a cheap one, is a paid bill. “Always free” VMs have their own limits and account-risk caveats. | Yes, if you write custom hooks on the server. | Yes, once it is hosted and locked down. | **Hosting costs money.** Out for this budget. |
| **LootLocker Personal** | Official pages do not require a card for Personal. A card **is** required for the Pro 30-day trial. | Yes, while under the Personal eligibility rules. Over-cap behaviour is a cap / conversation, not an automatic charge (see the caveat below). | Weak. Scores are submitted from the client unless you add your own trusted server. | Guest login works from a web client via REST. The game key is still a public client secret; treat it as abuse-resistant, not cheat-proof. | 10k MAU cap; self-certified “under $100k revenue/funding” rule; unpublished rate limits; heavier player-account model than nickname-only. |

---

## 1. Cloudflare Workers + D1 (recommended)

### Free limits

From the official Workers, Workers limits, and D1 pricing pages:

| Item | Workers Free |
|---|---|
| Worker requests | 100,000 / day (reset 00:00 UTC). Over the cap, further invocations fail. |
| CPU time | 10 ms per invocation. Waiting on D1 / `fetch()` does **not** count as CPU. |
| Memory | 128 MB |
| Workers per account | 100 |
| D1 rows read | 5 million / day |
| D1 rows written | 100,000 / day |
| D1 storage | 5 GB total |
| D1 databases | 10 |
| Egress / bandwidth | No D1 data-transfer charge |
| KV (if used instead of D1) | 100,000 reads/day, only **1,000 writes/day**, 1 GB. Too tight for score writes; use D1, not KV. |

Sources: [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), [KV pricing](https://developers.cloudflare.com/kv/platform/pricing/).

There is no inactivity pause for Workers or D1 on the free plan. An unused hobby project keeps working.

### Credit card

[Create a Cloudflare account](https://developers.cloudflare.com/fundamentals/account/create-account/) asks for an email and password only. [Workers Free](https://www.cloudflare.com/plans/developer-platform-pricing/) is $0/mo and is the default (“By default, users have access to the Workers Free plan”). A payment method is needed only if someone later enables [Workers Paid](https://developers.cloudflare.com/workers/platform/pricing/) (from $5/month).

### Safe to call from a public client?

Yes, **if the PWA never talks to D1 directly**. The Worker holds the database binding. The client sends `player_id`, optional nickname, world id, and a claimed world score (plus a pond breakdown if we want tighter checks). The Worker should:

- Rate-limit by IP and by `player_id`.
- Accept only worlds 1–5, integer scores, and a short sanitized nickname.
- Reject any score above a published per-world ceiling (from the v5.0 formula: 1000 + 200 × oranges left + time bonus up to 500, halved if Show-me or Second chance was used, ×1.5 for bosses and crate ponds, summed across 30 ponds).
- Store only the best score per player per world (replays can raise, never lower).
- Return top 10 and the player's rank from indexed SQL (`ORDER BY score DESC LIMIT 10`, and `COUNT(*)` where `score > mine`).

CORS should allow only the game origin. This does not make cheating impossible in a client-side game, but it stops casual writes, overwrites of other players, and obviously fake totals.

### Privacy and data location

Store only: a client-generated player UUID, optional nickname, world scores, and timestamps. No email, no phone, no account password.

D1 can be created with a **jurisdiction** of `us` or `eu` (locked at creation) so data stays in the US or the EU. AES-256 at rest, TLS in transit.

Sources: [D1 data location](https://developers.cloudflare.com/d1/configuration/data-location/), [D1 data security](https://developers.cloudflare.com/d1/reference/data-security/).

### Ease from vanilla JS

Straightforward: `fetch('https://<worker>.workers.dev/v1/leaderboard?world=1&player_id=…')`. No SDK required. Deploy with Wrangler or the dashboard. The game stays on GitHub Pages; only the API lives on Cloudflare.

### Surprise-charge risk

**Low**, as long as the account stays on Workers Free and no payment method is added. Hitting a free daily cap returns an error until 00:00 UTC; it does not open a bill. The failure mode is “leaderboard temporarily unavailable,” which the PWA already has to handle offline anyway.

Caveats: keep rank queries indexed so they stay under 10 ms of CPU; 100k requests/day is ample for a few thousand players, but a scrape or retry storm could burn the daily cap (rate-limit in the Worker).

---

## 2. Supabase Free (runner-up)

### Free limits

From the official pricing and billing pages:

| Item | Free plan |
|---|---|
| Price | $0/month |
| Active projects | 2 (paused projects do not count) |
| API requests | Unlimited |
| Database | 500 MB, shared CPU, 500 MB RAM |
| Egress | 5 GB (plus 5 GB cached egress) |
| File storage | 1 GB |
| Auth MAUs | 50,000 |
| Edge Function invocations | 500,000 / month (no overage on Free; charged only on paid plans) |
| Realtime | 2 million messages, 200 peak connections |
| **Pausing** | **Paused after 1 week of inactivity.** A few database requests each day usually prevent this. Warning email ~1 week before, then a pause email. Restore from the dashboard for up to 1 year. Paid plans do not pause. |

Sources: [Supabase pricing](https://supabase.com/pricing), [About billing](https://supabase.com/docs/guides/platform/billing-on-supabase), [Project pausing](https://supabase.com/docs/guides/platform/free-project-pausing), [Edge Functions pricing](https://supabase.com/docs/guides/functions/pricing).

### Credit card

[Get set up for billing](https://supabase.com/docs/guides/platform/get-set-up-for-billing) says “Paid plans require a credit card to be on file.” The Free plan is $0/month and does not require a payment method.

### Safe to call from a public client?

Yes, with the right setup: the browser uses the public anon key, **RLS denies direct writes** to score tables, and an Edge Function (service role, not shipped to the client) applies the same plausibility / best-score / rate-limit rules as the Cloudflare Worker. Do not put the service-role key in the PWA.

### Privacy and data location

Optional nickname plus an anonymous or email-less identity is enough; skip Supabase Auth email unless we later want it. Pick a primary AWS region when the project is created (for example `us-east-1` or an EU region such as Frankfurt / Ireland / Paris). The primary database, Auth, and Storage stay in that region; logs, telemetry, and some sub-processors may leave it. A DPA is available if needed.

Sources: [GDPR and data residency](https://supabase.com/docs/guides/security/gdpr-compliance), [Regions](https://supabase.com/regions).

### Ease from vanilla JS

Very easy: `@supabase/supabase-js` or plain REST. Nice dashboard for browsing rows and editing RLS. Slightly more moving parts than a single Worker if we also deploy Edge Functions.

### Surprise-charge risk

**Low** if the organization stays on Free and no card is added. The operational risk is not a bill — it is **pausing**. A new or quiet game can go a week with too little traffic, the leaderboard goes down, and someone has to hit Resume in the dashboard. That is the main reason this is the runner-up, not the pick.

---

## 3. Firebase Spark (Cloud Firestore)

### Free limits

| Item | Spark / Firestore free quota |
|---|---|
| Payment method | **Not needed** |
| Stored data | 1 GiB (exactly one free database per project) |
| Document reads | 50,000 / day |
| Document writes | 20,000 / day |
| Document deletes | 20,000 / day |
| Network egress | 10 GiB / month |
| Auth (non-phone) | Included; 50k MAUs with Identity Platform |
| App Check | No-cost, subject to attestation-provider quotas |
| **Cloud Functions** | **Not available on Spark** |
| Over-quota behaviour | If a product exceeds its no-cost quota in a calendar month, **that product is shut off for the rest of the month**. Daily Firestore quotas reset around midnight Pacific time. |

Sources: [Firebase pricing](https://firebase.google.com/pricing), [Firebase pricing plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans), [Firestore quotas](https://firebase.google.com/docs/firestore/quotas), [Cloud Functions FAQ](https://firebase.google.com/docs/functions/faq-and-troubleshooting).

### Credit card

Not required for Spark. Official wording: “No payment method needed” and “You don't need to provide any payment information to get started.”

### Safe to call from a public client?

Only in a limited way. On Spark the client writes Firestore directly, gated by Security Rules and optional anonymous Auth + App Check. Rules can require “this is your document,” “score is an integer in range,” and “new score ≥ old score.” They cannot recompute a world total from pond results or apply richer anti-cheat, because **Cloud Functions require the Blaze plan and a billing account**. A determined player can still post the maximum rule-allowed score.

Rank via a `count()` of higher scores is affordable at hobby scale (aggregation reads are billed in batches), but a chatty client can still burn the 50k reads/day cap.

### Privacy and data location

Anonymous Auth + a nickname field fits the “no other personal data” rule. Firestore region is chosen when the database is created. Google will process some Firebase/Analytics data according to its own policies; keep Analytics off if we want a minimal footprint.

Source: [Firebase locations](https://firebase.google.com/docs/projects/locations).

### Ease from vanilla JS

The Firebase JS SDK is well documented and quick to wire. Security Rules are a separate skill. No server to deploy — which is also why validation is weak on Spark.

### Surprise-charge risk

**Low on Spark** (no card, no pay-as-you-go). Do **not** upgrade to Blaze just to get Functions: that puts a card on file and is how surprise Firebase bills happen. The failure mode on Spark is shutoff until the next cycle, not a charge.

---

## 4. Upstash Redis Free

### Free limits

| Item | Free |
|---|---|
| Price | $0 / month |
| Card | **Not required** |
| Data size | 250 MB |
| Commands | 500,000 / month (extra commands return an exception) |
| Bandwidth | 10 GB / month |
| Max commands / sec | 10,000 |
| Databases | 1 |
| Inactivity | **Archived after a minimum of 30 days of inactivity**, after warning emails. Data is backed up and can be restored into a new database. |

Sources: [Upstash Redis pricing](https://upstash.com/pricing/redis), [Pricing & billing](https://upstash.com/docs/redis/overall/billing), [Redis FAQ (inactivity)](https://upstash.com/docs/redis/help/faq).

### Credit card

Official billing docs: “Every account starts with a free database. No credit card required.”

**Important:** [Adding a payment method](https://upstash.com/docs/redis/howto/upgrade-database) moves **every** free resource on the account to paid plans. An account with a card cannot keep a free database.

### Safe to call from a public client?

**Not for writes.** Official REST docs: the Standard token “has full privilege over the database.” “Do not expose your Standard token publicly.” A Read Only token “makes sense … from web and mobile clients where the token is exposed to public,” but it cannot submit scores.

Source: [Upstash Redis REST API](https://upstash.com/docs/redis/features/restapi).

To accept scores safely we would still need a free server in front (a Cloudflare Worker, for example). Then we are paying the complexity of two vendors, and D1 already covers storage.

### Privacy and data location

Regions on AWS, GCP, or Fly.io (for example `us-east-1`, `eu-west-1`). Upstash states it is GDPR-compliant and does not share user data with third parties. Still only store a UUID, nickname, and scores.

### Ease from vanilla JS

The REST API is simple HTTP, but it is the wrong shape to expose from a PWA for writes.

### Surprise-charge risk

**Low** if no payment method is ever added (over-limit commands error out). **High** if a card is added later, because the account leaves the free tier. Inactivity archival is the other operational risk.

---

## 5. PocketBase (self-host) — does not meet the $0 rule

PocketBase is a single free, open-source binary with a REST API, SQLite, auth, and an admin UI. Official FAQ: **“Do you offer hosting? No. PocketBase is self-hosted only.”** They point at a Google Cloud free-tier micro VM, Oracle Always Free, or a conventional VPS such as a “cheap $4 Hetzner CAX11.”

Sources: [PocketBase FAQ](https://pocketbase.io/faq/), [Going to production](https://pocketbase.io/docs/going-to-production/).

Even a $4 VPS is a paid bill and usually needs a card. “Always free” cloud VMs are easy to outgrow, sometimes need a card, and (in Oracle’s case) have had reports of inactive accounts being removed. That is not a clean fit for “stay free, no card on file.”

If hosting were already paid for, PocketBase would be a reasonable small-game backend (custom hooks for score checks, JS SDK). Under this brief, it is out.

---

## 6. LootLocker Personal (dedicated game leaderboards)

### Free limits

[Official pricing](https://lootlocker.com/pricing) and [Fair Use Policy](https://lootlocker.com/fair-use/) (policy v2 effective 1 November 2026):

| Item | Personal |
|---|---|
| Price | Free |
| Eligibility | Organisation’s combined revenue and funding over the trailing 12 months is under USD 100,000 (self-certified). Monetising a game is allowed under that cap. |
| MAU | 10,000 monthly active users — described as a **hard limit** in the Fair Use table |
| Platforms | Non-console only, including White Label (web-usable). Guest login is documented for REST. |
| Storage | “There is no per-game storage quota.” |
| Rate limits | Applied, but **no single published figure**; current limits appear in the LootLocker console. |
| Leaderboards | Built-in (player or generic, metadata, optional scheduled resets). |

When the Personal MAU cap is hit, the Fair Use Policy says existing players keep playing and **new players cannot connect until the next calendar month**, with no charge and no data loss. The pricing-page FAQ currently says the game keeps working and new players can keep joining, and that LootLocker will reach out about Pro. Treat this as an inconsistency to re-check at signup. Either way, Personal is not supposed to auto-charge.

Pro is $500/month with a 30-day trial; **“A card is required at signup”** for that trial. Do not start a Pro trial.

Sources: [LootLocker pricing](https://lootlocker.com/pricing), [Fair Use](https://lootlocker.com/fair-use/), [Pricing announcement](https://lootlocker.com/blog/lootlocker-is-now-free-for-most-developers/), [Guest login](https://docs.lootlocker.com/players/authentication/how-to/guest-login/), [Leaderboards](https://docs.lootlocker.com/game-systems/leaderboards/overview/).

### Credit card

Official pages do not require a card for Personal. A card is required for the Pro trial. Stay on Personal only.

### Safe to call from a public client?

Guest login can use REST from a web game with a `game_key` and an optional stored `player_identifier` — no email required, which fits “optional nickname only.” Top 10 and rank are native leaderboard features, so there is little custom backend to write.

Anti-cheat is the weak point: the client submits the score. Without our own trusted server, LootLocker cannot know whether a world total is legal. The public `game_key` can also be abused (spam, nick vandalism) up to whatever unpublished rate limits apply.

### Privacy and data location

LootLocker AB (Sweden). Official security page (updated 10 September 2026): player and customer data is hosted in the EEA; primary infrastructure is Hetzner in Helsinki, Finland. Encrypted in transit and at rest. Some sub-processors are outside the EEA (CDN, monitoring, email). A DPA is offered. This is a fuller game-backend account platform than we need for a nickname and five numbers.

Source: [LootLocker security](https://lootlocker.com/security/).

### Ease from vanilla JS

REST is documented; first-party SDKs focus on Unity / Unreal / Godot, not a first-class JS SDK. Still less code than a custom API if we accepted client-trusted scores.

### Surprise-charge risk

**Low** if we never start the Pro trial and never add a card. Crossing $100k revenue/funding is not relevant for this hobby game. The 10k MAU cap is far above the expected scale, but eligibility is a policy (not a technical guarantee) and rate limits are not public.

Useful if we wanted the least custom code and could accept weaker score checks. Not the pick, because anti-cheat and a nickname-only data model are better under a small Worker we control.

---

## Why not the others, in one line

- **Firebase Spark** — no server-side validation without putting a card on file (Blaze).
- **Upstash** — cannot safely accept writes from the PWA without another free compute layer.
- **PocketBase** — hosting it costs money.
- **LootLocker** — purpose-built and free at this scale, but trusts client scores and is a heavier vendor than we need.

---

## Sign-up steps (later — only after Sebastián confirms)

Do **not** do these now. No account, no card, no paid add-on, no Pro trial.

1. Create a Cloudflare account at [https://dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) with an email and password. Verify the email. Do not add a payment method. Do not enable Workers Paid.
2. In the dashboard, open **Workers & Pages** and **D1**. Create one D1 database (name e.g. `capybara-calm-leaderboard`). Set a jurisdiction at creation (`us` or `eu`) so it cannot drift later.
3. On a laptop with Node.js, install Wrangler (`npm install -g wrangler`) and log in with `wrangler login`.
4. Create a Worker, bind the D1 database in `wrangler.toml`, apply the schema below, and deploy. Note the `*.workers.dev` URL (a custom domain is optional and not required).
5. In the game, set that URL as the leaderboard API origin. Ship a short privacy notice (optional nickname, no other personal data, scores uploaded only after opt-in, where the data is stored, how to opt out).
6. Confirm the account is still on **Workers Free** and that no billing profile / card exists.

If the runner-up is chosen instead: create a Supabase account, leave the org on the **Free** plan, add no card, create one project in the chosen region, enable RLS, deploy one Edge Function for score writes, and plan a manual “Resume project” check if a week goes by with almost no play.

---

## Minimal schema and endpoints

Designed so the same contract can be mocked locally now and pointed at Cloudflare later.

### Schema (D1 / SQLite; Postgres equivalent is straightforward)

```sql
CREATE TABLE players (
  id            TEXT PRIMARY KEY,          -- client-generated UUID, stored in localStorage
  nickname      TEXT,                      -- optional, 1–20 visible characters after sanitise
  created_at    INTEGER NOT NULL,          -- unix ms
  opted_in_at   INTEGER NOT NULL
);

CREATE TABLE world_scores (
  player_id     TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  world         INTEGER NOT NULL CHECK (world BETWEEN 1 AND 5),
  score         INTEGER NOT NULL CHECK (score >= 0),
  updated_at    INTEGER NOT NULL,
  PRIMARY KEY (player_id, world)
);

CREATE INDEX world_scores_rank
  ON world_scores (world, score DESC, updated_at ASC);
```

Optional later, not required for top 10 + rank: a `pond_scores` table for audit / tighter validation (world, pond, raw score, flags for show-me / second-chance / boss / crate).

Nickname policy: unique among opted-in players is nice-to-have, not required; reject empty, control characters, and overly long strings; allow reuse after opt-out.

### Endpoints

Base: `https://<worker>.workers.dev` (or a later custom host). All JSON, CORS locked to the game origin.

**`POST /v1/join`**

Opt in. Body: `{ "player_id"?: string, "nickname"?: string }`. If `player_id` is omitted, the server mints one. Returns `{ player_id, nickname, opted_in: true }`. Idempotent for the same id.

**`POST /v1/score`**

Body: `{ "player_id", "world": 1-5, "score": number, "ponds"?: [{ "id", "score", "showMe"?, "secondChance"? }] }`.

Server: authz by `player_id` existence; rate-limit; validate world and ceiling; if `score` is greater than the stored best, update; never lower. Returns `{ accepted, world, score, rank, top10 }`.

**`GET /v1/leaderboard?world=1&player_id=<id>`**

Public read. Returns:

```json
{
  "world": 1,
  "top10": [{ "rank": 1, "nickname": "Capy", "score": 42000 }],
  "me": { "rank": 27, "nickname": "Capy", "score": 18000 }
}
```

`me` is omitted or `{ "rank": null }` when the player has no opted-in score for that world. Rank is 1-based, ties broken by earliest `updated_at` (first to reach the score stays ahead).

**`POST /v1/opt-out`**

Body: `{ "player_id" }`. Deletes that player's rows. Local scores in the PWA are untouched.

Local scores remain the source of truth until join, and again if the network or the free-tier daily cap fails. The client should treat any 4xx/5xx as “could not update the shared board” and keep playing.

### Plausible-score ceiling (server)

Derive a hard per-world maximum from the published rules and reject anything above it:

`pond = 1000 + 200 × oranges_left + time_bonus` (time bonus is linear up to +500 under target, else 0, never negative). Show-me or Second chance halves that pond. Bosses and crate ponds ×1.5. World score = sum of best pond scores in that world (30 ponds).

The exact numeric ceiling can be computed from per-pond orange caps once v5.0 boards are frozen. Until then, use a conservative over-estimate and tighten later. This is a plausibility gate, not a proof of honest play.

---

## Sources (official pages checked this turn)

- Supabase: [pricing](https://supabase.com/pricing), [billing](https://supabase.com/docs/guides/platform/billing-on-supabase), [pausing](https://supabase.com/docs/guides/platform/free-project-pausing), [billing setup](https://supabase.com/docs/guides/platform/get-set-up-for-billing), [Edge Functions pricing](https://supabase.com/docs/guides/functions/pricing), [GDPR / residency](https://supabase.com/docs/guides/security/gdpr-compliance)
- Firebase: [pricing](https://firebase.google.com/pricing), [pricing plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans), [Firestore quotas](https://firebase.google.com/docs/firestore/quotas), [Functions FAQ](https://firebase.google.com/docs/functions/faq-and-troubleshooting), [locations](https://firebase.google.com/docs/projects/locations)
- Cloudflare: [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [developer platform pricing](https://www.cloudflare.com/plans/developer-platform-pricing/), [create account](https://developers.cloudflare.com/fundamentals/account/create-account/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), [KV pricing](https://developers.cloudflare.com/kv/platform/pricing/), [D1 data location](https://developers.cloudflare.com/d1/configuration/data-location/), [D1 data security](https://developers.cloudflare.com/d1/reference/data-security/)
- Upstash: [Redis pricing](https://upstash.com/pricing/redis), [billing](https://upstash.com/docs/redis/overall/billing), [FAQ](https://upstash.com/docs/redis/help/faq), [REST API / tokens](https://upstash.com/docs/redis/features/restapi), [upgrade / adding a payment method](https://upstash.com/docs/redis/howto/upgrade-database)
- PocketBase: [FAQ](https://pocketbase.io/faq/), [going to production](https://pocketbase.io/docs/going-to-production/)
- LootLocker: [pricing](https://lootlocker.com/pricing), [Fair Use](https://lootlocker.com/fair-use/), [free-for-most-developers post](https://lootlocker.com/blog/lootlocker-is-now-free-for-most-developers/), [guest login](https://docs.lootlocker.com/players/authentication/how-to/guest-login/), [leaderboards](https://docs.lootlocker.com/game-systems/leaderboards/overview/), [security / data location](https://lootlocker.com/security/)
