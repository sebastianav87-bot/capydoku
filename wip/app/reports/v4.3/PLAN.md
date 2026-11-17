# Capydoku v4.3 — PLAN (phase 1, for Sebastián's confirmation)

Base: live v4.2 (commit c202415, cache `capydoku-v4.2-3c7ece12bb6d`). Nothing in this plan (items 1–2) is implemented yet.
Items 3–4 (haptics, adjacency bug) are DONE locally as build **v4.2.1** (`capydoku-v4.2.1-bc0fb084a94b`), see the end of this file.
All numbers below were measured on the box on Nov 15, 2026 (ET), not estimated.

## 1. Layout decision: crate every 5th pond, boss moves to the pond before the world-gate crate

```
World 1  Meadow   1  2  3  4  [C1]  6  7  8  B9  [C2]
World 2  Grove   11b 12 13 14 [C3] 16 17 18 B19 [C4]
World 3  Rocks   21b 22 23 24 [C5] 26 27 28 B29 [C6]
            b = breather (first pond of a world, easier than the boss before it)   B = boss   [Cn] = crate level
```

**Chosen: bosses at 9 / 19 / 29, crate levels at 5, 10, 15, 20, 25, 30 (10/20/30 = world gates).**
Why this one (vs. "the crate level IS the boss"):
- The boss stays what it is today: the hardest logic board of the world, with the Golden lily (pure solve, no power). A crate level can't carry "no power used" and has no oranges, so turning it into the boss would drop the Golden lily or need new rules.
- Every world still ends on something special: the boss and then a bigger crate level as the gate. The "spring grew!" reward (lanterns, etc.) moves to clearing the gate (10/20/30), so the world finish feels the same.
- It changes the fewest rules: 24 logic ponds keep oranges, powers, 3 lilies; 6 crate ponds use their own rules (below). Golden lilies remap 10→9, 20→19, 30→29 with no loss.
- Rejected: crate at 10/20/30 replacing the boss (loses the Golden lily or needs a "crate boss" ruleset), and shifting crates off the multiples of 5 (breaks the "5th, 10th…" rhythm Sebastián asked for).

## 2. Pond table (all 30)

Score = the existing deduction-technique scorer (`difficulty.js`, same formula as v4.1). "Dry-run pick" = the board the generator pool already has for that slot today (`scripts/plan-pick-v43.mjs` → `reports/v4.3/feasibility/plan-pick-dryrun.json`); every picked board passed the no-guess proof AND the independent uniqueness check.

| Pond | World | Role | Size | Rocks | Target score | Dry-run pick | Boards in pool within ±10% |
|---:|:--:|---|:--:|:--:|---:|---:|---:|
| 1 | 1 | normal (tutorial board) | 7×7 | 0 | 55 | 55 | 3 |
| 2 | 1 | normal | 7×7 | 0 | 110 | 116 | 12 |
| 3 | 1 | normal | 7×7 | 0 | 150 | 151 | 27 |
| 4 | 1 | normal | 7×7 | 0 | 210 | 209 | 68 |
| 5 | 1 | **crate C1** | 7×7 | – | – | – | – |
| 6 | 1 | normal | 8×8 | 0 | 260 | 259 | 32 |
| 7 | 1 | normal | 8×8 | 0 | 320 | 320 | 49 |
| 8 | 1 | normal | 8×8 | 0 | 380 | 380 | 50 |
| 9 | 1 | **BOSS** | 8×8 | 0 | 450 | 451 | 85 |
| 10 | 1 | **crate C2 (gate)** | 6×6 | – | – | – | – |
| 11 | 2 | breather | 8×8 | 0 | 250 | 253 | 25 |
| 12 | 2 | normal | 8×8 | 0 | 350 | 351 | 49 |
| 13 | 2 | normal | 8×8 | 0 | 420 | 420 | 67 |
| 14 | 2 | normal | 9×9 | 0 | 480 | 481 | 53 |
| 15 | 2 | **crate C3** | 7×7 | – | – | – | – |
| 16 | 2 | normal | 9×9 | 0 | 530 | 529 | 46 |
| 17 | 2 | normal | 9×9 | 0 | 590 | 594 | 42 |
| 18 | 2 | normal | 9×9 | 0 | 650 | 650 | 48 |
| 19 | 2 | **BOSS** | 9×9 | 0 | 720 | 720 | 48 |
| 20 | 2 | **crate C4 (gate)** | 7×7 | – | – | – | – |
| 21 | 3 | breather (rocks start) | 9×9 | 2 | 450 | 447 | 28 |
| 22 | 3 | normal | 9×9 | 2 | 560 | 559 | 58 |
| 23 | 3 | normal | 9×9 | 2 | 640 | 639 | 52 |
| 24 | 3 | normal | 9×9 | 2 | 720 | 714 | 51 |
| 25 | 3 | **crate C5** | 8×8 | – | – | – | – |
| 26 | 3 | normal | 9×9 | 2 | 780 | 778 | 50 |
| 27 | 3 | normal | 9×9 | 2 | 840 | 844 | 48 |
| 28 | 3 | normal | 9×9 | 2 | 900 | 901 | 29 |
| 29 | 3 | **BOSS** | 9×9 (10×10 optional) | 2 | 1000 | 1020 | 12 |
| 30 | 3 | **crate C6 (finale gate)** | 8×8 | – | – | – | – |

