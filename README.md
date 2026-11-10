> **Current working folder: completed LOCAL v3.1 preview.** Nothing has been pushed or published. Shipped v3 remains frozen in `../app-v3-backup/` and `../capydoku-v3-runtime.tar.gz`. This batch retains the Peek/chooser fixes and restores v1-style launches, fits solved controls at both target sizes, adds single-switch A/B board sizing (constant-width B default) and adds licensed offline music. A v3.1 cache is prepared locally under the user's conditional permission; see `reports/cache-hold-v3.1.json`. Screenshot approval is still needed before any live update. Main report: `reports/ROUND-v3.1.md`; images: `reports/screenshots-v3.1/`; contact sheet: `reports/contact-sheet-v3.1.png`.

# Capydoku v3.1 — local playable PWA

No publication, repositories, accounts, payments, runtime dependencies or remote APIs. No live deployment was touched.

## Run on this box

```sh
cd /workspace/capydoku/app
python3 -m http.server 8765 --bind 127.0.0.1
# http://127.0.0.1:8765/
```

Serve over localhost (not file://) for service workers. Runtime requires only a static server. All art/fonts/modules are local; the PWA precaches every essential URL atomically, then works offline. Cache is content-addressed `capydoku-v3.1-…`; old Capydoku caches are deleted after successful install. Use a separate origin/profile if you want to keep playing the frozen v2 independently.

## Play

Pick Jun, Bloom or Remy. Tap = ×; double tap = capy; tap an existing mark/capy = clear. Exactly one capy per row, column and patterned zone. No touching, including diagonals. Rocks are blocked. Three oranges; a locally rule-breaking capy costs exactly one. Both offenders stay red until repaired. A locally legal but ultimately incorrect move is not penalized. Relax has no lives.

Drag from empty = paint new ×; from × = clear ×. Capys/rocks never change. One drag is one Undo. Board-only `touch-action:none`, pointer capture after **10 CSS px** movement, interpolated every ≤6px; page/map scrolling remains native outside the board. Singles are delayed **280ms**; a second tap within that window atomically places/clears a capy, without transient × flashes.

### Powers — once per level attempt

- **Jun / Peek:** choose one random unplaced solution cell; ghost/glow only. Never auto-places, never targets ×, rocks or fixed cells, never exposes the full solution. Allowed when only one eligible target remains; disabled with none. Marking/placing its target removes the ghost. It remains spent.
- **Bloom / Second chance:** available after a life-losing mistake, while lives <3. Erases the latest offender if it is still red, restores exactly one lost orange (max 3). If already manually repaired/undone, refund that orange without touching a later legal replacement. Can rescue the fatal third error from the game-over sheet. No mistake/full lives = disabled.
- **Remy / Nap:** activate three protected moves. Every actual new capy placement or new × consumes one charge, including safe/correct moves. Protected mistakes stay red but cost no orange. Clears, removing capys, rocks, skipped/unchanged cells and Undo consume no charges. A drag spends one charge for EACH newly painted × (not one per gesture). Protection persists across cosmetic switches and consumes remaining charges even if Relax is enabled.

Switch from the Home badge, your Hot Spring chip/figure, or the in-level avatar. Board, oranges, history, progress and streak stay intact. Unused power changes to the new starter's unused power; once activated it stays spent across switches, navigation, Undo and reload. Undo restores board state only, not lives/charges/power activation. Retry or **Replay** creates a genuinely fresh attempt. Daily streak is still credited at most once per calendar date.

In Relax, **every starter's unused power acts as Peek**. The one product switch is `GAME_CONFIG.relaxPowersAsPeek` in `config.js`; setting false instead disables defensive powers in Relax. Toggling modes never replenishes spent power.

Clear a boss (10/20/30) without activating any power in that attempt to earn its persistent **golden lily pad**. Ordinary mistakes, marks and Undo do not disqualify this. Powered clears still grow/decorate the spring; replay later without power to earn the lily. Old completions do not get unverifiable retroactive lilies.

### Haptics and install

Persisted Haptics toggle, default on. Legal placement **32ms**; rule break **[45,60,45]ms**; solve **[45,60,70,60,105]ms**; landing **18ms**. Drag mark/clear tick **12ms**, new changes only, throttled to ≥**70ms** between ticks. All feature-detected/caught: missing/throwing `navigator.vibrate` is silent, including iOS. Sound is optional locally synthesized WebAudio, default off.

iPhone/iPad install copy: **Share → Add to Home Screen** (no beforeinstallprompt dependency). Standalone detection uses Safari `navigator.standalone` OR `(display-mode: standalone)`. Safe areas use `viewport-fit=cover` and `env(safe-area-inset-*)`. Actual iPhone/S24 hardware has not been tested.

## Progress migration

- Current key: `capydoku.progress.v3`, schema 3; v1/v2 keys are left unchanged. New players see chooser (Bloom preview). Migrating players bypass it and can switch immediately.
- v2 → v3: same board data/signatures, all compatible partial boards/oranges, cleared levels, streak, Relax/haptic/audio and rock-intro state retained. Classic→Jun, Beanie→Remy, Orange→Bloom, Duck→Jun; original ID retained in `legacySelected`. Earned boss milestones still decorate the spring. Existing attempts begin with unused new powers, then persist normally. No retroactive lilies.
- v1 → v3: keep earned progress/streak/settings, preserve unchanged signed 21–30 boards; discard retuned 1–20 and old daily partial boards as v2 did. Completed IDs are never revoked. Rock intro runs on first actual rock board if not seen.
- Future schema is read-only, malformed/quota-blocked storage is caught with a visible warning. At most 40 partial sessions retained. Browser clearing/site-data eviction can still erase local-only progress.

Daily = local calendar date + eligibility state. No rocks until campaign 21 is unlocked/reached or a rock-era pond cleared. Both banks are deterministic; changing eligibility changes session identity, not same-date streak credit. 365 boards/state plus eight dihedral transforms is finite, not an infinite novelty claim.

## Reproduce verification/tests

```sh
python3 scripts/verify-v3.py
TZ=America/New_York node scripts/verify-daily-v3.mjs
# Cache already prepared; accidental rebuilds are guarded.
npm run test:unit
CAPYDOKU_REPORT_VERSION=v3.1 CAPYDOKU_SCREENSHOT_DIR=reports/screenshots-v3.1/regression npm run test:e2e
python3 scripts/contact-sheet-v3.1.py
## Optional later local packaging only (never replaces the shipped v3 tar):
# python3 scripts/package-runtime.py --verify
```

Playwright is a local dev dependency; runtime needs no Node packages. Current results: **66 unit + 69 e2e pass**, Chromium mobile/touch at 412×915, plus 360×780 sizing/end-screen cases, scale 1, America/New_York. Current reports: `reports/verification-v3.1.json/.md`, `reports/ROUND-v3.1.md`, `reports/TEST-SUMMARY-v3.1.json`, `reports/unit-v3.1.log`, `reports/e2e-v3.1.log`, `reports/playwright-v3.1.json`, `reports/playwright-html-v3.1/`. Native captures: `reports/screenshots-v3.1/`, smaller-size additions in its `360x780/` subfolder; main contact sheet `reports/contact-sheet-v3.1.png`. The existing `/workspace/capydoku/capydoku-v3-runtime.tar.gz` is the **frozen old release**, not this round. No new archive was generated. Legacy v3 reports remain historical.

The campaign and both daily banks are unchanged from v2: **760 unique, pure-logic-solvable, connected-region boards**. Independent Python full-permutation oracle + JS row DFS; every logic step cross-checked. First five levels have singleton starts, no preliminary deductions. Generator remains deterministic `scripts/retune-v2.py`; `verify-v3.py` is read-only and never rewrites content.

## Visual source and deliberate conflicts

v5-starters final supplied alpha cutouts and palette; mandatory dark outlines unchanged. All character paths in `characters.js`. Approved v3 chrome, rules sheet, rock art/intro, counters/Relax, celebration and boss-growing Hot Spring retained. Trail is computed through actual centers of all 30 nodes (Catmull–Rom), not guessed coordinates. Friends soak together in supplied scene, not a card grid.

The brief overrides notes: **Hint removed** (notes recommend keeping it); powers reset per **attempt** (not once forever per puzzle); all Relax powers default to **Peek** (notes disable defensive powers). Switching is cosmetic for board/progression, but intentionally changes an unused power as explicitly required. Full-screen mobile selector is used for switching. Jun/Remy previews use their unchanged cutouts over a CSS pond; Bloom uses supplied composed stage. The source's fixed-Doze / wearable-accessory demonstration is not added as a new campaign mechanic; no generated levels changed. Legacy earnings remain as boss decoration progress/metadata, not wearable asset compositing. All three starters are available immediately.

Backups: `/workspace/capydoku/app-v1-backup/` and `/workspace/capydoku/app-v2-backup/` remain intact; v3 and pre-extension v3.1 snapshots also remain intact; all original non-node_modules hashes are audited in `reports/backup-integrity-v3.1.json`.

## v3.1 controls, sizing, music and local cache

- **One sizing switch:** `GAME_CONFIG.boardSizingMode` in `config.js`. Default **B** keeps every board at **35/36 (97.2222%)** of app width, matching the supplied reference frame ratio: board **400.55px at 412** / **350px at 360**, for all grid sizes. Minimum 5/6/7 cell widths: **73.30 / 60.58 / 51.50px** at 412; **63.19 / 52.16 / 44.28px** at 360. Mode **A** retains the earlier target 52px cells / growing 294–404px board. B deliberately restores larger 5×5 cells per the latest direction. No query/storage override. Comparison: `reports/sizing-A-vs-B.png`; exact captures in `reports/screenshots-v3.1/sizing/`; table and measurement method in `reports/ROUND-v3.1.md`. Existing 10px drag threshold, delayed 280ms tap and 70ms drag-tick throttle stay unchanged.
- Haptics (ms): tick 12; legal 32; illegal `[45,60,45]`; solve `[45,60,70,60,105]`; each landing 18. One existing Haptics toggle controls everything. Missing/blocked APIs remain silent.
- Restored direct upward 1.5s launches, stagger 100ms. All three supplied starter cutouts remain untouched; a CSS water-edge mask softens their lower edge on arrival. Timed rings, steam, reaction, saved oranges and pure-boss golden lily remain. Reduced motion goes straight to soaking.
- Replay / Next pond / Hot Spring all fit without scrolling after normal, boss (including 30) and daily solves at 412×915 and 360×780. Daily's Next pond opens the next uncleared campaign pond; after campaign 30 it returns to Pond Path.
- Music is separate from Sound effects, default on but **silent until a genuine first tap/key** on each page load. Stored `music:false` stays off, including reload. Existing v3/v2/v1 progress gets the safe new-field default without changing schema, progress, powers or streak. Sound effects off is not a master music mute: use the explicit Music toggle.
- Three original CC0 recordings rotate locally: Alex McCulloch's *Flute and Guitar*, Spring Spring's *Minimalistic Flute & Strings Tune*, Indieteur's *Revelation*. Source/license evidence and sizes: `assets/music/LICENSES.md`, `reports/music-v3.1.json`. All credits are also in Settings → Music credits.
- Low Web Audio gain 0.14, Relax 0.085; 800ms fade-in, 240ms toggle fade-out. Hidden tabs pause immediately (no delayed background sound). Rotation wraps to the first track. No external media requests, accounts, fees or runtime APIs. HTML media respects its muted flag; controller also supports explicit mute. Platform audio interruptions remain subject to browser/OS policy.
- Opus 40kbps plus MP3 64kbps fallback; 4,987,618 combined audio bytes. Older Safari selects MP3; decode failure tries MP3 once. All six files are precached. The service worker supports single-byte-range audio responses offline for iPhone seeking.
- `python3 scripts/build-sw.py` is guarded against accidental further cache rebuilds. A deliberate new runtime change needs `--bump-cache`, updated audit hashes and the full tests again. No deployment is authorized by this local preparation.
- Full commands/results: `reports/ROUND-v3.1.md`, `reports/unit-v3.1.log`, `reports/e2e-v3.1.log`, `reports/TEST-SUMMARY-v3.1.json`. Independent verification is unchanged-content `reports/verification-v3.1.json/.md`.

Real iPhone/S24, physical vibration/audio quality and subjective Timberborn-like mood remain human/device checks. v6 exists but was not marked approved, so it was not integrated. No v3.1 archive is requested or generated in this round; the packaging helper now targets a separate v3.1 filename if used later.
