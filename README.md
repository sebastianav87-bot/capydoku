# Capydoku · playable local prototype

**Local build only. No publication, repository, account, paid API, analytics or runtime CDN.**

## Run on the box

```sh
cd /workspace/capydoku/app
python3 -m http.server 8765 --bind 127.0.0.1
# Box browser: http://127.0.0.1:8765/
```

A local preview server is already running on that address at handoff. This is the box's localhost, not a server on a registered computer. Any simple static server works. Do not open index.html as file:// (modules and service workers require HTTP). No build step or npm dependency is needed to play. Service workers require localhost or HTTPS; no public hosting was configured.

## Play

- One capy per row, column and patterned/color zone. No touching, including diagonals. Rocks are blocked.
- Single tap: empty → ×; tap × again to clear. **Double tap (within 280 ms, same cell): empty/× → capy.** Tap a capy to clear. A first tap waits 280 ms before committing: there is no transient × or clear during a double tap. Tapping a different cell commits the previous single tap. Undo/Hint/navigation cancels any still-pending tap.
- Keyboard Enter/Space performs a single tap; a mouse double-click also places. No hover is needed.
- Undo restores the previous board, **not spent oranges**. This avoids bypassing the lives rule. Undo history is session-local (up to 100 actions); board, oranges and mode survive reload.
- A new capy conflicting with another costs one orange, regardless of number of conflicts. Both/all offending capys are red with an **!** indicator. Marks/clears cost nothing. A wrong *but locally legal* capy is not silently compared to a solution.
- At zero oranges, retry or retry in Chill. Chill has no lives limit, keeps the conflict indicators, and never spends oranges. Turning Chill off uses the same saved orange count; it never refills lives.
- Hint changes **no board state**. It highlights a single logically forced cell, supporting candidates and ruled-out spots. It never renders a full solution or places a capy. It refuses a nudge if a complete monotone proof cannot support the current partial layout. Conflicts get a repair highlight instead.

## Content and progress

- 30 distinct connected-zone puzzles: 5×5 at 1–8, 6×6 at 9–20, 7×7 at 21–30. Rocks start at 21. Sizes + sorted logical proof effort provide a heuristic ramp (not human-tested balance).
- Boss 10/20/30 use the same rules and unlock **Beanie / Orange / Duck**. Classic is available initially. Select an unlocked capy in Hot Spring to use it on the board.
- Daily Pond uses the **local calendar date**, a generated 365-board bank, and deterministic dihedral transforms for successive cycles. 365 consecutive dates (2026-01-01…2026-12-31) were checked with independent enumeration and no-guessing logic. This is a finite bank, not a claim of endlessly novel boards. Daily can contain a 7×7/rock puzzle regardless of campaign progress.
- A daily session keeps its displayed date if midnight passes. Completing the same date twice never advances a streak; consecutive calendar dates increment it, missed dates reset it, clock backdating does not add credit. Changing devices/browser data does not synchronize progress.
- localStorage key: `capydoku.progress.v1`. Validated schema, bounded sessions, safe fallbacks for corrupt/unavailable storage. Unknown/future schemas are **read-only**, never overwritten. Browser data clearing removes progress. No account or server is involved.

## Verification and tests

```sh
# Re-generate ALL content and exhaustive reports (~140 seconds here)
python3 scripts/generate.py
python3 scripts/build-sw.py       # content-hash cache; rerun after any runtime edit

# Test dependencies only, not needed to play
npm ci
npx playwright install chromium
npm run test:unit
npm run test:e2e                 # starts/reuses localhost:8765
python3 scripts/contact-sheet.py # requires Pillow, already available on this box
```

- `reports/verification.json` + `.md`: count=1, logic flag, size, rock cells/count, techniques and proof effort for every campaign board and 365 daily source dates.
- `scripts/generate.py`: seeded connected region growth, proof filtering and independent **all-permutation oracle**. It loads the supplied mockup's enumerator without calling its file-writing main; agrees on its unique solution. Mockup is unchanged.
- `core.js`: separate JS row-by-row backtracker independently cross-checks all 395 boards. Unit tests verify every logical forced cell/elimination against that oracle, daily transformations, storage, rules and generation repeatability.
- Deduction set: **house-single** and **shared-conflict**. A house is a row/column/zone; it needs one capy. The only remaining cell is forced. A cell conflicting with *every* candidate of a house is excluded. This covers locked row/zone intersections and common-neighbor spacing. Iterative elimination only: no guessing, recursive trial or uniqueness-as-a-deduction.
- Playwright: 412×915 CSS viewport, device scale 1, mobile + actual touch input, America/New_York, Chromium. Browser errors are asserted absent in **each** test; console logs are not suppressed.
- Real `context.setOffline(true)` test after SW control: navigator.onLine=false, reload, unvisited query navigation, essential resources, saved state, all success. Update checks may fail normally while offline and are caught separately from cached game requests.
- `reports/precache-status.json`: all 24 precached URLs return 200. Atomic install, content-hashed cache, old Capydoku caches retired at activation, no stale-cache fallback for updated resources. App navigation with arbitrary query parameters uses cached index.html.
- `reports/unit.log`, `reports/e2e.log`, `reports/playwright.json`, `reports/playwright-html/index.html`, `reports/offline.json`, `reports/test-summary.json`.

## Screenshots and visual review

`reports/screenshots/`: 14 real browser PNGs, each **412×915**, numbered 01–14. Includes Pond Path, progress, forced hint, red violation + spent orange, game over, Chill, boss, three timed jump frames, Daily, collection, 7×7 rocks and offline play. `reports/contact-sheet.png` puts them together. Boss screenshots use documented seeded progress fixtures (1–9/1–29 complete); the boss itself is actually played/solved. Daily screenshot uses a fixed test date for repeatability. Screens are not mockup compositing.

All final screenshots were inspected. The duplicated source capys during the first jump implementation were fixed: each capy leaves a subtle cleared check in its cell and arrives in the spring. No clipping/overlap observed at the target viewport. See `reports/visual-review.md`.

## Design correspondence and deviations

Uses supplied v2 artwork, **exact A–F dusty palette**, six redundant patterns and **true 5 CSS-px clipped SVG zone boundaries**, matching pond frame, backgrounds, fruit oranges, lower reed strip and spring. Nunito is vendored with its full OFL license (`assets/Nunito-OFL.txt`); runtime is dependency-free DOM/CSS/JS.

Functional differences from a static illustration: real initial progress (Pond 1, zero streak), scrollable 30-node map with a connecting path, four real collectible capys rather than decorative unearned items, undo/retry/settings/hints, and interactive animated cleared boards. A seventh taupe/chevron zone is added for 7×7; it has not had a clinical color-vision test. No changes were made to `/workspace/capydoku/mockup/v2/`.

See **KNOWN-ISSUES.md** for unverified device/install and difficulty limitations.
