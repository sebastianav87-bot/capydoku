# v4.3 phase 1 — PROGRESS
Base: live v4.2 (commit c202415, cache capydoku-v4.2-3c7ece12bb6d). Local only; nothing pushed/published.
- [x] Backup app/ -> ../app-v4.2-backup/ ; verified 106/106 runtime files identical to capydoku-v4.2-runtime.tar.gz (sha256 1be28e1b...)
- [x] Bug 4 investigation: pure-layer fuzz (reports/v4.3/dev/fuzz-adjacency.mjs) -> only Undo creates uncharged touching pairs (~3% of random games on v4.2, 0 after fix)
- [x] Bug 4 root cause A: undoAttempt merges today's locks into an old snapshot -> resurrects a removed wrong capy next to a later-locked capy (powers.js)
- [x] Bug 4 root cause B: late native click of tap A after tap B's pointerup was delivered twice -> double-tap -> capy on A (app.js click/fallback dedupe)
- [x] Bug 4 extra: click without pointerId threw (controlTap null guard); locked+conflict cell hid the red ring (style.css)
- [x] Tests: tests/v43.test.js (14 unit; 13 fail on v4.2), tests/v43.spec.js (9 E2E x 2 viewports = 18; 8/9 fail on v4.2)
- [x] Haptics step-up (config.js), unit.test.js pins updated
- [x] Feasibility measured: blind generator (log-*.txt) 0 boards at 9x9/10x10; local-search scripts/climb-v43.mjs (climblog-*.txt) 44-513 boards/min 7x7..10x10; dry-run pick plan-pick-dryrun.json
- [x] Crate ramp: all 6 verified by Designer solver (crate-ramp-draft.json): 23/11, 30/13, 41/18, 57/22, 79/33, 98/49
- [x] PLAN.md complete
- [x] Version label v4.2.1, SW rebuilt: capydoku-v4.2.1-bc0fb084a94b (cache-hold-v4.2.1.json); unit 162/162 (unit.log)
- [x] Full E2E 333/340 first run (6 stale label literals fixed mid-run + 1 known load-flaky) -> rerun 12/12 pass = 340/340
- [x] v4.2.1 runtime tar packaged + smoke-verified; KNOWN-ISSUES.md and reports/TEST-SUMMARY-v4.2.1.json written
- PHASE 1 DONE. Items 1-2 NOT implemented (await Producer/Sebastián confirmation of PLAN.md).

# v4.3 BUILD (phase 2) — confirmed by Sebastián Nov 15 11:00 ET: fold v4.2.1 in, 9x9 cap, boss 29 = 10x10
- [x] Backup app/ (v4.2.1) -> ../app-v4.2.1-backup/ ; 106/106 identical to capydoku-v4.2.1-runtime.tar.gz (sha256 caf263f0...6c06)
- [x] Pools (reports/v4.3/pools, 480 s each) + scripts/pick-levels-v43.mjs -> levels.json (contentVersion 4.3): 24 logic ponds all within 2.7% of target, boss 29 10x10 r2 score 1001; Daily 365+365 at 7x7/8x8; 511 unique boards, all no-guess + unique
- [x] Roles table roles.js (crate 5/10/15/20/25/30, gates 10/20/30, bosses 9/19/29, breathers 11/21); app/powers/core/visuals use it
- [x] crate-levels.json schema 2 = 6-level ramp (scripts/build-crate-levels-v43.py); all 6 solutions replay-verified in crates.js
- [x] Zone palette + patterns extended to 10 zones (theme.js, pattern()) — needed for 9x9/10x10, not in PLAN; flagged for Designer
- [x] (code) Crate lilies (Packed/Clean/Par), Show me after 3 restarts, spare orange via Par, finale on 30 — bonus-ui.js crate-pond mode; tests pending
- [x] (code) Save migration migrateLayout (layout:2) in core.js; cleanBonus v2 in crates.js — tests pending
- [x] tests/v43-build.test.js (17 tests: roles, ramp, daily, crate ramp, lilies, spare, migration v4.1/v4.2/v4.2.1 + fuzz 400)
- [x] Old unit tests adapted to v4.3 content (unit, powers, v31, updates, rewards, v41, v42, v43); unit 173/173 (reports/v4.3/unit-build-try2.log)
- [x] scripts/verify-crate-levels-v43.py (read-only) — NOTE the v4.2 verify-crate-levels.py rewrites crate-levels.json; restored via build-crate-levels-v43.py
- [x] Deadlock audit on 6 crate ponds: 0 false positives (reports/v4.3/deadlock-audit-v43.json)
- [x] (code) Home + transition for crate/gate ponds; bonus offer removed; version 4.3; cache rebuilt (--bump-cache) — final rebuild at the end
- [ ] Unit + E2E (bg), screenshots, contact sheet, ROUND/TEST-SUMMARY/KNOWN-ISSUES, tar

