# Capydoku v4.1 round report (local only, NOT published)

Built on top of live v4 (commit 32b0cf7, cache `capydoku-v4-9d6ebe4d0481`). Final v4.1 cache: **`capydoku-v4.1-923843f2cc02`** (91 precached URLs). Nothing was pushed, published, signed in or bought.
Frozen v4 re-verified 2026-11-14 22:55 EST: all 1,493 manifest hashes match, the tar sha256 matches, and all 94 tar files are byte-equal to `app-v4-backup/` (`reports/v4.1/backup-v4-reverify.json`).

## Test results
- **Unit:** 137 tests: **137 passed, 0 failed** (`reports/unit-v4.1-final.log`).
- **E2E (Playwright, Chromium mobile, touch, mocked vibrate, 412×915 + 360×780), final full run started 23:27 EST:** 298 tests: **297 passed, 1 failed**. The failure was `[360] mobile.spec.js:22 Daily Pond deterministic reload…`, which timed out waiting for Home after a reload. In isolation it passed **10/10**.
- **Earlier full run (23:02 EST, box under load):** 294 passed, 4 failed (`v2.spec:25` drag ticks, `v31-extension.spec:11` boss30 fit, `mobile.spec:17` row violation, `mobile.spec:20` boss 10 golden lily). None of these failed in the later full run. In isolation they passed 56/56, then 80/80.
- **Assessment:** these are intermittent, timing-related flakes (no test failed in both full runs), reported as flaky rather than counted as green. Details are in `reports/TEST-SUMMARY-v4.1.json`.
- Coverage: locks + bump, haptics config, Peek/Undo/Second chance/Nap with locks, migration from a v4 save at about level 18 with lilies, the real v4 → v4.1 SW update (deferred mid-pond), offline, rock ponds solved by tap and by drag, rock copy, home/transition/level list/replay, and the full v1–v4 regression.

