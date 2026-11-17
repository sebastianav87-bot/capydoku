# Capydoku v4.3 round report (rev b): crate ponds in the campaign, no level screen, Fresh Leaf, wrong-capy rule (local only, NOT published)

Confirmed by Sebastián (via The Producer, Nov 15 11:01 ET): fold v4.2.1 into v4.3, use a 9×9 cap with boss 29 at 10×10, and make crate levels plus "Show me" mandatory. The Designer's crate-ramp review was applied at 11:25 ET. Built on the local v4.2.1 (backup `/workspace/capydoku/app-v4.2.1-backup`). Nothing was pushed, published, signed in to or bought.

- **Cache:** `capydoku-v4.3-e6d18440f44c` (105 precached URLs; hold file `reports/cache-hold-v4.3.json`).
- **Runtime:** `/workspace/capydoku/capydoku-v4.3-runtime.tar.gz`, 108 files, 12,192,076 bytes, sha256 `4d5cb5fd2365f164f67294a49e51f28155f18bf33ca7385f3d9839ce1d3adb16`.
  - Smoke test: the archive was extracted and served on its own. 105/105 resources returned 200 online and 105/105 offline. Offline reload, an unseen query and progress persistence all worked, with 0 browser errors (`reports/v4.3/runtime-archive-smoke-v4.3.json`).

