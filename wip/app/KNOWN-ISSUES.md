## Two-phase boss WIP (not published)

All 15 bosses now have two phases. See `reports/boss-phases/README.md` for
checkpoint/reward semantics, solver witnesses and browser evidence. Phone feel
and physical iOS behavior remain unverified; the feature is saved only on
`handoff-v5-wip`. The remote leaderboard remains disabled.

## v5.0 integration WIP

The campaign and selected crates are verified; see `reports/v5.0/INTEGRATION.md`.
The historical full unit suite still needs a port away from omitted backups and
mockup sources, old version/count assertions, and an unbounded legacy deadlock
audit. The dedicated v5.0 campaign/migration suites pass. Remote ranking is off.
Physical iPhone/Safari toolbar behavior and haptics remain unverified.

# Known issues / honest limits — local v4.3.1 (v4.3 rev b + iPhone fit; not published)

## v4.3.1 (iPhone fit)
- **Verified only in emulation.** Playwright WebKit with iPhone emulation (DPR 3), not a real iPhone or iOS Safari. Every crate pond and Boss 29 fit at 375×525/667, 390×664/694/844, 393×702/852 and 430×782/932 (180/180 harness states; 119 WebKit E2E tests).
- **iOS 26 floating toolbar:** it can't be emulated. The page uses svh/dvh and safe-area padding, but if iOS draws its translucent bar over the layout viewport, the bottom of the lilies card/controls could still sit under it. Needs a check on Sebastián's phone.
- **Short screens get smaller cells.** In a Safari tab at 375×525 (iPhone SE with toolbars): crate 8×8 cells are 28 px, Boss 29 is 24 px (the floor), pond 7 is 27 px. At 390×664, Boss 29 is 36 px and crate 8×8 is 40 px. On short screens the crate hint text, and on very short screens the packed-lilies pill and the tap hint, are hidden. The controls stay ≥ 44 px.
- **The layout tier depends on the measured height.** 390×694 uses compact + a small shrink (Boss 29: 34 px) while 390×664 uses the tight row controls (36 px), so cell size isn't strictly monotonic with height.
- **The rev b Show me styling was broken on every device** by an unterminated CSS comment (gate tag, transition art, replay lock and crate reward styling too). Fixed, and a unit test now rejects CSS comments that swallow rules.

## v4.3 list

### rev b
- **Wrong capy = immediate mistake** (Producer decision, Nov 15). A capy outside the unique solution is rejected with a red shake, costs an orange (spare first; none under Nap) and counts as a mistake. This replaces the v4 rule "a rule-breaking placement costs an orange and stays until you clear it" (v4.1 and v4 notes below are superseded). A capy that is legal but wrong — Sebastián's pond 23 dead end — can no longer stay on the board.
  - It is stricter than before: placing a capy now reveals whether that cell is right (it either locks or hops out). That was already true via the lock badge; now it also costs an orange. Playtesting may show the game feels harder on 9×9.
  - **Clear conflicts was removed.** The pure helper `clearConflicts()` is kept (unused by the UI) because old-board tests still use it.
  - Old saves with wrong capys are repaired once when resumed (wrong capys dropped, no orange or mistake change).
  - Second chance's approved v6.1 phrase "Undo mistake, restore one orange" was kept (it is the Designer's asset); the first-use card and notice explain that it now only restores the orange.
  - Sebastián's screenshot (`attachments/b584c6e4….jpg`) was not on the box. The v4.2 pond 23 position was rebuilt from `app-v4.2.1-backup/levels.json`; locks 0, 9, 19, 22 + wrong r6c4/r7c7 is the only set that matches his description.