## Designer review applied (steering Nov 15 11:25 ET)
- [x] crate-levels.json rebuilt from mockup/boxworld-concept/v4.3-review/crate-ramp-edited.json (C1/C3/C5 edited, C6 replaced, C2/C4 layouts kept)
- [x] One par rule (moves × 1.45, nearest 5): build script, verifier, LEGACY_CRATES (45/85), tests; pars 40/45/55/85/95/115
- [x] Re-verified with the Designer solver; deadlock audit 0 false positives; analyze.py re-run matches review (hint rules unchanged)
- [x] PLAN.md §4 updated; Show me / mandatory crates marked confirmed
- [x] v4.2 scripts/verify-crate-levels.py now refuses to run without --v42 (it rewrites crate-levels.json)
- [x] Fix: crate cells inherited the global 48px button min-height → 8×8 crate boards overflowed 360px; fixed in crates-v43.css
- [ ] Full unit + E2E (bg), screenshots, contact sheet, docs, tar

## E2E triage (Nov 15 ~11:40–12:03 ET)
- [x] try1 killed early (old specs still assumed boss 10/20/30, 5×5 pond 1–5, crate-free ponds 5/25/30, v4.2.1 cache name)
- [x] Adapted old specs to the v4.3 layout (bosses 9/19/29, pondLabel() from roles.js, pond 5→6/8 for normal-board checks, sizes from levels.json, 8×8/9×9 cell floor 30 px, old 5×5/7×7 saves now "refreshed once", goldens remapped)
- [x] Hard-coded screenshot dirs (relax-bug, sizing, v31, v31-extension, v4) now honour CAPYDOKU_SCREENSHOT_DIR; upgrade-v41 JSON moved from reports/v4.2 to reports/v4.3
- [x] Copy fix: Hot Spring plaques "Beat Boss 10/20" → "Open the Pond 10/20 gate" (visuals-v4.js)
- [x] Per-spec 412 runs green (one upgrade-v41 cache-digest flake, rerun 2/2)
- [x] sw rebuilt capydoku-v4.3-35d1cfcffc83; unit 173/173 (reports/v4.3/unit-build-final.log)
- [ ] Full E2E try2 (346 tests, both viewports) running → reports/v4.3/e2e-build-try2.log
- [x] (12:16 ET resume) try2 still running in bg (147/346 at 12:16). So far 2 fails: starters real-v2 (Peek now enabled on refreshed board → test fixed), v31-ext boss30 360 (2 min timeout, load) → rerun after
- [x] KNOWN-ISSUES.md v4.3 section written
- [ ] after try2: rerun failures, v4.3 specs with CAPYDOKU_SCREENSHOT_DIR=reports/screenshots-v4.3, contact sheet, ROUND/TEST-SUMMARY, tar
- [x] try2 done 341/346; reruns green (rerun 23/24 + Bloom@360 fixed 6/6) → 346/346; v4.3 specs 2nd run 52/52 into screenshots-v4.3
- [x] contact sheets (key 58 tiles); runtime tar sha256 60605d26…ac38 smoke OK; TEST-SUMMARY-v4.3.json + ROUND-v4.3.md written
- BUILD v4.3 DONE (local only, not published)

