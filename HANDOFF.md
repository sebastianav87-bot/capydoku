> Latest WIP: automatic leaderboard enrollment from the game nickname, with no Join or Leave controls, per the updated user instruction. See `wip/app/reports/auto-leaderboard/README.md`. Published with explicit user approval; see the release report.

> Current update: shared leaderboard implemented and public service activated with explicit user approval.
> See `wip/app/reports/shared-leaderboard/README.md` for current publication and verification details.
> The original snapshot below is historical; subsequent user instructions authorized publication.

# Capydoku / Capybara Calm — handoff

Snapshot of in-progress **v5.0** work, taken **2026-11-16 19:01 America/New_York (EST, UTC-5)**, so another AI can continue without the Engineer box. Approved by Sebastián Alarcón the same day: write this document and back up the work on a **separate** GitHub branch. **Do not touch `main`, `gh-pages`, or the published site.**

- Repo: https://github.com/sebastianav87-bot/capydoku
- Live site (GitHub Pages from **`main` only**): https://sebastianav87-bot.github.io/capydoku/
- Live version: **v4.3.1**, commit `bd571030a5950d13a24f14ff9fbcd712bc5f5248`, cache `capydoku-v4.3.1-6bc138e4dee2`
- This branch: `handoff-v5-wip`, created from that same `main` tip. Published files at the branch root are an unmodified copy of v4.3.1. All WIP lives under `wip/`.

## What's in this branch

| Path | What it is |
|---|---|
| `HANDOFF.md` | This document |
| `/` (everything except `HANDOFF.md` and `wip/`) | Published v4.3.1 site, unchanged from `main` |
| `wip/app/` | The Engineer's working copy that v5.0 is being built in. Run and test from here. |
| `wip/app/reports/` | Round reports (markdown + small JSON/logs). **Read first:** `ROUND-v4.3.1.md`, `v5.0/PLAN.md`, `v5.0/PROGRESS.md`, `v5.0/LEADERBOARD-OPTIONS.md`, and `wip/app/KNOWN-ISSUES.md`. |
| `wip/worker/` | Cloudflare Workers + D1 leaderboard (local only, **not deployed**; `wrangler.toml` has placeholders only). |
| `wip/tools/crate-verify/` | Python `solver.py`, `analyze.py`, `search.py`, `traps.py` used to verify crate levels. Copied from the Designer's tool folder on the Engineer box. |

**Left on the Engineer box only** (not in this branch): `node_modules/`, Playwright `test-results*/` and `reports/playwright-html*`, traces/zips, contact-sheet and historical screenshot dumps (including `reports/v4.3.1/screens/`), files over ~1 MB except runtime assets, earlier app backups (`app-v4.3.1-backup/` etc.), runtime tarballs, and the full `mockup/` design tree (`/workspace/capydoku/mockup/`, ~557 MB). No `.env`, tokens, or secrets were copied.

Runtime music files `wip/app/assets/music/northumberland.{mp3,ogg}` are included (they are the shipped CC0 track, over 1 MB).

At snapshot time The Engineer still had crate-generation jobs running (`scripts/gen-crates-v50.mjs` seeds 802/902 and five `analyze.py` processes). `wip/app/reports/v5.0/crates/` is mid-run, not final.

## What the game is

An offline-first PWA: a capybara-themed **Star Battle** puzzle (one capy per row, column and zone; capys may not touch, including diagonally). Plain JavaScript modules, no bundler, no CDN, no framework. A content-hashed service worker precaches the runtime so it works offline. UI language is **English**. Illustrated art is labeled “AI illustration” in the UI.

Today the public name is still **Capydoku**. v5.0, once finished and approved, renames the **in-game / PWA** title to **Capybara Calm** and reserves **Capybara Calm: Pond Puzzle** for store listings. The repo name, GitHub Pages URL path, and `localStorage` keys stay `capydoku…` so existing saves keep working.

## File map / architecture

Work in `wip/app/`. The published copies of the same filenames at the repo root are **v4.3.1** and should be left alone.

