# Capydoku v3 — local playable PWA

No publication, repositories, accounts, payments, runtime dependencies or remote APIs. Production/live v1 was not touched.

## Run on this box

```sh
cd /workspace/capydoku/app
python3 -m http.server 8765 --bind 127.0.0.1
# http://127.0.0.1:8765/
```

Serve over localhost (not file://) for service workers. Runtime requires only a static server. All art/fonts/modules are local; the PWA precaches every essential URL atomically, then works offline. Cache is content-addressed `capydoku-v3-…`; old Capydoku caches are deleted after successful install. Use a separate origin/profile if you want to keep playing the frozen v2 independently.

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

Persisted Haptics toggle, default on. Legal placement **24ms**; rule break **[35,55,35]ms**; solve **[35,55,55,55,85]ms**; landing **12ms**. Drag mark/clear tick **8ms**, new changes only, throttled to ≥**70ms** between ticks. All feature-detected/caught: missing/throwing `navigator.vibrate` is silent, including iOS. Sound is optional locally synthesized WebAudio, default off.

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
python3 scripts/build-sw.py
npm run test:unit
npm run test:e2e
python3 scripts/contact-sheet-v3.py
python3 scripts/package-runtime.py --verify
```

Playwright is a local dev dependency; runtime needs no Node packages. Tests use Chromium, touch/mobile 412×915, scale 1, America/New_York. Reports: `reports/verification.json/.md`, `proof-effort-v1-v2-v3.json/.md`, `daily-dihedral-v3.json`, `unit-v3.log`, `e2e-v3.log`, `playwright.json`, `playwright-html/`, `TEST-SUMMARY-v3.md`. Native PNGs: `reports/screenshots-v3/`, contact sheet `reports/contact-sheet-v3.png`. Runtime archive: `/workspace/capydoku/capydoku-v3-runtime.tar.gz` (runtime + docs only; development scripts/tests/reports stay in the full app folder).

The campaign and both daily banks are unchanged from v2: **760 unique, pure-logic-solvable, connected-region boards**. Independent Python full-permutation oracle + JS row DFS; every logic step cross-checked. First five levels have singleton starts, no preliminary deductions. Generator remains deterministic `scripts/retune-v2.py`; `verify-v3.py` is read-only and never rewrites content.

## Visual source and deliberate conflicts

v5-starters final supplied alpha cutouts and palette; mandatory dark outlines unchanged. All character paths in `characters.js`. Approved v3 chrome, rules sheet, rock art/intro, counters/Relax, celebration and boss-growing Hot Spring retained. Trail is computed through actual centers of all 30 nodes (Catmull–Rom), not guessed coordinates. Friends soak together in supplied scene, not a card grid.

The brief overrides notes: **Hint removed** (notes recommend keeping it); powers reset per **attempt** (not once forever per puzzle); all Relax powers default to **Peek** (notes disable defensive powers). Switching is cosmetic for board/progression, but intentionally changes an unused power as explicitly required. Full-screen mobile selector is used for switching. Jun/Remy previews use their unchanged cutouts over a CSS pond; Bloom uses supplied composed stage. The source's fixed-Doze / wearable-accessory demonstration is not added as a new campaign mechanic; no generated levels changed. Legacy earnings remain as boss decoration progress/metadata, not wearable asset compositing. All three starters are available immediately.

Backups: `/workspace/capydoku/app-v1-backup/` and `/workspace/capydoku/app-v2-backup/` remain intact; non-node_modules hashes are audited in `reports/backup-integrity-v3.json`.
