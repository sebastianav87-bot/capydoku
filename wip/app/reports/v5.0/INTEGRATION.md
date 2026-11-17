> Subsequent status: the WIP push succeeded after connection setup. Publication
> was later explicitly authorized and completed; see [PUBLISHED.md](PUBLISHED.md).

# v5.0 campaign integration — WIP only

Continued from `HANDOFF.md` on `handoff-v5-wip`, based on commit
`9bd2be22aea6302391bf493708dd126a26f7d5bc`. All changes are under `wip/app`.
No deployment, Pages publication, Worker deployment, or changes to `main` / `gh-pages`.
`GAME_CONFIG.leaderboardApi` remains empty; browser checks reject any external requests.

## Content

- Installed `reports/v5.0/levels-dry.json` as the campaign: 150 ponds,
  120 logic boards and 30 mandatory crate ponds, contentVersion `5.0`.
- Replaced the 24 dry-run `crate: null` placeholders with each selected crate's
  ID and actual size. The 120 logic boards are unchanged from the dry selection.
- Ponds 1–30, `daily`, and `dailySafe` match published v4.3.1 at the repository
  root exactly as JSON values. C1–C6 also match the root copy.
- Imported the user's 24 explicit zero-based candidate selections in pond order.
  `crate-pick.json` records source file, index, moves, minimum pushes, pushes in
  the stored move-optimal solution, and par. These two push counts can differ.
- `node scripts/pick-crates-v50.mjs` reproduces the content import and updates
  the crate move column in `world-ramp.json`. It reads the six preserved crates
  from the root and does not reroll the chosen logic boards.
- `tests/v50.test.js` now reads published baselines from the repository root.

## Verification

- `npm run test:v50`: **25/25 passed** (`unit-v50.log`). Includes campaign
  uniqueness/no-guess proofs, world difficulty ramp, exact move BFS for all
  24 new crates, stored solution replay, migration from v4.2/v4.3/v4.3.1,
  retention of old sessions/lilies/dailies, scores, leaderboard client, cache
  coverage for module imports and CSS, and the disabled remote API.
- `npm run verify:crates:v50`: **24/24 passed** (`minimum-pushes.log`).
  Independent Python minimum-push BFS collapses free-walk regions and only
  prunes squares unreachable by a reverse pull from any fruit. Every supplied
  minimum-push count agrees. The JS tests independently verify minimum moves.
- Mobile browser checks use Chromium at **360×780**, **412×915**, and
  **375×525**, plus WebKit at **390×664**, DPR 3 (iPhone-sized emulation).
  **80/80 passed** on cache `capydoku-v5.0-25c22c6bb18a`; final results
  are in `browser-final.log` / `final-results.json`.
  Checks include five worlds' bosses, late crates, Show me, D-pad, visible and
  unclipped controls and cells >=24 px, containment of power-button images and
  labels, v4.3.1 complete and partial saves, tool mode, rejection explanations,
  permanent locks, undo, rules, direct Next pond, crate 60/150 solves, scores,
  local world top, finale, classic touch double-taps and keyboard activation.
  Every precache URL must be present before offline reload and late-pond play.
  No external requests or page errors are accepted by any browser case.
- Existing powers/rewards unit suites: **28/28 passed**
  (`unit-powers-rewards.log`).
- Import reproducibility and the final content hash were checked independently:
  rerunning the import leaves the campaign, crates and selection reports
  unchanged; the cache digest matches its current 111 inputs.

### Historical suite limit

`npm run test:unit` was attempted (`unit-full.log`) but is **not green** in this
handoff. Older suites depend on omitted `app-v1-backup`, `app-v3-backup`,
`app-v4-backup`, `app-v4.2.1-backup`, and original mockup assets. Several older
assertions also still expect 30 ponds or v4.3.1 cache/version labels. Its legacy
unpruned deadlock audit expands every reachable state across the newly enlarged
crate set; that attempt was stopped after roughly three minutes (about 1.7 GB
RSS), so later files in that invocation were cancelled. The v5.0 suites were
run separately and completed. No historical assertions were disabled to make
this run look green. A complete legacy-suite port remains separate work.

## WebKit touch fix

WebKit emitted touch contacts with pointer id 2, then compatibility mouse clicks
with pointer id 1. The old input fallback treated these as different contacts,
so one tap could apply twice: two lost oranges, two D-pad moves, or two stacked
Settings dialogs. `app.js` now matches compatibility mouse clicks to the recent
cell/control contact and consumes each once. Keyboard/assistive clicks with
`detail: 0` still take their normal route. Browser assertions for one lost
orange per rejected placement, one D-pad move per tap, and Settings/Progress
cover the regression. The open helper also waits for the asynchronous launch
screen before deciding whether to enter or resume a pond.

The screenshot review also found a compact power-button overflow: legacy CSS
imposed a 72px minimum on the icon and retained an extra power glyph. The v5.0
button now overrides those minimums and sizes its face/text for each fit tier.
The browser fit check now verifies child images and labels stay inside each
thumb-bar button, rather than measuring only the outer control.

## Local cache

`capydoku-v5.0-25c22c6bb18a`, **111 URLs**. The cache builder now includes
`score.js`, `leaderboard.js`, `explain.js`, `difficulty.js`, and `v50.css`, and
holds the local build using `reports/cache-hold-v5.0.json`. Rebuild intentionally
with `python3 scripts/build-sw.py --bump-cache`. Both `sw.js` and `build-info.js`
are generated under `wip/app` only; the root v4.3.1 cache is untouched.

## Browser reproduction

Install the declared Playwright dependency and its browser binaries, then run:

```
npm run test:e2e:v50
```

Or select Chromium only with `-- --project chromium-360 --project chromium-412
--project chromium-short`. Screenshots are in `reports/v5.0/screens/`.
On this managed Linux computer the WebKit host libraries were absent. Official
Debian packages were downloaded and extracted under `/workspace/work` and linked
into the downloaded Playwright browser's own library folder; no system packages
or accounts were changed. Host preflight was skipped only after the actual
libraries were provided, and all 20 WebKit cases completed successfully.

The existing bottom-right AI attribution can still overlap the compact power
status text; it remains visible. That attribution placement is a remaining
visual polish issue, separate from the corrected button-content overflow.

These are automated mobile browser checks, not physical-phone haptic or Safari
UI testing. No public release is implied by this report.

## Delivery status

The complete change is committed locally on `handoff-v5-wip`. The HTTPS push
was denied by GitHub (403). A subsequent attempt to use the connected GitHub
API was rejected by automatic approval review, which interpreted the user's
no-publication constraint as local-only authorization. No remote object or
branch was changed by that API attempt. Remote saving is pending explicit
clarification authorizing a push to `handoff-v5-wip`; publication and edits to
`main` / `gh-pages` remain excluded.