Ramp rules kept: scores rise inside each world, each world opens with a breather below the previous boss (11: 250 < boss 9: 450; 21: 450 < boss 19: 720), and each world starts higher than the last (worlds: 55→450, 250→720, 450→1000). For comparison, live v4.2 runs 10→279, 52→399, 156→600 on 5×5–7×7.
Rocks: world 3 only, as now (pool measured with 2 rocks; phase 2 also generates 1- and 3-rock pools to vary them).

### Size cap: 9×9 recommended, 10×10 only as an option for boss 29
Cell size (current sizing mode B, measured with `layout.js boardMetrics`):

| Size | 412-px phone | 360-px phone |
|---|---:|---:|
| 7×7 | 51.5 px | 44.3 px |
| 8×8 | 44.7 px | 38.4 px |
| 9×9 | 39.4 px | 33.8 px |
| 10×10 | 35.2 px | 30.1 px |

Today every board keeps ≥44-px targets. 8×8 and 9×9 go below that on small phones. Smaller cells mean more mis-taps, which is the kind of "capy where I didn't mean it" Sebastián just reported. So the cap is 9×9. 10×10 generates fine (see below), so boss 29 can be 10×10 if Sebastián wants a bigger finale. The 1.5-s flight/landing animation already scales with n.

## 3. Feasibility (measured)

The v4.1 generator (random zones + no-guess proof + uniqueness), ported to JS (`scripts/feasibility-v43.mjs`), 180 s per size:

| Size | Candidates tried | Valid boards | Valid/s |
|---|---:|---:|---:|
| 7×7 | 553,732 | 596 | 3.3 |
| 8×8 | 373,288 | 24 | 0.13 |
| 9×9 | 259,398 | **0** | 0 |
| 10×10 | 203,742 | **0** | 0 |

So the old method can't make 9×9+. A new **local-search generator** (`scripts/climb-v43.mjs`) fixes that. It plants a valid capy layout, grows the zones, then moves single border cells between zones while the no-guess proof gets further. A board is accepted only if `core.logic` proves all capys with no guessing AND `core.enumerate` finds exactly one solution. 150 s per size:

| Size | Rocks | Boards/min | s/board | Score min / p10 / median / p90 / max |
|---|:--:|---:|---:|---|
| 7×7 | 0 | 513 | 0.12 | 10 / 209 / 430 / 694 / 1042 |
| 8×8 | 0 | 223 | 0.27 | 10 / 272 / 543 / 796 / 1060 |
| 8×8 | 1 | 214 | 0.28 | 10 / 278 / 526 / 801 / 1204 |
| 9×9 | 0 | 87 | 0.69 | 110 / 352 / 568 / 821 / 1287 |
| 9×9 | 2 | 98 | 0.61 | 78 / 317 / 586 / 860 / 1363 |
| 10×10 | 0 | 48 | 1.25 | 116 / 428 / 704 / 1014 / 1240 |
| 10×10 | 2 | 44 | 1.35 | 250 / 400 / 636 / 899 / 1206 |

Conclusion: every target in the table is reachable. 28 of the 30 slots were already within ±1% (pond 2 is +5.5%, boss 29 is +2%) from 2.5-minute pools. A full phase-2 build (pools of ~10 min per size) takes about 1 hour of background CPU. The one thin spot is **very gentle** big boards: 7×7 below ~50 is rare and 9×9 never goes below ~80. That's why pond 1 targets 55 (gentle, but not the trivial "only singles" boards of today's ponds 1–5).

## 4. Crate ramp (6 levels, 3 crates / 3 fruit each, same art & controls)