| File | Role |
|---|---|
| `index.html` | Shell: CSS links + `<main id="app">` + `app.js` module |
| `app.js` | Screens, input, tutorial, settings, celebration, v5 chrome, scoring/leaderboard UI |
| `core.js` | Rules, no-guess `logic()` / `enumerate()`, `move()`, locks, save/load, migrations |
| `config.js` | `GAME_CONFIG` (incl. empty `leaderboardApi`) and `HAPTIC_CONFIG` |
| `roles.js` | Pond roles for **150** ponds (crate / gate / world gate / boss / breather) |
| `score.js` | Pure pond/world score helpers (unit-tested) |
| `leaderboard.js` | Opt-in client: `http` / `mock` / `none` adapters |
| `explain.js` | Why a rejected capy is wrong (visible rule vs off-solution) |
| `fit.js` | Shrinks chrome/board on short screens (iPhone fit, v4.3.1) |
| `crates.js`, `crate-levels.json`, `bonus-ui.js` | Mandatory crate ponds |
| `levels.json` | Campaign + daily pools. **WIP still has contentVersion `4.3` and 30 logic ponds** |
| `difficulty.js` | `scoreBoard()` metrics used to ramp v5 worlds |
| `sw.js`, `build-info.js`, `scripts/build-sw.py` | Content-hashed cache; bump with `python3 scripts/build-sw.py --bump-cache` |
| `characters.js`, `powers.js`, `rewards.js`, `profile.js` | Cast, companion powers, lilies, nickname |
| `music.js`, `audio.js`, `platform.js`, `layout.js`, `theme.js`, `tutorial.js`, `updates.js`, `visuals-v4.js` | Music, platform, layout, tutorial, SW update, world names/tints |
| CSS | `style.css`, `theme-v3.css`, `starters-v3.css`, `visuals-v4.css`, `power-identity-v4.css`, `rewards-v4.css`, `home-v41.css`, `bonus-v42.css`, `crates-v43.css`, **`v50.css`** (v5 chrome, explain, leaderboard) |
| `assets/` | Art, vendored Nunito, CC0 music. Provenance: `ASSET-NOTES.md`, `assets/music/LICENSES.md` |
| `tests/` | Node unit tests + Playwright E2E (Chromium 360/412 + WebKit iPhone) |
| `scripts/` | Level/crate generators, packaging, iPhone fit harness, contact sheets |

Progress keys (keep these names):

- `capydoku.progress.v3` (current; also migrates `…v2` / `…v1`)
- `capydoku.hub`, `capydoku.last-running-build`
- `capydoku.leaderboard`, `capydoku.leaderboard.mockdb`, `capydoku.leaderboard.adapter`

World names in `visuals-v4.js`: Reedwater Spring, Bamboo Summer, Maple Autumn, Snowcap Winter, Cloudwater Twilight.

### Run locally

```sh
cd wip/app
python3 -m http.server 8765 --bind 127.0.0.1
# http://127.0.0.1:8765/   (use localhost, not file://)
```

`npm install` is only needed for Playwright. The game itself is static files.

### Tests

```sh
cd wip/app
npm install          # Playwright devDependency
npm run test:unit    # existing suite in package.json — does NOT yet include tests/v50*.js
node --test tests/v50.test.js tests/v50-score.test.js tests/v50-leaderboard.test.js
npm run test:e2e     # Playwright; webServer starts :8765
# WebKit iPhone suite only:
npx playwright test tests/v431-iphone-fit.spec.js --project=webkit-iphone
```

`tests/v50.test.js` expects `levels.json` contentVersion 5.0 with 150 unique no-guess ponds and 30 crate levels. **That will fail today** because `levels.json` / `crate-levels.json` are still the v4.3.1 sets (30 logic + 6 crates). Score and leaderboard unit tests can be run on their own. After adding v50 files to `package.json` `test:unit`, re-run the full unit suite.

Worker tests (no Cloudflare account):

```sh
cd wip/worker
npm install
npm test             # node:sqlite shim + Miniflare/workerd local D1
```

## Game rules and Sebastián's decisions