## Rev b (Nov 15, Sebastián via The Producer)
1. **Colour-blind zone fixes:** zone 8 #A6A5E7 with open squares, zone 9 #E8A0BF (kept), zone 10 #BCD49E.
2. **10×10 boss cells:** 33.00 px at 360×780, 35.14 px at 412×915 (`reports/v4.3/boss29-fit-*.json`).
3. **No level screen:** launch opens the transition screen (hub) or resumes a pond in progress (sessionStorage `capydoku.hub` keeps a reload on the hub). Daily Pond is a hub tile next to Hot Spring; the header has only the wordmark, lily chip and Settings. Replay lives only in Settings › Progress. Saves are untouched. The solved screen has no Replay chip.
4. **Fresh Leaf greens** (Designer report `mockup/v4.3-green/report.md`, option A) as CSS variables: 300 #418042, 400/450/500 #4B904C, 550 #29612C, 600 #3B7E3D, 700 #2C6C2F, lip #89A986, soft #D5E8D2, ink-header #314E2F, ink-sub #546F52, frame #71946E / edge #588156. 91 secondary greens remapped by `scripts/recolor-fresh-leaf.py` (identical to the Designer's mapping; log `reports/v4.3/fresh-leaf-mapping.json`). Hub styled after home-start-A.
   - **AA:** white on the primary gradient 4.78 (#418042) – 4.96 (#3B7E3D); white on 700 6.38; ink-header on cream 9.12; ink-sub 5.47 on cream / 4.92 on the page background. 16 older small-text greens (3.2–4.47) were moved to ink-sub. The in-browser audit (`v43-revb.spec.js`: hub for ponds 7/9/10/31, Progress, solved summary) finds no small text under 4.5:1 at either width. #4B904C (3.89 with white) is used only for large text and non-text.
5. **Wrong capy = immediate mistake** (after Sebastián's live v4.2 pond 23 report). A capy on any cell outside the unique solution:
   - gets the mistake buzz, costs one orange (the crate spare orange goes first; Nap: no orange), counts as a mistake (No-mistakes lily lost), and is rejected: it shows for ~0.45 s with a red ring and shake, then hops out. The cell keeps what it had (empty or ×). Reduced motion: fade only.
   - Correct capys lock as before and never cost an orange. Only correct capys can be on the board, so a "no legal cell left in a zone" dead end cannot happen. Old saves are repaired on resume (wrong capys dropped, oranges and mistakes unchanged).
   - Rejected moves leave no Undo step; Undo never refunds. **Clear conflicts was removed** (button, message and action); its pure helper stays exported but unused.
   - **Powers:** Peek unchanged (glows one solution cell; a rejected capy does not use it up). Nap: 3 charges; each new capy or × spends one; a wrong capy under Nap is still rejected and still a mistake but costs no orange. Second chance: restores the orange from the last mistake (needs an orange lost and fewer than 3); the mistake still counts.
   - **Lilies:** Pond cleared unchanged; No mistakes is lost by any wrong capy, even under Nap or absorbed by the spare; Under-time unchanged. **Golden lily** (bosses 9/19/29): solve without using the power, mistakes allowed (unchanged). **Daily Pond:** same rule.
   - **Drag** only paints/clears × (never a capy). **Double-tap** is the only way to place a capy, and goes through the rule. The tutorial only allows correct cells.
   - **Copy:** rules sheet line "Wrong spot? The capy hops right back out and costs an orange. Right spots lock in place."; tutorial last step "A capy in the wrong spot hops back out and costs an orange."; Nap card "Your next 3 moves cost no orange. / A wrong capy still hops out and counts as a mistake."; Second chance card "Win back the orange from your last mistake. / The wrong capy already hopped out; the mistake still counts for the lily."; notices "…no orange lost" and "The mistake still counts · the wrong spot stays empty".
   - **Pond 23 regression:** the v4.2 board was rebuilt from `app-v4.2.1-backup/levels.json`. Locks 0, 9, 19, 22 plus wrong capys at r6c4 and r7c7 are the only position matching the report (zone 6 had no legal cell). Unit test + E2E (the v4.2 board served to the app) show both are rejected and the pond finishes. The screenshot file named in the steering was not on the box.

## Content
- **Roles** (`roles.js`):
  - crate ponds 5/10/15/20/25/30;
  - world gates 10/20/30, which grow the Hot Spring;
  - logic bosses 9/19/29, which give the golden lily;
  - breathers 11/21;
  - finale 30.
- **Logic ponds** (`levels.json`, contentVersion 4.3):
  - sizes: 1–4 at 7×7, 6–9 at 8×8, 11–13 at 8×8, 14–28 at 9×9 (rocks from 21), and boss 29 at 10×10 (2 rocks, score 1001);
  - Daily: 365 + 365 boards, 7×7 and 8×8;
  - all 511 unique boards are no-guess and have a unique solution.
- **Crate ponds:**
  - integrated file `/workspace/capydoku/app/crate-levels.json` (sha256 `dee88a6e…538b8b`);
  - rules in `/workspace/capydoku/app/crates.js` (sha256 `37acdb0f…b955f`).
  - They were built from the Designer's `mockup/boxworld-concept/v4.3-review/crate-ramp-edited.json`, which was only read, by `scripts/build-crate-levels-v43.py`.

| Pond | Name | Board | Optimal moves / pushes | Par |
|---|---|---|---|---|
| 5 | Reed Crates (C1, edited) | 7×7 | 26 / 9 | 40 |
| 10 | Reedwater Gate (C2, layout kept) | 6×6 | 30 / 13 | 45 |
| 15 | Bamboo Crates (C3, edited) | 7×7 | 39 / 17 | 55 |
| 20 | Bamboo Gate (C4, layout kept) | 7×7 | 57 / 20 | 85 |
| 25 | Summit Crates (C5, edited) | 8×8 | 66 / 23 | 95 |
| 30 | Cloudwater Finale (C6, replaced) | 8×8 | 80 / 26 | 115 |

- **Par:** one rule everywhere, optimal moves × 1.45 rounded to the nearest 5.
- **Re-verification:**
  - Designer solver: `reports/v4.3/crate-levels-solver-v43.json`;
  - deadlock audit: 0 false alarms (`reports/v4.3/deadlock-audit-v43.json`);
  - `analyze.py` re-run matches the review: `reports/v4.3/crate-analysis-final.json`.
  - The crates.js hint rules were not changed.

## Play
- **Crate lilies:**
  - Packed: solved;
  - Clean run: no Undo or Restart since entering the pond;
  - Par: moves ≤ par.
- **Counting toward 100%:** crate ponds are mandatory, and their lilies count toward the 90-lily total. The finale E2E reaches "All 30 ponds ✓ · 90/90".
- **Show me:** offered after 3 Restarts (a restart counts only once a move has been made). It replays the solution and awards Packed only.
- **Par reward:** +1 spare orange for the next pond. Pond 30 has no orange and gets "The Hot Spring is complete!" instead.
- **Hub and transitions (rev b: there is no Home pond grid any more):**
  - Launch opens the next pond's transition screen (the hub), or resumes a pond in progress. Crate/gate/finale hubs are labelled "Crate pond 5", "World gate", "The finale".
  - Crate transition: thumbnail, lilies and par line.
  - Boss transition: "The crate gate after it grows your Hot Spring".
  - The pond after a crate pond shows "Spare orange ready".
  - The old optional bonus offer is gone.
- **Save migration** (`layout: 2`, runs once):
  - no lily or completion is lost;
  - goldens move 10→9, 20→19 and 30→29 (those bosses count as cleared);
  - Crate Cove 3/5 solves carry over to ponds 10/20, with Par if the old best ≤ the new par;
  - half-played boards whose board changed are dropped once with "Ponds refreshed";
  - unit-tested with v4.1, v4.2 and v4.2.1 saves, plus a fuzz over 400 saves; E2E tested with a real v4.2.1 to v4.3 service-worker upgrade.

## Boss 29 fit (10×10)
- **412×915:** cell 35.14 px, gap 3 px, no scroll, corner taps OK.
- **360×780:** cell 33.00 px (2 px gaps, rev b), no scroll, corner taps OK.
- **Other cells at 360:** 7×7 44.3, 8×8 38.4, 9×9 33.8 px.

## Tests (rev b, final)
- **Unit:** 181/181 (`reports/v4.3/unit-revb-final.log`), incl. 8 new in `tests/v43-wrongcapy.test.js` (exact v4.2 pond 23 position, old-save repair, a 30k-step property test over all v4.3 ponds + 20 Daily Ponds: never a wrong capy on the board, never a dead-end zone; oranges/spare/Nap; powers; lilies/golden).
- **Full E2E** (398 tests, 412×915 + 360×780; `reports/v4.3/e2e-revb-final.log`): **396 passed, 2 failed** on the full run. Both failures were at 412 (v41-flow "rocks: tapping a rock…" 58 s; v43-revb WCAG audit timeout under load). Both passed unchanged on rerun, 1× and 3× repeat, 8/8 (`reports/v4.3/e2e-revb-final-rerun.log`), so they are counted as flaky. **Result: 398/398.**
- **v4.3 specs** (v43-crates, upgrade-v43, v43, v43-revb, v43-wrongcapy) in a separate run at both widths: **104/104** (`reports/v4.3/e2e-revb-v43-specs.log`). New `tests/v43-wrongcapy.spec.js`: 9 tests per width (shake + buzz + orange; × cell; drag; v4.2 pond 23 board served to the app; old-save repair; Nap + spare; Second chance; Daily; rules copy).
- **Smoke:** the extracted archive served on its own: 105/105 resources 200 online and 105/105 offline, offline reload, unseen query and progress persisted, 0 browser errors (`reports/v4.3/runtime-archive-smoke-v4.3.json`).
- Old specs were adapted to rev b; see the KNOWN-ISSUES rev b list.

## Screenshots
- `reports/screenshots-v4.3/` (412) and `360x780/`, plus 462 regression shots in `regression/`.
- Key contact sheet: `reports/contact-sheet-v4.3-key.png` (84 shots: hub variants, Progress replay, Hot Spring, wrong-capy shake, v4.2 pond 23 after rejects, rules).
- Full sheet: `reports/contact-sheet-v4.3.png`.
- Regression sheet: `reports/contact-sheet-v4.3-regression.png`.

## Needs a decision or review
- Zone colours 8–10 are now the Designer's colour-blind fixes (#A6A5E7 with open squares, #E8A0BF, #BCD49E); not yet checked on a real device.
- Boss 29 cells at 360 are 33 px, below the 44 px guideline (approved, but not tried on a real device).
- The hub button keeps "Start/Continue pond N" (the home-start-A mock says "Play pond N"); a one-word change if wanted.
- Second chance keeps its approved v6.1 phrase "Undo mistake, restore one orange"; under the new rule it only restores the orange (the wrong capy is already gone). The first-use card and notice say so; the phrase itself is the Designer's asset.
- The crate ramp has not been playtested. C2 has a 9.6% silent-trap rate.