## Designer integrated-check fixes (Nov 15 12:51 ET)
- [ ] zone 8 #6F8FD8→#A6A5E7, zone 9 keep #E8A0BF, zone 10 #B9CC5A→#BCD49E; zone 8 pattern crosses→open squares
- [ ] 10×10 at 360 ≥33 px via narrow-width frame/padding (or report)
- [ ] bump cache, unit, full E2E, smoke, screenshots, key sheet, docs, tar
- [x] theme.js zones 8–10 = #A6A5E7 / #E8A0BF / #BCD49E; zone-8 pattern = open squares (app.js pattern z===7)
- [x] 10×10 at ≤400px: viewport-wide slim frame (crates-v43.css, pond-wrap data-n; layout.boardMetrics models it) → 33.00 px at 360 (gap 2), 35.14 px at 412 unchanged; ≤9×9 unchanged; boss-29 spec now asserts ≥33 px + 1 px margins
- [x] unit test added (v43-build.test.js, 18 tests); cache bumped capydoku-v4.3-d6241c6a1673
- [ ] full E2E try3 running → reports/v4.3/e2e-build-try3.log
- [x] try3 stopped at 85/346 for the rev b steering (Home grid removal etc.); superseded

## v4.3 rev b (steering Nov 15 13:04 ET, Sebastián via Producer)
- [x] 1 Home grid removed: launch → current pond transition (or resume in-progress pond); flow pond → summary → transition → next
- [x] 2 Daily = secondary button on transition; Hot Spring + Settings in minimal nav/header; no Home/map tab
- [x] 3 Replay only in Settings › Progress list (pond, size, lilies, Replay); all other replay entry points removed
- [x] 4 saves untouched
- [x] 5 greens → CSS custom properties in one theme block (current values)
- [ ] tests: retire Home-tile tests, add launch flow / Daily from transition / replay from Progress / no-grid-reference E2E; key contact sheet
- [x] app.js hub/launch (sessionStorage "capydoku.hub"), header icons (visuals-v4 navHTML), replay list in Progress, solved Replay chip + bonus replay removed, dead CSS pruned, hub CSS (home-v41.css)
- [x] fix: hub can open on a crate pond → app awaits crate-levels.json before first render (par/thumbnail were missing)
- [x] pond-wrap data-level; tests/legacy-ui.js openPond()/replayFromProgress(); specs rewritten off [data-pond]/.home/Home tab/Replay chip
- [x] retired+replaced: v4 boss tiles, design-latest tiles, starters pond list, rewards continue-card, v41-flow home/continue, v43-crates Home roles
- [x] cache capydoku-v4.3-6d776c510bd3 (will re-bump at the end)
- [x] iter1/iter2 412-only triage; new tests/v43-revb.spec.js (launch, resume, flow, Daily ×3, Progress replay, Hot Spring, 5 hub variants, no-grid source+DOM check, theme, capy ⇄, WCAG AA)