- A correct capy **locks**. Tapping it is a light bump, no penalty.
- Any capy not in the unique solution is an **immediate mistake**: costs an orange (spare first), rejected with a red shake, does not stay on the board.
- **Nap:** a mistake does not cost an orange (charges are spent; the mistake still counts for lilies).
- **Second chance** restores one orange but the mistake still counts; the wrong cell stays empty.
- **Undo** only steps back × marks, never capys. Drag paints × only. Default: tap = ×, double-tap = capy.
- Campaign starts at **7×7**, cap **10×10**. Boss 29 (and later bosses) may be 10×10.
- **Crate ponds are mandatory** every 5th pond. They look like wooden × boxes; targets are large fruits (watermelon / banana / pear, never orange); the pusher is the player's capy. Reward: +1 spare orange on the next pond (not the finale). "Show me" appears after 3 restarts and awards only the Packed lily (no Clean, no Par, no orange). Never call this **Boxworld** or **Sokoban** in the product, UI, or store listing.
- Bosses are ponds ending in **9**. Golden lily for a pure boss clear (no power).
- **No level-list screen.** Replay is Settings › Progress only. The hub is the current pond's transition (or, in v5, a direct start when no transition is needed).
- **Fresh Leaf** greens: button `#3B7E3D`, header `#314E2F`. Colour-blind zone fixes for zones 8–10 (see `KNOWN-ISSUES.md`). Some inline JS greens were not fully remapped.
- Stronger, distinct haptics in `HAPTIC_CONFIG`. **iOS has no Vibration API**; visuals must carry the meaning. Real-phone haptics are still unverified.
- Rocks stay. Water-lily awards stay (3 per pond, goldens on pure bosses). New v5 **point** scores are separate (see below).
- Music must be **original or CC0, $0**, with a calm → playful → calm shape in the spirit of "Concerning Hobbits", **without** that film melody. Current track: *Northumberland* (Spring Spring / Spring Enterprises, CC0). See `assets/music/LICENSES.md`.
- Mark AI illustrations as AI. Game UI in English.

## In-progress v5.0 (approved, local only, **not published**)

Approved scope (Sebastián, 2026-11-16):

1. **150 ponds** in 5 worlds of 30. Difficulty ramps by more than size (technique score, rocks, zone twist, fewer forced singles). Every logic pond unique + no-guess. World 1 (ponds 1–30) must stay byte-identical to v4.3.1 so current saves keep every lily and half-played board.
2. Rename: **Capybara Calm** in-game; **Capybara Calm: Pond Puzzle** for a future store listing only. Keep repo, URL, and save keys.
3. **Score** = `(1000 + 200 × oranges left + time bonus) × help × role`, rounded. Time bonus = `round(500 × (target − t) / target)` if under the target, else 0, **never negative**. Logic targets: 7×7 180 s, 8×8 240 s, 9×9 330 s, 10×10 420 s. Show-me / Second chance halves (`help = 0.5`). Bosses and crates ×1.5. Crate "oranges" come from moves vs par; crate target time is `max(60, 1.5 s × par)`. Daily Pond is not scored. World score = sum of **best** per pond in that world; a replay can only raise a mark. Migrated ponds start unscored ("—" until replayed).
4. **Opt-in shared leaderboard**, optional nickname (default "Anonymous capy"), shown on world change (after world gates 30/60/90/120/150). Backend chosen: **Cloudflare Workers Free + D1**, no credit card. Sebastián has **not** created the account yet; `GAME_CONFIG.leaderboardApi` is `''` (off). Until then, local-only top 10 (or `?lb=mock` / the test hook). No other personal data.
5. Explanatory errors: highlight the broken row / column / zone / touching capy; distinct dashed amber + `offSolution` haptic + "Doesn't fit the solution" when the capy breaks no visible rule. Both cases remain mistakes (orange, rejection).
6. Success: ripple through 8 neighbours (≤450 ms; none if reduced motion); subtle solved-zone mark. Never auto-place ×.
7. Bigger board after pond 1: one-line header, bottom bar **× · Capy · Undo · Jun**, rules behind **?**. Explicit tool mode: with × or Capy selected, one tap acts; with no tool, classic tap/double-tap remains. Pond 1 keeps the full header and tutorial (which should teach the bar).
8. Transition screen **only** at world change (31/61/91/121) and before bosses (…9), plus app launch / hub. "Next pond" between normal ponds goes straight to the board. Crate ponds stay mandatory and open their own intro / board. World-complete top 10 still shows after each world gate.

Authoritative plan: `wip/app/reports/v5.0/PLAN.md`. `PROGRESS.md` was last written 18:53 ET and is already a bit behind the code.

### Honest status of this snapshot

This is **not** a finished or shippable v5.0. The live cache is still `capydoku-v4.3.1-6bc138e4dee2`. `package.json` still says 4.3.0.