**Updated Nov 15 (build): the Designer's review is applied** (`mockup/boxworld-concept/v4.3-review/`, review.md + crate-ramp-edited.json). C1, C3 and C5 were edited, C6 was replaced, and C2/C4 keep their live layouts (only their par changed). Every level was re-verified with the Designer's solver (`scripts/verify-crate-levels-v43.py`, read-only → `reports/v4.3/crate-levels-solver-v43.json`); the deadlock audit shows 0 false positives on all 6 (`reports/v4.3/deadlock-audit-v43.json`); the Designer's `tools/analyze.py` re-run on the shipped `crate-levels.json` matches the review (`reports/v4.3/crate-analysis-final.json`). The crates.js hint rules are unchanged.

**One par rule everywhere: par = optimal moves × 1.45, rounded to the nearest 5** (integer form `(moves*29+50)//100*5`), in the build script, the verifier, the migration (`LEGACY_CRATES`: Crate Cove 3 → 45, Crate Cove 5 → 85) and the tests. It replaces the v4.2 ×4/3-rounded-up rule.

| Slot | Pond | Board | Rocks | Optimal moves | Pushes (in move-optimal) | Optimal pushes | Par | Silent trap rate | Source |
|---|---:|:--:|---:|---:|---:|---:|---:|---:|---|
| C1 | 5 | 7x7 | 4 | 26 | 9 | 9 | 40 | 0% | Designer edit of the draft |
| C2 | 10 | 6x6 | 6 | 30 | 13 | 13 | 45 | 9.6% | live Crate Cove 3 (layout kept) |
| C3 | 15 | 7x7 | 6 | 39 | 17 | 17 | 55 | 0.7% | Designer edit of the draft |
| C4 | 20 | 7x7 | 7 | 57 | 22 | 20 | 85 | 1.9% | live Crate Cove 5 (layout kept) |
| C5 | 25 | 8x8 | 8 | 66 | 25 | 23 | 95 | 0.8% | Designer edit (8 rocks instead of 16) |
| C6 | 30 | 8x8 | 11 | 80 | 28 | 26 | 115 | 0.8% | Designer replacement (was 98 / 47) |

Optimal pushes now ramp 9 → 13 → 17 → 20 → 23 → 26. The superseded drafts stay in `crate-ramp-draft.json` for the record.

The ramp is driven by moves and pushes, not board size. C2 stays the Designer's approved 6×6 level and C4 is the live Crate Cove 5. The live 5×5 Crate Cove 1 is retired from the main path because Sebastián wants nothing that small. Its v4.2 best score is kept in the save (see migration).

## 5. Crate-level lilies (3, same as a logic pond, so the 90-lily total stays)

| Lily | Logic pond (unchanged) | Crate pond (new) |
|---|---|---|
| 1 | Cleared | **Packed**: all 3 fruit in crates |
| 2 | No mistakes | **Clean run**: no Undo and no Restart in the winning attempt |
| 3 | Under target time | **Par**: optimal-ish, ≤ par moves (Undo allowed) |

- They reuse the existing lily slots (`cleared`/`noMistakes`/`underTarget`), so storage, Hot Spring counts and replay all just work.
- Crate ponds have no oranges, powers or timer. Undo, Restart and the deadlock hint stay.
- Because the level is now mandatory, getting stuck can't block the game: after 3 Restarts a **"Show me"** button replays the stored solution. That clears the pond with lily 1 only, and the player can replay later for lilies 2–3. No skip button. *(Confirmed by Sebastián, Nov 15: mandatory crate levels and "Show me" stay.)*

## 6. What replaces the +1 orange

**Keep the spare orange, but earn it with the Par lily.** Clearing a crate pond at ≤ par moves gives the spare orange for the next pond (6, 11, 16, 21, 26). The rules are the same as v4.2: used first, the mistake still counts, no stacking, it doesn't carry past that pond, Undo and Second chance don't refund it. Since every player now plays every crate level, a free orange each time would make ponds 6/11/16/21/26 easier for everyone. Tying it to par keeps it a reward. Pond 30 has no next pond, so it gives the finale celebration (the spring grows) instead.

## 7. Save migration (never loses a lily)

Storage stays `capydoku.progress.v3` (schema 3). One additive field `layout: 2` marks a migrated save, so the migration runs exactly once. If the app is rolled back to v4.2, it still reads completed ponds and lilies. Two things would be lost on rollback: Golden lilies on 9/19/29 (v4.2 only accepts 10/20/30) and 8×8+ partial boards.