## Fresh Leaf (steering Nov 15 13:26 ET: Sebastián picked green A)
- [x] relayed values == report (hand-off note + options.json A); also lip #A8B18A→#89A986 and frame edge #588156 from the report
- [x] theme block: --green-300 #418042, -400/-450/-500 #4B904C, -550 #29612C, -600 #3B7E3D, -700 #2C6C2F, --green-lip, --green-soft #D5E8D2, --ink-header #314E2F, --ink-sub #546F52, --board-frame #71946E, --board-frame-edge #588156
- [x] scripts/recolor-fresh-leaf.py (Designer's recolor rules) → 91 secondary greens, identical to the Designer's A mapping for all 91 (other 31 of their 122 were in pruned Home CSS or already theme vars); log reports/v4.3/fresh-leaf-mapping.json
- [x] primary: inset highlight + :active = --green-700
- [x] AA: 15 sub-AA small-text greens (pre-existing, 3.2–4.47) → var(--ink-sub); v43-revb AA test green at both widths
- [x] hub restyled to home-start-A: wordmark + lily chip, round Settings, capy ⇄, ▶ primary, Daily + Hot Spring tiles (label kept "Start/Continue pond N", mock says "Play")
- [x] test seeds write storage from /levels.json (a resumed game would otherwise overwrite seeded saves on reload)
- [x] cache capydoku-v4.3-db525bbdf52e; unit 174/174 (unit-revb.log)
- [x] try1 stopped (stale code); seeds now leaveGame()+settleSeed() nonce (a resumed game page's late save could land on top of a seed); upgrade specs accept old .home/tiles; ▶ via CSS ::before (alt "")
- [x] secondary-green visual check: /tmp/flcheck/ba.png (before/after 7 screens) — coherent, zones unchanged
- [x] cache capydoku-v4.3-afc779b86c67
- [ ] (14:17 ET resume) full E2E revb-try2 running → reports/v4.3/e2e-revb-try2.log; so far design-latest Bloom + v4 tutorial fails → rerun after

## 14:28–14:45 ET — wrong-capy rule (Producer decision after Sebastián's live v4.2 pond 23 report)
- E2E try2 stopped (188 passed / 3 failed) because the rule change invalidates it.
- core.move: a capy outside the unique solution is rejected (cells unchanged, −1 orange unless Nap, `rejected:i`); core.dropWrongCapys repairs old saves on resume.
- powers.attemptMove: rejected = mistake (also under Nap), spare absorbs, lastMistake set when an orange is lost; transient flag cleared.
- app.js: mistake buzz, red shake ghost (~0.45 s, reduced-motion fade), no Undo step; Clear conflicts UI/action removed (helper kept, unused).
- Copy: rules sheet "Wrong spot?" line, tutorial final-step note, Nap/Second chance first-use + notices. Approved v6.1 Bloom phrase kept.
- Tests: tests/v43-wrongcapy.test.js (8, incl. exact v4.2 pond 23 position), tests/v43-wrongcapy.spec.js (9), old unit tests rewritten; unit 181/181.
- Cache capydoku-v4.3-e6d18440f44c. Full E2E try3 running → reports/v4.3/e2e-revb-try3.log

## 15:18 ET resume — scope checklist (all of v4.3 rev b)
- [x] 1 colour-blind zones: z8 #A6A5E7 (open squares), z9 #E8A0BF, z10 #BCD49E
- [x] 2 10×10 cells 33.00 px @360, 35.14 @412
- [x] 3 no level screen: hub launch/resume, Daily on hub, minimal nav, replay only in Settings › Progress, saves untouched
- [x] 4 Fresh Leaf vars + secondary greens + AA
- [~] 5 wrong-capy rule: code + unit + new spec done; old E2E specs being adapted (try3 stopped at 142; try4-412: 192 passed / 7 failed)
- [ ] cache bump, unit, full E2E both widths (bg, logs), flake reruns, v4.3 spec rerun, smoke (package --verify), key contact sheet, ROUND, KNOWN-ISSUES, TEST-SUMMARY, tar
- [x] 15:20–15:45 ET: try4-412 fails fixed (hotfix offline step off Clear conflicts, v2 solve-buzz poll, v43 locked-conflict test → rejection test, settleSeed works for extra browser contexts, leaveGame tap timeout, stale :8895 server killed); unit 181/181; cache capydoku-v4.3-e6d18440f44c (unchanged: only tests changed)
- [ ] full E2E both widths → reports/v4.3/e2e-revb-final.log (bg)
- note: Sebastián's screenshot b584c6e4….jpg is not on the box (searched /home/box, /workspace, /tmp); pond 23 position rebuilt from app-v4.2.1-backup levels.json — locks 0,9,19,22 + wrong r6c4/r7c7 is the only set matching the description (zone 6 dead)
- [x] full E2E both widths done (15:25–15:51 ET): 396 passed / 2 failed (412: v41-flow rocks 58 s, v43-revb WCAG 45.5 s) → reports/v4.3/e2e-revb-final.log; rerunning failures
- [x] flake rerun: both pass (1× + 3× repeat, 8/8) → reports/v4.3/e2e-revb-final-rerun.log
- [x] v4.3 specs rerun (v43-crates, upgrade-v43, v43, v43-revb, v43-wrongcapy) both widths: 104/104 → reports/v4.3/e2e-revb-v43-specs.log
- [x] final cache bump: capydoku-v4.3-e6d18440f44c (105 URLs; runtime unchanged since 14:45 bump)
- [x] key contact sheet: reports/contact-sheet-v4.3-key.png (84 shots incl. wrong-capy shake, v4.2 pond 23 after rejects, rules 'Wrong spot?')
- [x] unit 181/181 (reports/v4.3/unit-revb-final.log)
- [x] tar + smoke (package --verify): /workspace/capydoku/capydoku-v4.3-runtime.tar.gz, 108 files, 12,192,076 B, sha256 4d5cb5fd2365f164f67294a49e51f28155f18bf33ca7385f3d9839ce1d3adb16; smoke 105/105 online + offline, 0 errors
- [x] ROUND-v4.3.md, KNOWN-ISSUES.md (packaged copy final), TEST-SUMMARY-v4.3.json updated
- [x] v4.3 rev b DONE (16:20 ET). Not published.