- **No level screen:** the app opens to the hub (next pond's transition) or resumes the pond in progress. Replay only in Settings › Progress. The hub button says "Start/Continue pond N" (the mock says "Play pond N").
- **Fresh Leaf:** CSS greens only. Inline greens in JS (zone outline stroke #3F513E, tutorial pictograms) were not recoloured, as in the Designer's mapping. #4E944F/#4A944E were mapped to the green-500 variable (Designer: #3B7E3D/#319741) — a visually minor difference.
- **Retired/rewritten tests (rev b):** Home-tile tests → hub/Progress tests; every spec that left a wrong capy on the board (mobile violation ×4, game over, Nap/Second chance, relax-bug overfill/Peek obstruction, v41/v43 Clear conflicts and conflict ring, v2 tap cycle/haptics, no-mode taps, power-identity offline step, rewards metric) now expects the rejection; v43 unit tests "Undo of Clear conflicts" and "Undo restores a mutual conflict" were retired (those boards can't exist). Test seeds use a nonce (`settleSeed`) because a resumed game page could save on top of a seed.

- **Boss 29 (10×10) cells are below the 44 px guideline at 360 px.** Measured 33.00 px at 360×780 (rev b, 2 px gaps) and 35.14 px at 412×915 (no scroll, all four corner cells tap correctly in E2E: `reports/v4.3/boss29-fit-*.json`). 9×9 ponds are about 34 px at 360. This was approved (9×9 cap, boss 29 = 10×10). Real-finger accuracy on a phone is unverified.
- **Zone colours 8–10** are the Designer's colour-blind fixes (rev b): zone 8 #A6A5E7 with open squares, zone 9 #E8A0BF, zone 10 #BCD49E. Checked in screenshots only, not on a real device or with colour-blind players.
- **The crate ramp has not been playtested.** The 6 crate ponds (26/30/39/57/66/80 optimal moves; pars 40/45/55/85/95/115 = moves × 1.45, nearest 5) are the Designer's edited ramp. They were re-verified with the Designer solver and the app's BFS, and the deadlock hint has 0 false alarms on all 6 (`reports/v4.3/deadlock-audit-v43.json`). C2 (pond 10, unchanged layout) still has the highest silent-trap rate: 9.6% of pushes, from push 1. Undo/Restart are free, and "Show me" appears after 3 restarts.
- **Crate ponds are now mandatory** (confirmed by Sebastián). A player who can't solve one can use "Show me" after 3 restarts. It plays the solution and awards only the Packed lily: no Clean run, no Par and no +1 orange.
- **Old half-played boards are dropped once** ("Ponds refreshed"). Every pond whose board changed in v4.3 is affected: ponds 1–4 are now 7×7, 6–9 8×8, and the rest have new boards. So are boards on the old crate-pond ids. Cleared ponds, lilies, goldens, streak, nickname and starter are kept. Goldens move 10→9, 20→19, 30→29, and those bosses count as cleared. Crate Cove 3/5 solves carry over to ponds 10/20, with Par only if the old best ≤ the new par. Crate Cove 1 (no pond equivalent) is kept only as legacy best-moves data.
- **Rollback to v4.2.1 code** keeps every completion and lily. v4.2.1 would not show goldens on 9/19/29 (it expects 10/20/30) and ignores the v2 bonus block. A v4.2.1 tab left open next to v4.3 could overwrite those extras.
- **Hot Spring growth now comes from the world gates (crate ponds 10/20/30)**, not the logic bosses. Tier copy is "Open a world gate to grow your spring". Bosses still give the golden lily.
- **The old "every early pond has a 1-cell zone" rule no longer holds.** The v4.3 ramp starts at 7×7, and the smallest zone in ponds 1–4 is 2–3 cells. `v2.spec.js` now checks "smallest zone ≤ 3".
- **Retired tests:** `v42.spec.js` and `upgrade-v42.spec.js` (the optional bonus offer after ponds 5/15/25 no longer exists) were replaced by `v43-crates.spec.js` and `upgrade-v43.spec.js`. Old specs were adapted to the v4.3 layout:
  - bosses 9/19/29 and `pondLabel()`;
  - normal-board checks moved off crate ids 5/25/30;
  - sizes read from `levels.json`;
  - 8×8+ cell floor of 30 px;
  - old saves now "refreshed once" instead of "board kept".
  No other behavioural assertion was weakened.
- **Stale v4.2-era reports** (`reports/verification.json`, `reports/difficulty-v4.1.json`) describe the old 5×5–7×7 content. The v4.3 content report is `reports/v4.3/levels-pick.json`.
- **v4.2 crate bug found while building:** the global 48 px button min-height made crate cells ≥ 48 px, so 8×8 crate boards overflowed 360 px. Fixed in `crates-v43.css`. v4.2's 3 bonus levels were ≤ 7×7, so the bug never showed live.
- The real-device caveats from v4.2/v4.1 still apply: haptics are verified only as mocked calls, iOS has no vibration, and touch is emulated.

## v4.2.1 list (phase 1)

- **"A capy ends up next to another one" — two root causes fixed, a third path possible.**
  - (A) Undo kept today's locked capys but restored an older board around them. That could bring back a wrong capy you had removed, now touching a capy that was locked later (row, column, zone or diagonal). No orange was lost. Undo now leaves such a capy cleared. Boards that really had the clash (e.g. undoing Clear conflicts) are restored as before.
  - (B) If a phone delivered the native click of tap A late (after tap B), A was delivered twice. The game read that as a double-tap, so a capy landed where you only meant to mark ×.
  - Reproduced in E2E with synthetic late clicks. Whether Sebastián's phone hits (A), (B) or both can't be confirmed without his detail.
  - Not changed: a capy that is legal but wrong still gets the "correct" buzz (110 ms) and no lock badge. Only correct capys lock. Giving it a different buzz would be a design change and needs a decision.
- **Smaller tap targets come with v4.3 phase 2 (8×8/9×9)**, not in this build. See PLAN.md.
- **Haptics v4.2.1** (every pattern about 1.5× longer, same shapes): verified as mocked `navigator.vibrate` calls only. Real-device feel is unverified, and iPhones still have no Vibration API.
- **Fixed alongside:** a click event with no pointerId (a plain MouseEvent) threw `Cannot read properties of null (reading 'handled')` in v4.2. A locked capy in a conflict now shows the red ring (the gold lock glow used to hide it).
- **Test maintenance:** version literals were moved from 4.2 to 4.2.1 in `unit.test.js`, `updates.test.js`, `v31.test.js`, `v42.test.js`, `updates.spec.js`, `upgrade-v42.spec.js`, `v42.spec.js` and `v31-extension.spec.js`. The haptic pins in `unit.test.js` were updated to the new values. One v4.1 test ("Undo can restore wrong cells") still passes unchanged.

## v4.2 list

- **Not playtested by humans.** The three crate levels are verified by the Designer's exact solver (`verify/solver.py`) and by the app's BFS, but "ramping difficulty" is measured as board size + optimal moves/pushes + search states (18/8 → 30/13 → 57/22), not by timing real players. Level 3 (57 moves, 7×7) may feel long on a phone; par is shown (80) but has no consequence.
- **Deadlock hint is deliberately cautious.** It only flags provably dead crates (corner, frozen 2×2, a wall line with no fruit). An exhaustive check of every reachable state found **0 false alarms**, but it catches 82% / 88% / 98% of dead positions in levels 1 / 2 / 3 (`reports/v4.2/deadlock-audit.json`). Some hopeless positions (for example, two crates blocking each other away from walls) show no hint; Undo and Restart are always free.
- **Spare orange rules (decisions):** it is tied to the pond right after the bonus ("for Pond 6"). The first attempt started on that pond takes it, whether it's a new or a resumed board. It waits if you play the Daily or another pond first. Retry/Replay after spending it gets no new spare. Second chance restores the normal oranges only, never the spare. Undo never refunds it.
- **Bonus progress isn't saved mid-level.** Leaving, reloading or closing the app during a bonus restarts that bonus from the beginning (it's short and optional). Solved bonuses, best moves, the pending spare orange and the D-pad choice are saved.
- **Rollback/old tabs:** storage stays schema 3 with an additive `bonus` block, so rolling back to v4.1 keeps every pond, lily and streak. v4.1 would drop only the bonus extras (and a pending spare orange). A v4.1 tab left open alongside a v4.2 tab could overwrite those extras the same way.
- **Haptics:** crate ticks (24 ms per pushed cell) and the landing pattern ([40,50,140]) are verified as mocked `navigator.vibrate` calls in Chromium only. How they feel on a real Android phone is unverified. iOS Safari has no Vibration API, so iPhones get no haptics. The cell landing a crate gets the landing pattern instead of the tick (one vibration per step).
- **Swipe** is one step per swipe (≥24 px) with no hold-to-repeat. Tap-to-walk animates the capy one cell every 85 ms. Real-device touch feel and accidental swipes vs. taps are unverified (emulated touch only).
- The orange/+1 badge on the HUD and the golden banana on a golden crate are the lowest-contrast pairs. They read in screenshots at 360 and 412 px, but they haven't had a real-device accessibility review.
- Bonus levels aren't listed in Settings > Progress. A solved bonus is replayed from the same "Next pond" screen (after ponds 5, 15 and 25, including replays of those ponds).
- **Test maintenance:** version-literal assertions were moved from v4.1 to v4.2 (or to `BUILD.version`) in `unit.test.js`, `updates.test.js`, `v31.test.js`, `updates.spec.js`, `upgrade-v41.spec.js` and `v31-extension.spec.js`. No behavioral assertion was weakened. The v4 → current upgrade spec now writes its logs to `reports/v4.2/regression-v4-upgrade-*`.

## v4.1 list

- Haptic strength is measured only as mocked `navigator.vibrate` patterns in Chromium; how strong it feels on a real Android phone is unverified. iOS Safari has no Vibration API, so iPhone gets no haptics (documented in `config.js`).
- The difficulty score is a structural deduction measure (techniques and step counts), not timed human playtests.
- Locks are permanent for the attempt. Replay starts a fresh, empty board. A rule-breaking placement still costs one orange even when the new capy is correct (v4 rule kept). The capy still locks, and Clear conflicts / Second chance remove the unlocked capy it clashes with.
- In-progress boards for ponds whose board changed in v4.1 (6–20 and 22–30) are dropped once on update, and a toast says so. Cleared ponds, lilies, golden lilies, Hot Spring, nickname, starter and streak are kept.
- The illustrated map is gone from the flow. `assets/v6/map-painted.jpg` stays on disk (HTTP 200 for old v4 clients) but is no longer precached. The boss SVGs are still used on the boss transition screen.
- The "lost first tap after a drag" fix is for a Chromium touch behavior seen in emulation. Real-device touch timing is unverified.
- The "Back to Pond Path" label stays in the frozen v3.1.3/v4 handoff tests, because those versions still use it.

## v4 list

- No known failing automated test is being accepted as a release exception; authoritative results are in `reports/TEST-SUMMARY-v4.json`. Real Galaxy S24, iPhone/Safari/WebKit, physical haptics, notches, OS install prompts and hardware audio/mute behavior are **unverified**. Tests use Chromium mobile/touch at412×915 and360×780, plus mocked iOS values and density3 asset selection.
- Progress is localStorage only. Browser eviction/site-data deletion can erase it; no sync/account/export UI. Future schemas are read-only. Old Relax attempts intentionally restart empty/full lives; explicit normal attempts and all earned progress/streak survive. Archival v1/v2 keys remain untouched but are not active saves.
- Latest “game over offers only retry/map” supersedes the old fatal Bloom rescue. Second chance must be used before losing the final orange. Undo/Clear conflicts do not refund lives or power budgets. Nap protects three actual placements/new marks, not three gestures.
- Tutorial uses the unchanged verified5×5 Pond1 rather than the source's static4×4 example. Actual guided marks persist; replay uses a disposable sandbox. Guidance is interaction-gated, not a mandatory30-second wait. Skip/completion is remembered.
- Daily is a finite365-board bank per rock-eligibility state plus8 transforms. Proof metrics are not human difficulty testing. Every source board and5,840actual date/state outputs have independent unique/no-guess checks.
- Illustrated map/scenery is flattened concept art. The v6.3 provided SVGs embed raster art; static locked/next/beaten states are used, without ambient fog/eyes/reward-reveal sequences. The29 center-to-center path curves and reachable50/120px targets are live DOM/SVG.
- Hot Spring growth uses earned objects, pools/ripples and light, not a navigable world. V1 jump/swim poses intentionally differ from the v6.2 board sprite; the current selected starter appears in the reaction. Bloom v6.4 is consistent across companion surfaces, with supplied density exports. Its approved intro JPEG is compatibility-only, not a large chooser preview.
- Generic board/counter/Peek shares the source-compatible self-contained51px@3x PNG-in-SVG wrapper, not true vector or all generic density exports. Conflict styling is an outline/badge, never tint. Ghost opacity is intentionally reduced; source opaque-outline contrast results do not certify ghost contrast.
- ModeB constant width deliberately leaves5×5 cells larger. At360px,7×7 is44.28px minimum, not48px; at412px it is51.50px. Below360px, landscape, high zoom, enlarged text and the full assistive-technology matrix are not comprehensively tested.
- First-use cards are marked seen only when confirmed. Not now spends nothing and can show the explanation again later. Bloom's card is eligible only after a life-losing mistake. Feedback is inline only, not duplicated as a toast.
- Only Northumberland by Spring Spring / Spring Enterprises (CC0) is bundled; the public source license was rechecked10 November2026 EST (`assets/music/LICENSES.md`). Decoded endpoints and Chromium native-loop/offline crossing are tested, not a real-device listening session. Source declarations cannot independently prove uploader provenance; subjective musical fit and older-iOS playback interruptions need real-device review. No Timberborn recording, payment or account was used.
- Localhost on this box is not a published/mobile-accessible live URL. The Producer must show screenshots before publication. No push, publication, repo creation, account or purchase occurred.

- The already-running live v3.1.3 page has only a passive controllerchange toast, not v4's automatic reload logic. Its FIRST v4 handoff needs one safe manual reload/relaunch after finishing/leaving the pond. Its board/progress and previous asset bytes are protected; v4 onward checks on launch/focus/visibility, auto-activates and reloads once only at a safe boundary. Previous caches may temporarily coexist while old clients remain open; this is intentional. Full multiple-browser/device concurrency is not comprehensively studied.
- Lily target times are explicit starting hypotheses, not human playtest calibration. Optional awards never gate advancement. Imported pre-metric partial attempts have unknown time/error history and earn only cleared until Replay; no retroactive perfect/timed awards. Site-local nickname is not recoverable after browser eviction. Unicode fallback covers tested ZWJ/marks/skin-tone/flags but is not a full Unicode grapheme conformance library. Real IME, software keyboard and assistive technology require device review.

- The supplied flattened Hot Spring background includes ambient painted lantern/hut scenery even before their earned overlays; earned plaques, extra lanterns, nook/pool objects and golden lilies are state-controlled. Repainting those background layers is outside this source-art integration.

- A pending automatic update can return to Map immediately after a clear rather than waiting for the entire celebration; it never interrupts an unfinished pond. Ordinary solves retain the full launch. Screenshot counts/nicknames/times are fictional seeded review states, not human-play difficulty/timing evidence.