1. **completed / lilies: kept by pond id, nothing deleted.** Ids 1–30 keep their records. For the 6 ids that become crate ponds (5, 10, 15, 20, 25, 30), the old logic pond's lilies stay on that id and count as that crate pond's lilies (lily slot n → crate lily n). Total lilies after ≥ before, by construction.
2. **Golden lilies** move 10→9, 20→19, 30→29 (same count).
3. **v4.2 crate bonus**: Crate Cove 3 → pond 10 and Crate Cove 5 → pond 20 (same levels). Their "solved" status marks those ponds cleared and keeps the best moves. Lilies are added only if the best qualifies (≤ par → Par lily). The v4.2 bonus never recorded Undo use, so no Clean-run lily from history. Crate Cove 1's best is kept in `bonus.legacy`. A pending spare orange (`forPond` 6/16/26) is kept, since those are still "pond after a crate".
4. **Progress frontier** stays the first uncleared id, so nobody is sent back. Players resume where they were, on the new bigger boards.
5. **Half-played boards**: every logic board changes, so partial sessions are dropped once with the existing "Ponds refreshed" note. That's the same mechanism as v4.1, and sessions hold no lilies. `sanitize` accepts 64/81/100-cell sessions.
6. **Daily**: Daily lilies and streak are untouched. The Daily pool should move to 7×7/8×8 (about 2 minutes to generate 365 + 365 safe boards).
7. Phase-2 tests: 2,000 fuzzed v4.2 saves → total lilies never drop, Golden count kept, completed ids keep every old id, migration is idempotent, and a v4.2 rollback reads the migrated save.

## 8. Other phase-2 changes this implies
- Lily target time per size (`GAME_CONFIG.lilyTargetMs`), proposed 8×8 6:00, 9×9 7:30, 10×10 9:30 (scaled by cell count from 7×7 4:30), then tuned after playtesting.
- Labels and rewards: "Boss Pond" on 9/19/29, "Crate Pond" tiles on Home, a transition screen for "next is a crate pond", and spring growth on the gates. All `% 10 === 0` boss checks (8 in `app.js`, 1 each in `core.js`/`powers.js`) move to a single `ROLE` table.
- The v4.2 optional bonus offer is removed (the crate is now the next pond).
- E2E at 412 and 360 for 8×8/9×9 tap accuracy (no clipping, cells ≥33 px), plus a full crate-pond flow and the migration.

## 9. Items 3 and 4 — done locally (v4.2.1, not published)
See `PROGRESS.md`, `KNOWN-ISSUES.md`, `tests/v43.test.js`, `tests/v43.spec.js`.

**Root cause (item 4).** Fuzzing the pure game layer (`reports/v4.3/dev/fuzz-adjacency.mjs`) showed every path stays correct except **Undo**. That covers place, clear, mark, Clear conflicts, Peek/Second chance/Nap, rocks, diagonals and locks. On v4.2, about 3% of random games got a capy touching another with no orange lost; after the fix it's 0.
- **A, Undo "phantom boards"** (`powers.js undoAttempt`). Undo keeps locked (proven) capys but restores the older board around them. A wrong capy the player had removed came back right next to a capy that was locked *later*. Examples: (wrong capy → remove it → correct capy next to it → Undo), or (clash → Second chance → Undo).
  - Fix: a restored unlocked capy that touches a lock the snapshot didn't have stays cleared.
- **B, late tap delivered twice** (`app.js`, the v4.1 dropped-tap fallback). The code remembered only the last touch. If a phone delivered tap A's click after tap B's touch ended, A was delivered twice, which reads as a double-tap. The result was an unintended capy on a cell the player only meant to mark ×, typically next to a capy.
  - Fix: every touch is one tap, delivered exactly once, matched by pointerId (or by cell for engines whose clicks have no pointerId).
- Also fixed: a click without pointerId threw an error in v4.2. A locked capy in a conflict now shows the red ring (the gold glow used to hide it).

**Haptics (item 3).** markX 30→50, clearTap 26→42, dragTick 22→34, correct 70→110, mistake [110,80,110]→[170,90,170], solve [90,60,120,60,220]→[130,70,180,70,320], landing 40→65, locked 18→30, cratePush 24→38, crateLand [40,50,140]→[65,60,210]. Shapes and the 70-ms drag throttle are kept, every pattern is still distinct, drag ticks still fit the throttle, and landings still fit the 100-ms stagger.

**Build.** v4.2.1, cache `capydoku-v4.2.1-bc0fb084a94b`, tar `/workspace/capydoku/capydoku-v4.2.1-runtime.tar.gz` (106 files, sha256 caf263f0…6c06, extracted and smoke-tested on localhost).
