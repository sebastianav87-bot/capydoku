# Capydoku v4 — local-only playable PWA

Approved v6 + v6.1 + v6.2 + v6.3 + v6.4 + v6.5 illustrated world map, illustrated generic board pieces, pictogram rules, companion powers, a growing Hot Spring and a replayable touch tutorial. No publication, repository creation, accounts, fees, remote APIs or runtime CDN. The Producer owns any later deployment; screenshot review comes first.

## Run on this box

```sh
cd /workspace/capydoku/app
python3 -m http.server 8765 --bind 127.0.0.1
# http://127.0.0.1:8765/
```

Use localhost, not `file://`, for the installable/offline PWA. The runtime needs only a static server, no Node dependencies. All modules, art, Nunito font and music are local. The content-addressed `capydoku-v4-…` service worker atomically precaches local runtime files, supports offline navigation/query URLs and audio byte ranges. Settings labels the code actually running using generated `build-info.js`, from the same digest/version as `sw.js`.

**Automatic updates:** launch, focus and becoming visible check registration.update(), shared throttle ≥60 seconds. A fully installed new worker calls skipWaiting()/clients.claim(). The page saves immediately on controllerchange and reloads exactly once on Map or results; while playing, in a tutorial or a modal, it defers until finish/return to Map. The old client remains pinned to its previous cache, including across SW restarts/offline, so it cannot mix new assets into an old pond. Previous caches are deleted only once no live client needs them. After safe reload, “Updated to v4.0” appears once per changed build. Initial activation, unchanged/offline/failed checks never cause loops; a failed state save blocks reload.

**One-time v3.1.3 exception:** its already-running page has only a passive “Reload when you like” controllerchange handler; v4 cannot retroactively replace that JavaScript without forcing a possibly active pond. The actual read-only-source test confirms no forced reload/data loss and old-asset affinity offline. Finish/leave the pond and reload once or close/relaunch to enter v4. From then onward updates are automatic. This first legacy handoff is not falsely presented as an automatic map reload.

## Play

One capy per row, column and patterned zone; no touching, diagonals included. Rocks block cells. Tap = ×; double tap = capy; tap an existing mark/capy = clear. Singles wait **280ms**; the second tap atomically places/clears without a transient × flash.

Drag from empty paints ×; drag from × clears ×. Capys and rocks never change. One drag = one Undo. Board-only `touch-action:none`, pointer capture after **10 CSS px** movement, path interpolation ≤6px; map scrolling remains native. A handled control's delayed native click is consumed before it can touch newly opened board DOM.

Three oranges always apply: each locally conflicting placement costs one, except Remy's protected moves. There is **no Relax/Chill mode**. Conflicting cells have red outlines/`!`; generic capys retain natural colors. The counter reports the actual total. **Clear conflicts** removes every currently conflicting capy using local rules only, preserves other pieces/marks and is one Undo step; it never refunds resources. Game over has only Try again / Pond Path.

### Powers — once per attempt

- **Jun / Peek:** one eligible solution cell glows with a generic ghost. It never places a capy; the player does. No ×, rock, fixed or currently conflicting target; candidates must agree across all enumerated solutions. Allowed for the final missing capy. A stale ghost hides while another placement obstructs it and returns when repaired. No eligible target = disabled, not spent.
- **Bloom / Second chance:** after a life-losing mistake, erases the latest offender if still conflicting and restores exactly one orange, max 3. If manually repaired/undone, refunds that orange without erasing a later legal replacement. Use before the last orange is lost. No mistake/full lives/game over = disabled (latest retry/map-only instruction supersedes the previous fatal-rescue UI).
- **Remy / Nap:** protects **three actual new capy placements or newly painted × cells**, including safe moves. Protected conflicts remain visible but cost no orange. Clearing, rocks, unchanged cells and Undo do not spend charges. A drag spends one charge per new ×, not per gesture.

Cosmetic switching from Home, Hot Spring or the in-level avatar preserves progress/streak/board. An unused power changes to the new companion's power; a spent one stays spent, including remaining Nap charges. Undo restores the board, not life/power resources. Retry/Replay creates a fresh attempt.

**First-use cards:** an eligible unused power first opens its canonical explanation with Use X / Not now. Cancel spends nothing. Confirm activates normally and persists its explanation flag. Flags are once per native power. Switching or Undo never restores a spent budget. Active feedback is inline only, never duplicated in a toast.