## 1) Correct capys lock
- A capy that matches the solution is locked. Tap, double-tap, drag-X, Clear conflicts, Second chance and Undo can't remove it.
- Look: a soft gold inner glow on the cell (box-shadow, so the capy art isn't filtered) plus a small padlock badge in the corner.
- Tapping a locked capy: an immediate small bump animation and the light `locked` haptic (18 ms). No orange is lost, no move is counted and nothing goes on the undo stack. A double-tap gives one bump, not two.
- **Peek** never targets a locked cell. **Nap** still shields three placements, and a correct capy placed under Nap locks as usual.
- **Second chance:** if the last mistake's capy is locked (it was correct but broke a rule because an earlier wrong capy was nearby), it stays. Second chance removes the unlocked capys it clashes with instead.
- **Undo decision:** Undo restores the earlier board, but every locked cell stays a capy. So Undo can clear Xs and wrong capys, but never a lock. Undo is the same as v4 in every other way, and it still doesn't refund oranges.
- **Orange decision (v4 rule kept):** a placement that breaks a rule costs one orange even when the new capy is correct. It still locks, and Clear conflicts removes the unlocked capy it clashes with.
- **Saves:** locks are saved with each attempt. When a v4 save loads, every cell that's already a correct capy gains a lock (tested with a v4 save at about level 18 with lilies).

## 2) Stronger haptics, all in `HAPTIC_CONFIG` (config.js)
| Case | v4 | v4.1 |
|---|---|---|
| mark X (single tap) | 12 | **30** |
| clear X / clear an unlocked capy | 12 | **26** |
| drag tick (≤1 per 70 ms) | 12 | **22** |
| correct capy | 32 | **70** |
| mistake | [45,60,45] | **[110,80,110]** (double buzz) |
| solve | [45,60,70,60,105] | **[90,60,120,60,220]** |
| hot-spring landing | 18 | **40** |
| locked bump | — | **18** (new, deliberately light) |

The haptics toggle, the 70 ms drag throttle and the double-tap behavior (no tick on a double-tap) are unchanged. The legacy names `tick`/`legal`/`illegal`/`splash` are aliases of the same frozen config, so there's no second table. iOS Safari has no Vibration API, so iPhones get no haptics. This is noted in `config.js` and the app never errors without it.

## 3) Real difficulty curve
`reports/DIFFICULTY-v4.1.md` has every level before → after, the scorer definition and a ramp chart per world.
- **World 1 (1–10):** 10,10,10,10,10 (tutorial plateau, pond 1 unchanged) → 52 → 110 → 190 → 230 → **boss 279**.
- **World 2 (11–20):** **breather 52** → 110 → 141 → 176 → 211 → 244 → 281 → 314 → 355 → **boss 399**.
- **World 3 (21–30):** **breather 156** (the v4 rock-intro board, kept) → 205 → 252 → 299 → 350 → 403 → 450 → 501 → 556 → **boss 600**.
- Each world's scores never go down and the boss is always the world maximum. Guessing depth is 0 on all 30 ponds. Grid sizes, rock counts, the level 1 tutorial, the rock intro and Daily gating (no rocks before level 21) are unchanged. 760 source boards and 5,840 real Daily outputs were re-verified as unique and no-guess (`reports/verification-v4.1.md`).
- **Migration by level number:** cleared ponds, lilies, golden lilies, Hot Spring, nickname, starter and streak are all kept. An in-progress board for a changed pond (6–20, 22–30) is dropped once with a "Ponds refreshed" toast. No lily is ever lost.

## 4) Rocks — investigation, fix, recommendation
**Audit:** I checked 986 distinct rock boards: every campaign rock pond plus every real Daily output across 8 years of dates in both rock-eligibility states (`scripts/rock-audit-v41.mjs`, `reports/v4.1/rock-audit.json`). Every one has exactly one solution, no solution capy on a rock, a no-guess proof and no zone or row made entirely of rocks. Each was also played out (drag-X every non-solution cell, then place the capys) and solved with all 3 oranges. Rock taps never change anything. Code review: the solve check, conflict detection, no-touching rule, row/column/zone counts, Peek, marking, drag-X (rocks are skipped) and the saved state all treat a rock as "no capy, no X needed". **No rules bug: a rock never counts as a capy, a required X or an empty required cell.**

**(a) Root cause of "rocks don't let you finish":** two touch-interaction bugs plus confusing copy.
1. In v4, rock cells were rendered as `disabled` buttons. On touch Chromium a disabled button swallows the pointer, so a drag that started on or crossed a rock could stop painting. v4.1 renders rocks as `aria-disabled` with `data-rock`, so they still can't be changed but no longer eat gestures.
2. After a drag, Chromium can drop the next native click. The first tap of a following double-tap was lost, so the player got an X instead of a capy and the pond looked impossible to finish. Rock ponds are big 7×7 boards, so they're the most drag-heavy. v4.1 adds a pointerup fallback that replays a lost tap once, with E2E coverage for tapping right after a drag.
3. The v4 copy said "Rocks block a spot · Keep this spot empty". That suggests the rock's row, column or zone is already handled, or that it needs an X. Neither is true. On short screens the intro callout could also sit too low, so it now flips above the rock and keeps "Got it" on screen.

E2E now solves rock ponds 21 and 30 and Daily rock boards both by double-tapping and by drag-X then capys, at both screen sizes.

**(b) Recommendation: keep rocks**, now that the touch bugs are fixed, with this clearer explanation (already in the app's rock intro and rules sheet):
> **Rocks: no capy can sit on a rock.** A rock is not a capy. Its row, column and zone each still needs one capy somewhere else. No × needed on rocks.

Why keep them: they're the only new idea in World 3, they make 7×7 boards feel different without new rules to learn, and every rock board is proven fair. Removing them would mean regenerating and re-verifying campaign ponds 21–30 (another board change for anyone mid-pond) and the rock variants of the Daily bank, deleting the rock intro, the `rockIntroSeen`/`rocksReached` flags, the rock art and its tests, and the World 3 difficulty would have to be re-tuned. Sebastián decides.

## 5) Illustrated Pond Path map replaced
- **Choice:** a simple home, not auto-launching into a pond. Launch → **Home**: a big "Your next pond · Pond N · world · grid" Continue card (it resumes an in-progress board), a **Daily Pond** button, and **All ponds**: compact tiles grouped by world, each showing its 3 lilies, with boss/golden marks. **Hot Spring** and **Settings** stay in the bottom bar. This keeps Daily and Hot Spring one tap away, and Continue is still a single tap.
- **After a solve:** the usual solved/lilies summary → **Next pond →** → a transition screen with the level number, world and grid, rock count, the lilies earned so far, and boss info (the world boss art and "Boss pond" before 10/20/30, a "Breather" note after a boss, and an "All 30 ponds cleared" ending) → **Start pond N**.
- **Replay:** tap any cleared tile in All ponds, or use Settings › Progress › **Replay a pond · all ponds**.
- Lilies, bosses, golden lilies, Daily, Hot Spring, Settings and the level 1 tutorial are unchanged. Saves are untouched.
- The dead map background `assets/v6/map-painted.jpg` was dropped from the precache. The file is kept so old v4 clients still get 200. `assets/map-bg.jpg` and the boss SVGs are still used. All 91 precached URLs return 200 online and offline (E2E).

## Auto-update v4 → v4.1
Tested with the real v4 service worker handing over to v4.1. The reload waits while a pond is in progress and happens once on Home or after finishing. Old asset bytes survive a SW restart and going offline, there's no reload loop, and the build label reads v4.1 afterwards (`tests/upgrade-v41.spec.js`, `reports/v4.1/upgrade-*.json`).

## Deliverables
- App: `/workspace/capydoku/app/` · runtime: `/workspace/capydoku/capydoku-v4.1-runtime.tar.gz` (`reports/runtime-package-v4.1.md`)
- Screenshots: `reports/screenshots-v4.1/regression/` (412×915, plus a `360x780/` subfolder) · contact sheets: `reports/contact-sheet-v4.1.png`, `reports/contact-sheet-v4.1-key.png`
- `reports/DIFFICULTY-v4.1.md`, `reports/difficulty-v4.1.json`, `reports/verification-v4.1.md`
- Logs: `reports/unit-v4.1-final.log`, `reports/e2e-v4.1-final.log`, `reports/playwright-v4.1-final.json`, `reports/playwright-html-v4.1-final/`
- Limitations: `KNOWN-ISSUES.md` (v4.1 section at the top)
