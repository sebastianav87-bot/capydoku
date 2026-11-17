> Subsequently published with explicit approval. See [PUBLISHED.md](PUBLISHED.md)
> for the production commit, public checks and rollback reference.

# Two-phase bosses — v5.0 WIP

Scope: all 15 bosses, ponds 9/19/29/39/49/59/69/79/89/99/109/119/129/139/149.
Based on `handoff-v5-wip` commit `9b01363769b72d26264cbb0537885c5b89699f3c`.
All changes stay in `wip/app`. No publication, Sites deployment, or changes to
`main` / `gh-pages`. Remote leaderboard API remains empty. UI copy is English.
The published site and private preview still run the earlier v5.0 build.

## Experience and checkpoints

- Original boards and rocks are unchanged. Every boss starts with **Phase 1 of 2**.
- On phase-one completion, the next playable state is persisted synchronously
  before the animation starts. The old grid remains visible for a short pause;
  ground holes open and capys sink at 90 ms intervals. One stays and peeks out.
  Dust settles before the region outlines are replaced on the same-sized grid.
- **Phase 2 of 2** starts with one locked, highlighted friend in its old cell,
  new regions, no X marks and three oranges. Rocks remain in place.
- Reduced motion uses a 200 ms static change: the other capys disappear, the
  remaining friend is highlighted and an explicit message announces new regions.
- The splash, lilies, golden lily, score and victory UI occur only after phase 2.
- Reloading during any transition frame resumes phase 2, not the old solved
  grid. Losing/retrying phase 2 also retains its checkpoint. A phase-two replay
  of an already completed boss resumes correctly even if the campaign has
  progressed to another pond.

## Rules, time and rewards

The two boards form one pond, with one power budget. Time/mistakes and power
use remain in the persisted attempt across the phase boundary and every phase-2
retry. Oranges refill to three; Nap charges are carried, never refilled; the
old-board Peek marker is cleared. The fixed friend cannot be marked or undone.

Only active play counts: the transition, menus, hidden page and game-over modal
pause the clock. Both the existing lily target and the existing score target
are doubled for a two-board boss (their earlier, separate calibrations remain).
The score uses final-phase oranges and retains the existing **3150** maximum.
Second chance halves the whole-pond score even when spent before the boundary
or a retry. Best historical scores and earned rewards never decrease.

No-mistakes requires the whole attempt to be clean, including failed phase-2
tries. A golden requires both phases without a power. A persisted `rewarded`
flag prevents re-awarding on a resumed solved phase 2; arrays/award helpers also
remain idempotent. Existing completed bosses retain all their rewards and
scores. Old partial original-board saves resume in phase 1. Replay starts a
fresh two-phase boss once the prior attempt is complete.

## Solver evidence and design

`boss-levels.json` holds 15 second boards. Each keeps the original grid size and
rock positions, has connected regions, has a different answer in at least half
its rows, and designates one cell valid in both phase solutions
(other solution cells may also coincide). Independent row enumeration
proves uniqueness **conditioned on the fixed friend**; `logic()` proves the
remaining board without guessing. No runtime solution tables are shipped.

Difficulty below is the same structural technique score used by the campaign.
Phase-two scores already include the benefit of the fixed clue, and all exceed
phase 1. These scores are solver metrics, not human playtest timings.

| Boss | Fixed friend | Phase 1 | Phase 2 with clue | Decisive witness |
| --- | --- | ---: | ---: | --- |
| 9 | r1c5 | 450 | 675 | row reservation |
| 19 | r4c3 | 720 | 894 | column reservation |
| 29 | r7c6 | 1001 | 1095 | row reservation |
| 39 | r1c9 | 841 | 1081 | column reservation → region 2 |
| 49 | r6c10 | 950 | 1075 | column reservation → region 4 |
| 59 | r7c10 | 1065 | 1155 | row reservation → region 6 |
| 69 | r10c9 | 923 | 1147 | row reservation → region 4 |
| 79 | r10c7 | 1036 | 1139 | column reservation → region 8 |
| 89 | r8c10 | 1138 | 1222 | row reservation → region 2 |
| 99 | r1c5 | 996 | 1188 | column reservation → region 8 + diagonal exclusion |
| 109 | r8c10 | 1153 | 1213 | row reservation → region 1 + diagonal exclusion |
| 119 | r8c10 | 1256 | 1411 | column reservation → region 2 + diagonal exclusion |
| 129 | r10c6 | 1093 | 1158 | row reservation → region 6 + diagonal exclusion |
| 139 | r5c10 | 1229 | 1307 | column reservation → region 6 + diagonal exclusion |
| 149 | r4c8 | 1310 | 1391 | row reservation → region 3 + diagonal exclusion |

`pair-verification.json` gives exact candidate cells, removed cells, linked
region deductions and diagonal witnesses for every pair. In every opening,
the fixed friend removes candidates from the first deduction's house. Early
bosses alternate row/column reservation; middle bosses link that exclusion to
another region; late bosses also have explicit, necessary diagonal-peer
eliminations in their no-guess trace. Full traces are in `design-audit.json`.

The initial seeded generator produced bosses 9–139. The final boss needed a
stronger layout; `refine-boss-phase.mjs` uses the recorded
`refinement-seed.json` and bounded annealing of connected region borders,
keeping its rocks, fixed clue and planted answer. Both generation and refinement
require the same no-guess proof plus independent enumeration. The final
`refined-final.json` is copied into the last entry of `boss-levels.json`.

## Verification and reproduction

- `npm run test:v50`: campaign, migrations, scores, leaderboard, cache and new
  boss unit tests. **32/32 passed** (`unit-v50.log`).
- `npm run test:bosses`: 7 focused unit cases including all 15 solver pairs,
  old saves/rewards, retry histories, Nap charges, targets, score ceiling and
  the active clock. **7/7 passed** (`unit-bosses.log`).
- Existing powers/rewards unit suites: 28/28 (`unit-regression.log`).
- `npm run test:e2e:bosses`: Chromium and WebKit, bosses 9 and 149. Checks both
  phase labels; staggered sinking; fixed friend; changed region colors; no
  phase-one awards/splash; combined score; one reward; reload during change;
  offline reload, loss and retry in phase 2; persistent Second chance penalty;
  reduced motion; and replay/resume of an old completed boss. **14/14 passed**; results:
  `browser-final.log` / `final-results.json`; captures in `screens/`.
- Existing v5.0 mobile browser regression: **79/80** on the first pass.
  One WebKit case (pond 49 fit) reported an initial service-worker access-control
  message during navigation. The case passed on an isolated rerun (**1/1**),
  with all assertions unchanged. Logs: `browser-regression.log` and
  `browser-regression-rerun.log`. No failing case is being hidden by a skip.
- `node scripts/audit-boss-phases.mjs` regenerates the independent pair audit.

Local cache: `capydoku-v5.0-9be5b9e0b436`, 113 URLs, including `bosses.js` and
`boss-levels.json`. Rebuild intentionally with
`python3 scripts/build-sw.py --bump-cache`. Offline continuation in phase 2 is
asserted in browser tests on both engines.

## Real limits

Physical-phone Safari chrome/haptics and subjective difficulty/animation feel
still need human playtesting. Browser checks use mobile Chromium and Linux
WebKit emulation. The prior full historical suite still depends on omitted
backup/mockup fixtures and old version/count assertions; see the previous
integration report. No historical assertion is silently skipped to claim a
fully green legacy suite. Existing compact header truncation and the bottom
AI-attribution overlap remain earlier visual polish issues.