The v6.3 map uses50px normal nodes and120px dark/next/golden boss bodies, with29 curves through all30node centers. Bosses 10/20/30 grow the Hot Spring with lanterns, bamboo and a mountain pool. Clear a boss without activating power to earn its persistent golden lily pad. Old clears are not awarded unverifiable retroactive lilies. All three starters are friends from the start, not unlockable board pieces. The next-tier silhouette names the real upgrade (Lanterns / Bamboo nook / Mountain pool) and boss10/20/30, disappearing at max tier. Subtitle: “Beat a boss to grow your spring”.

### First visit / tutorial

First launch (including existing players once) asks a local-only nickname:2–16 Unicode graphemes, emoji allowed, trim+NFC, controls/bidi overrides rejected. No email, account, network validation or consent/analytics UI. Editable in Settings. New players then choose a capy; existing chosen capys stay chosen. First entry to Pond 1 teaches tap, double-tap and drag with a ghost hand. Skip is always available; skip/completion persists `tutorialSeen`. Actual player marks remain, ghost effects never write moves, and guidance costs no lives/power. `? → Replay tutorial` uses a disposable sandbox and restores the existing board, history, charges and streak. The guide uses the unchanged verified **5×5** Pond 1 rather than the source's static 4×4 example; see the deviation rationale in `reports/ROUND-v4.md`.

## Water lilies — optional, never a gate

Each campaign pond has three independently earned, permanent OR-flags: cleared /zero mistakes /strictly under its target. Targets in config.js version1:5×5=120000ms,6×6=180000ms,7×7=270000ms. No visible countdown. Lowest active time and mistakes are retained across attempts. Replay never removes lilies; powers are allowed for normal lilies. Boss no-power golden lilies remain separate (max3). Daily awards are date-keyed separately and do not change the90-lily campaign total or double-credit streaks.

Active time begins at the first genuine board gesture and ends at the final placement. It excludes tutorial, rules/sheets, Map, hidden app and closed/reloading time; it persists when resuming, resets on Replay. A mistake is each actual new conflicting capy placement; Nap protection and Bloom's orange refund do not erase it, nor does Undo. X/clear, unchanged moves, and inaccessible rocks are not mistakes. Disabled rocks reject input before a capy is attempted. Existing clears migrate to the cleared lily only; old partial normal attempts retain their board but unknown pre-update timing/error history cannot earn perfect/timed lilies until Replay. Tap a map node for an accessible replay sheet; Settings→Progress holds the complete per-world/per-pond collection. Flowers are12px inside normal50px nodes,16px in boss rows; golden ~24px badge (26px bordered envelope) is separate.

## Layout, art, audio and install

- Mode **B** is default: board width = **35/36 (97.2222%)** of app width, all grid sizes. At 412px: board400.55, 5/6/7 cells73.30/60.58/51.50px minimum. At360px: board350, cells63.19/52.16/44.28px. `GAME_CONFIG.boardSizingMode='A'` retains target52px cells/growing boards. All tested cells ≥44px. Results fit without scrolling at412×915 and360×780, including boss30 and Daily.
- Starters and generic board/jump/swim pieces are independently swappable in `characters.js`. Approved Bloom v6.4 is centralized in CAST/POWER_FACES with supplied32/44/51/64px1x/2x/3x srcsets; Jun/Remy are unchanged. The central `POWER_ICONS`, `POWER_FACES` and `POWER_IDENTITY` maps feed the approved v6.1 chooser, switch rows, 72px button, first-use card, companion panel and all three Hot Spring friend tags. Neutral-arrow Undo is separate. Used powers display a 0 badge, unused ones 1.
- V1-style **1500ms** upward launches, **100ms** stagger, **85px** arc remain visible over the expanded spring. Reduced motion settles directly. No repeated full board on results; all actions remain usable throughout.
- Haptics default on: single-tap mark/clear tick**12ms** only after its280ms resolution; double-tap placement has no tick, just its legal/illegal pattern. Drag tick**12ms**, ≥**70ms** throttle; legal**32ms**; illegal**[45,60,45]ms**; solve**[45,60,70,60,105]ms**; landing**18ms**. Missing/throwing `navigator.vibrate` is silent. Sound effects are optional synthesized WebAudio, default off.
- Music is a separate persisted toggle, default on but silent until a genuine gesture. **Northumberland — Spring Spring / Spring Enterprises** is the only track (CC0, source rechecked10 November2026 EST). Native loop with40ms head/500ms tail fades; gain0.14,800ms fade-in/240ms toggle fade-out, immediate hidden-tab pause, Opus64kbps /MP3112kbps fallback. Two files total4,186,008bytes; older tracks absent from runtime/precache. Sources/licenses: `assets/music/LICENSES.md`; credits in Settings. No Timberborn material was used.
- iPhone/iPad install copy: **Share → Add to Home Screen**. Standalone detection supports `navigator.standalone` and display-mode; safe areas use `viewport-fit=cover`/`env(safe-area-inset-*)`.