**In the code already (needs review, screenshots, and E2E):** the in-game rename in `index.html`, the manifest, and the hub wordmark; `roles.js` for 150 ponds; `score.js` + Settings › Progress world scores + solved-summary hook; `leaderboard.js` and a world-complete top-10 screen (local / mock); Worker source and tests; `explain.js` plus wiring in `play()` / `rejectCapy()` / `rippleFrom()` / solved-zone marks in `boardHTML()`; compact header, thumb bar, `?` rules, and tool mode (`v5Chrome()`, `v50.css`); `needsTransition()` / `proceed()` so most "Next pond" skips the interstitial; world tints and replay grouped by world. Unit files `tests/v50-score.test.js` and `tests/v50-leaderboard.test.js` exist. A distinct `offSolution` haptic is in `config.js`.

**Not done:** `levels.json` is still 30 ponds at contentVersion 4.3 (a dry pick of 150 lives only in `reports/v5.0/levels-dry.json` / `levels-pick.json` — not installed). `crate-levels.json` still has the six Designer levels; new crates 35–150 are mid-generation. Migration tests in `tests/v50.test.js` are written but will fail until the new content is in. `package.json` `test:unit` does not include the v50 tests. Cache has not been bumped to v5.0. README and some older strings still say Capydoku / v4.2. No v5 E2E, no contact sheet, no `ROUND-v5.0.md`, no runtime tarball. Cloudflare account / deploy has not happened. Before/after screenshots for the new UX are not done (only v4.3.1-style **fit before** captures under `reports/v5.0/fit/before/`).

Fit.js has not been fully recomputed for the new chrome. Cell-size before logs started (`reports/v5.0/fit-before.log`, `scripts/cell-sizes-v50.mjs`).

## Publishing (GitHub Pages) — only with Sebastián's explicit OK

Pages is served from **`main`**. Never force-push. Never commit WIP onto `main` until he says to publish.

The last published runtime is `/workspace/capydoku/capydoku-v4.3.1-runtime.tar.gz` (109 files, 12,195,805 bytes), sha256 `a85567b4daef4828e83a268d6c897f82f46ee21849bf1cd56b82235aafe0c224`. Commit as `sebastianav87-bot <sebastianav87-bot@users.noreply.github.com>`.

Procedure used for v4.3.1 (repeat this, do not improvise):

1. Verify the runtime tarball sha256 matches the round report.
2. Extract, **strip the top folder**, and copy over a clean clone of `main`.
3. **Keep** the clone's `.git` and the `.nojekyll` file.
4. Commit, **push with no `--force`**.
5. Poll the GitHub Pages build until it finishes.
6. `curl` **every** precached file with a cache-bust query (`?cb=…`) and confirm HTTP 200.
7. Confirm the live `sw.js` cache name is the new `capydoku-vX.Y.Z-<hash>`.

Do not publish this WIP branch.

## Play Store / App Store (not started)

- Android: TWA via PWABuilder / Bubblewrap; Play Console **$25 one-time**. A **personal** developer account must run a closed test with **12+ testers for 14 days**. Needs `assetlinks.json`, store listing, and a privacy policy.
- iOS App Store is separate (**$99/year**).
- Spend nothing, create no paid account, and submit nothing unless Sebastián explicitly approves the fee and the upload.

## Open notes

- Second chance's tagline still says **“Undo mistake”** (approved v6.1 asset); the first-use card already explains it only restores the orange.
- The Settings icon (`NAV_ICONS.settings` in `visuals-v4.js`) looks like a **crosshair** (circle + axis ticks), not a gear.
- Secondary greens: some CSS / inline JS greens were not fully moved onto Fresh Leaf (`#3B7E3D` / `#314E2F`).
- Real-phone haptics and iPhone Safari chrome (including iOS 26's floating toolbar) are still unverified; fit was emulated in Playwright WebKit.
- The v4.3 “wrong capy = mistake” rule is stricter; watch difficulty, especially on 9×9 / 10×10, once 150 ponds are installed.
- `KNOWN-ISSUES.md` is the running honest-limits list (still titled v4.3.1).

## Hard constraints

- **No spending.** No paid services, no credit card on Cloudflare, no Play / App Store fees unless he approves that exact spend.
- **No publishing** and no push to `main` without his explicit OK.
- **No collecting personal data** beyond the approved opt-in nickname + random player id, and not even that on a live backend until he creates the Cloudflare account and says to deploy.
- Never use the names **Boxworld** or **Sokoban** in the product.
- Do not invent a “Grok Bot games gallery” or claim work done for other people.

If credits run out mid-work: push further WIP to this same branch (`handoff-v5-wip`) or a new clearly named WIP branch. Never onto `main`.
