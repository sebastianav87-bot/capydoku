# Capydoku v4.2 round report: crate bonus (local only, NOT published)

Approved by Sebastián (via The Producer): "Sí, construye el bonus de cajas después de la v4.1". Built on top of v4.1 (live commit b1ac30d per The Producer, cache `capydoku-v4.1-923843f2cc02`). Following the Designer's v3 spec (`mockup/boxworld-concept/v3/`). Nothing was pushed, published, signed in or bought. Rocks in the logic ponds are unchanged.

- **New cache:** `capydoku-v4.2-3c7ece12bb6d` (103 precached URLs). Auto-update from v4.1 is kept: the update is deferred mid-pond **and** during a crate bonus, then reloads once at a safe screen. Offline works.
- **Runtime:** `/workspace/capydoku/capydoku-v4.2-runtime.tar.gz`, 106 files, sha256 `1be28e1b96efaff53c5b9dfbb846ae6b40dd287cf7619f9a8b49771590dcd03c`. It was extracted and served by itself: 103/103 resources returned 200 online and 103/103 offline, offline reload worked, 0 browser errors.
- **Step 0:** `app/` was copied to `app-v4.1-backup/`, and its 94 runtime files are byte-identical to the v4.1 tar. Its cache digest, recomputed from the backup files, is `capydoku-v4.1-923843f2cc02` (91 precache URLs; 94 files + "/" = The Producer's 95 URLs).

## Test results
- **Unit:** 148 tests, **148 passed, 0 failed** (11 new in `tests/v42.test.js`).
- **New v4.2 E2E** (`v42.spec.js`, `upgrade-v42.spec.js`; Chromium mobile, touch, mocked vibrate, 412×915 + 360×780): 24 tests, **24 passed, 0 failed**, in two separate runs.
- **v4.1-and-older regression E2E:** 298 tests, **293 passed, 5 failed** on the first full run (all in `v31-extension.spec.js`).
  - 2 were real test-maintenance failures: a stale `/^capydoku-v4\.1-/` literal. I fixed it, and the tests passed.
  - 3 were timing flakes under load: the v1 flight/soak phases (Remy at 412, Bloom at 360) and the 360 solved-daily fit, which hit the 45 s timeout. The whole spec in isolation, ×2 on both viewports: **72/72 passed**.
  - These 3 are reported as flaky, not counted as green.
- **Total this round:** 322 E2E. See `reports/TEST-SUMMARY-v4.2.json`.

## What's new
1. **Offer:** an offer appears on the v4.1 "Next pond" screen after ponds **5, 15 and 25**, including replays of those ponds; never after the Daily or other ponds.
   - "Start pond N" stays the first, primary button.
   - Below it is a card: BONUS POND · Optional, a mini board, "Pack the fruit with {capy} · Uses your current capy" and "+1 orange for Pond N".
   - Then a secondary "Play bonus" button and "**Skipping costs nothing.** Bonus ponds never block your progress."
   - The lilies row is kept; the capy portrait hides so the screen fits at 360×780 with no scroll.
2. **Play (Sokoban):**
   - The active capy pushes; there's no picker.
   - Wooden X-crates (the Designer's vectors, exported from `art_v3.py`) go onto watermelon, banana and pear targets. No orange or mango is used.
   - Rocks are solid (the same rock art as the logic ponds), and the board uses the same frame as the logic board.
   - **Swipe** = one step. **Tap a tile** = walk the shortest path and never push; the whole walk is one undo step.
   - **Undo** is free and unlimited, and even undoes Restart. **Restart** and **Leave** (back to the Pond N transition) are always available.
   - Optional **D-pad**: in Settings ("Crate bonus · D-pad") or on the first-run "Move your way" card. Arrow keys/WASD also work.
   - The HUD shows Moves, Pushes, Par, the "x/3 packed" pill (grey fruit until packed) and "Your capy · {name}".
3. **Landing:** the fruit hops into the crate (pop and squash), and the crate turns golden with a glow and sparkles. The cell's fruit hides, the pill fruit colors in, and the board glows when all 3 are packed. The reward screen follows 0.9 s later.
4. **Haptics:** all from the shared `HAPTIC_CONFIG` in `config.js`.
   - `cratePush` 24 ms for each cell a crate moves.
   - `crateLand` [40,50,140] when it lands on a fruit (distinct from correct 70 and mistake [110,80,110]).
   - The bonus solve uses `solve`; a newly stuck crate gets the light `locked` 18 ms.
   - iOS Safari has no Vibration API (noted in config.js).
5. **Reward:** "Fruit packed!" with three golden crates on the hot-spring art, "+1 orange for Pond N · Saves you once · Next pond only · no stacking", "{moves} moves · best path {optimal}" and "Extra fun · not part of 100%". It offers Continue → Pond N and Replay bonus.
   - In Pond N the 4th orange shows a gold ring and a +1 badge. A hint line reads "Bonus orange · this pond only · used first if you slip; mistakes still count".
   - The first rule-breaking capy spends the spare instead of an orange, with the toast "Bonus orange used · the mistake still counts". The mistake still counts, so that pond loses its 0-mistakes lily (tested).
   - It never stacks, Undo never refunds it, and Retry doesn't get a new one.
6. **Deadlocks:** a crate that is provably stuck (corner, frozen 2×2 block, or a wall line with no fruit) gets a pulsing red ring and the banner "**That crate is stuck** · It can't reach a fruit from there · **Undo?**".
   - An exhaustive audit of every reachable state of all 3 levels found **0 false alarms**.
   - It flags 82% / 88% / 98% of dead positions (`reports/v4.2/deadlock-audit.json`).
7. **Saves:**
   - Storage schema stays 3 (rollback-safe), with an additive `bonus` block `{v:1, solved, best, spare:{forPond}, dpad, controlsSeen}` and a per-attempt `spare` (0/1). Everything is sanitized and bounded.
   - A v4.1 save loads untouched and gets the bonus block written once.
   - The frozen v4.1 code reads a v4.2 save without losing any pond, lily or streak (unit-tested against `app-v4.1-backup/core.js`).
   - The real v4.1 → v4.2 service-worker update was tested on Home (one reload, "Updated to v4.2") and mid-pond (deferred until finished, old code pinned offline).
   - v4.2 → a later build is deferred during a bonus and reloads once on leaving.

## Levels (all verified by the Designer's `verify/solver.py`; the app's BFS gets the same optimum)
| Bonus | After pond | Level | Board | Rocks | Optimal moves | Pushes (move-optimal) | Optimal pushes | BFS states | Par |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 5 | Crate Cove 1 (new) | 5×5 | 4 | **18** | 8 | 8 | 8,849 | 25 |
| 2 | 15 | Crate Cove 3 (Designer's level, unchanged) | 6×6 | 6 | **30** | 13 | 13 | 9,465 | 40 |
| 3 | 25 | Crate Cove 5 (new) | 7×7 | 9 | **57** | 22 | 20 | 170,521 | 80 |

The board size follows each world (5×5 → 6×6 → 7×7). Solutions and solver output are in `crate-levels.json` and `reports/v4.2/crate-levels-solver.json`. Levels 1 and 3 came from a seeded generator (`scripts/gen-crate-levels.mjs`) and were picked by hand. Par = optimal × 4/3, rounded up to 5; it's shown only.

## Decisions I made (please confirm or change)
- **Primary button label:** the existing "Start pond N" button stays the primary *Continue* action, so the v4.1 transition and its tests are unchanged. The reward screen's button is labeled "Continue → Pond N", as in the mockup.
- **Leave** returns to the Pond N transition (where Continue is primary), not straight into the pond. The leave card reads "Back to Pond N, nothing lost".
- **Spare orange scope:** it's tied to the pond after the bonus. The first attempt on that pond (new or resumed) takes it. Playing the Daily or another pond first leaves it waiting.
- **Second chance** restores normal oranges only.
- Replaying a bonus after it's solved still works, but the spare doesn't stack.
- The bonus isn't saved mid-level (it's short and optional).
- The **landing step** gives only the landing pattern (one vibration per step), not tick + land.
- **Storage schema stays 3** (additive), so a v4.1 rollback keeps all progress.

## Files
- **New:** `crates.js` (rules, walk, deadlocks, BFS, reward helpers), `bonus-ui.js`, `bonus-v42.css`, `crate-levels.json`, `assets/crates/*.svg`, `scripts/build-crate-art.py`, `scripts/gen-crate-levels.mjs`, `scripts/verify-crate-levels.py`, `scripts/deadlock-audit.mjs`, `scripts/package-runtime-v42.py`, `scripts/contact-sheet-v42.py`, `scripts/run-e2e-v42.sh`, `tests/v42.test.js`, `tests/v42.spec.js`, `tests/upgrade-v42.spec.js`.
- **Changed:** `app.js` (offer, spare HUD, Settings toggle, hooks), `core.js` (bonus block, spare, bonus migration), `powers.js` (spare absorbs first lost orange), `config.js` (crate haptics), `index.html`, `scripts/build-sw.py` (v4.2), `README.md`, `KNOWN-ISSUES.md`, `package.json`, `playwright.config.js`. Version literals were updated in 6 older test files (listed in KNOWN-ISSUES).

## Screenshots
- `reports/screenshots-v4.2/` (42 at both viewports).
- Key sheet `reports/contact-sheet-v4.2-key.png`, full sheet `reports/contact-sheet-v4.2.png`, regression `reports/contact-sheet-v4.2-regression.png` (256 shots in `reports/screenshots-v4.2/regression/`).
- Key shots:
  - the offer after 5, 15 and 25
  - the controls card
  - each level at start, mid and packed
  - the first golden fruit
  - the deadlock Undo? banner
  - the reward
  - Pond 6 with the spare orange, and the spare absorbing a mistake
  - the D-pad setting and the D-pad
  - the v4.1 → v4.2 build label

## Known issues
See `KNOWN-ISSUES.md`. In short:
- no human playtests of the levels
- the deadlock hint catches 82–98% of dead positions, with no false alarms
- haptics, touch feel and contrast are checked only in Chromium emulation
- iOS has no vibration
- the bonus doesn't resume mid-level
- a v4.1 rollback drops only the bonus extras