## Progress / Daily

The approved v6.2 illustrated generic asset is shared by board, counter, rules and Peek via one `BOARD_SPRITE`. It is a self-contained SVG wrapper around the provided 51px@3x PNG; no external image dependency.

Current key/schema stays `capydoku.progress.v3` /3. v3/v3.1/v3.1.x →v4 preserves compatible normal boards, progress, selected capy, powers, lilies, streak and settings. All stored chill/relax preferences and attempt flags are discarded. Explicit Relax attempts, or mode-less attempts under an old Relax preference, restart empty with3oranges and unused native power. Explicit normal attempts remain intact. The active save is rewritten safely on migration. New optional fields include nickname, lilies/dailyLilies, attempt metrics, tutorialSeen and powerIntroSeen; completed-Pond1 players without a tutorial flag are not nagged. New players name themselves then choose a starter.

v2 →v3/v4 retains compatible boards/progress/streak/settings, maps Classic→Jun, Beanie→Remy, Orange→Bloom, Duck→Jun, and starts the new powers unused. v1 retains earned progress/streak/settings and unchanged21–30 boards; retuned1–20/old-Daily partial boards are discarded, never completed IDs. Old keys remain untouched. Malformed/unavailable storage is caught; future schema is read-only; at most40 partial sessions. Site-data deletion/eviction can erase local progress.

Daily depends on local date and campaign rock eligibility: no-rock bank until21 is reached/unlocked or a rock-era pond is cleared. First actual rock encounter shows a one-time intro. Changing eligibility does not double-credit a date; missed dates reset the streak. It is a finite365-board bank per state plus8 transforms, not infinite novelty.

## Verify / test / package

```sh
python3 scripts/verify-v4.py
npm run test:unit
CAPYDOKU_REPORT_VERSION=v4 CAPYDOKU_SCREENSHOT_DIR=reports/screenshots-v4/regression npm run test:e2e
python3 scripts/capture-v4.py
python3 scripts/contact-sheet-v4.py
python3 scripts/package-runtime.py --replace-local-package --verify
```

These development commands apply to the full app tree, not the minimal runtime archive. Playwright is a local development dependency. Full mobile/touch projects run at both target viewports, scale1, America/New_York, with configured retries0 and browser error capture. Authoritative counts/results: `reports/TEST-SUMMARY-v4.json`, `unit-v4.log`, `e2e-v4.log`, `playwright-v4.json`/HTML. Verification: `verification-v4.json/.md`, `daily-independent-v4.json`, `proof-effort-v1-v2-v3-v4.json/.md`. All760source boards and5,840actual daily outputs have unique solutions and complete documented no-guess proofs; independent Python permutation enumeration agrees with JS row DFS.

Main handoff: `reports/ROUND-v4.md`, `reports/screenshots-v4/`, `reports/contact-sheet-v4.png`. Runtime archive: `../capydoku-v4-runtime.tar.gz`. Packaging never overwrites any shipped earlier tar. Cache rebuilds are guarded; deliberate runtime edits require `python3 scripts/build-sw.py --bump-cache`, refreshed hold hashes and tests again.

STEP0 stable-backup gate passed before any app edit; evidence `reports/step0-v4.json`. All v1/v2/v3/v3.1 backups and shipped archives remain immutable. This localhost preview is not a phone-accessible live link. Real iPhone/S24, physical haptics/audio and comprehensive accessibility remain unverified; see `KNOWN-ISSUES.md`.
