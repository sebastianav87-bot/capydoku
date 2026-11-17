# Round v4.3.1 — iPhone fit (LOCAL ONLY · not pushed, not published)

**Bug** (Sebastián via The Producer, live v4.3): "En iphone no se ve toda la pantalla de juego de las cajas nivel 10". Real screenshot: `/workspace/capydoku/bug-reports/iphone-crate10-cut.png` (iOS Safari tab, bottom URL bar): Gate Crate Pond 10 board cut at ~4.3 rows, a crate half hidden; "Want a hand?Watch the solution…" unstyled with "Show me" wrapped onto its own line; the lilies card hidden behind the Safari toolbar.

**Repro:** `scripts/iphone-fit.mjs` (Playwright WebKit, iPhone emulation: isMobile, hasTouch, DPR 3, iOS 18 Safari UA). Before at 390×664 (390×844 with the toolbar) shows the same thing as the real screenshot: board clipped at ~4.3 rows, same broken Show-me row. Before: **26/180** states fit.

## Root cause
1. **Boards were sized from the width only.** `.crate-wrap` / the logic `.pond-wrap` take `min(97.2%, board-max)` of the width. The screen is a fixed-height (`100svh`, `overflow:hidden`) flex column, so on a short screen the flex layout squeezed the board's frame. The crate board was clipped inside it, and on logic/boss ponds Undo and the power button were pushed below the visible area.
2. **Regression in v4.3 rev b:** pruning the Home-tile rules left line 1 of `crates-v43.css` as an unterminated comment (`/* v4.3 crate ponds … gate tags{border-color:…}`). It swallowed every rule up to the next `*/`: the whole `.crate-showme` card (flex, padding, border), the gate tag, the transition art, the replay lock, the crate reward and the lilies styling. That is the broken "Want a hand?Watch…" row.

## What changed
- `crates-v43.css`: the comment is closed again, so the Show-me card is a styled flex row again (text left, button right, never wraps).
- **`fit.js` (new, precached)** is driven by a MutationObserver on `#app`, plus resize, orientationchange, visualViewport resize and fonts.ready. On a crate or logic screen it measures how far the content would overflow the screen height with nothing squeezed (`.fit-measure`). Then it goes through tiers:
  1. `natural`: it already fits, nothing changes (360×780 and 412×915 stay as before).
  2. `fit-compact`: smaller title, tags, stats, packed pill, Show-me card, controls (44 px round icons) and lilies card; the crate hint is hidden. On logic ponds: 38 px rule cards, 58 px companion strip, 52 px controls.
  3. `fit-tight`: only if the cell would otherwise drop below 34 px. Crate: the packed pill is hidden and the D-pad rows are 30 px. Logic: the tap hint is hidden, the companion strip is 46 px, and controls are one 52 px row (icon beside label).
  4. `shrunk`: whatever still overflows is taken off the board side. So **cell = min(width-based, height-based)**, with a 24 px floor.
  The zone outlines are redrawn after a resize-driven refit.
- **Viewport height:** `100vh` fallback (`@supports not (height:100svh)`), `100svh`, and `100dvh` where supported. Safe-area padding (`env(safe-area-inset-*)`, viewport-fit=cover) is kept on every screen.
- **Version 4.3.1**, cache **`capydoku-v4.3.1-6bc138e4dee2`** (106 precached URLs, fit.js included). Version literals in 5 unit tests were updated 4.3 → 4.3.1, and `tests/v431.test.js` was added.
- **New E2E** `tests/v431-iphone-fit.spec.js` (project `webkit-iphone`, 119 tests). 9 iPhone sizes/modes (incl. 375×667 and 390×664) × every crate pond (5/10/15/20/25/30, swipe and D-pad, before and after Show me appears) + Boss 29, plus resize refit and outline checks. It asserts no page/screen scroll, every control's bbox inside the visible viewport (minus simulated insets) and unclipped, a side-by-side Show-me row, and cell ≥ 24 px.

## Fit: before → after (states that fit; min cell px before→after; tier used)
Crate ponds have 3 states each (plain, Show me, D-pad + Show me). P29 = boss 10×10, P7 = normal 8×8. "tab" = Safari tab with toolbars (height reduced); "standalone" = home-screen app with simulated safe-area insets (se 20/0, 390 47/34, 393/430 59/34).

| size / mode | P5 | P10 | P15 | P20 | P25 | P30 | P29 | P7 |
|---|---|---|---|---|---|---|---|---|
| se-tab 375×525 | 0/3→**3/3** (46→32px, shrunk) | 0/3→**3/3** (55→37px, shrunk) | 0/3→**3/3** (46→32px, shrunk) | 0/3→**3/3** (46→32px, shrunk) | 0/3→**3/3** (40→28px, shrunk) | 0/3→**3/3** (40→28px, shrunk) | 0/1→**1/1** (34→24px, shrunk) | 0/1→**1/1** (40→27px, shrunk) |
| se-standalone 375×667 | 0/3→**3/3** (46→45px, compact/shrunk) | 0/3→**3/3** (55→53px, compact/shrunk) | 0/3→**3/3** (46→45px, compact/shrunk) | 0/3→**3/3** (46→45px, compact/shrunk) | 0/3→**3/3** (40→39px, compact/shrunk) | 0/3→**3/3** (40→39px, compact/shrunk) | 0/1→**1/1** (34→34px, tight) | 0/1→**1/1** (40→34px, shrunk) |
| 390-tab 390×664 | 0/3→**3/3** (48→47px, compact/shrunk) | 0/3→**3/3** (57→55px, compact/shrunk) | 0/3→**3/3** (48→47px, compact/shrunk) | 0/3→**3/3** (48→47px, compact/shrunk) | 0/3→**3/3** (42→40px, compact/shrunk) | 0/3→**3/3** (42→40px, compact/shrunk) | 0/1→**1/1** (36→36px, tight) | 0/1→**1/1** (42→37px, shrunk) |
| 390-tab-694 390×694 | 0/3→**3/3** (48→49px, compact) | 0/3→**3/3** (57→58px, compact) | 0/3→**3/3** (48→49px, compact) | 0/3→**3/3** (48→49px, compact) | 0/3→**3/3** (42→43px, compact) | 0/3→**3/3** (42→43px, compact) | 0/1→**1/1** (36→34px, shrunk) | 0/1→**1/1** (42→40px, shrunk) |
| 390-standalone 390×844 | 1/3→**3/3** (48→48px, compact/natural) | 1/3→**3/3** (57→57px, compact/natural) | 1/3→**3/3** (48→48px, compact/natural) | 1/3→**3/3** (48→48px, compact/natural) | 1/3→**3/3** (42→42px, compact/natural) | 1/3→**3/3** (42→42px, compact/natural) | 0/1→**1/1** (36→36px, compact) | 0/1→**1/1** (42→42px, compact) |
| 393-tab 393×702 | 0/3→**3/3** (49→50px, compact) | 0/3→**3/3** (58→58px, compact) | 0/3→**3/3** (49→50px, compact) | 0/3→**3/3** (49→50px, compact) | 0/3→**3/3** (42→43px, compact) | 0/3→**3/3** (42→43px, compact) | 0/1→**1/1** (36→35px, shrunk) | 0/1→**1/1** (42→41px, shrunk) |
| 393-standalone 393×852 | 1/3→**3/3** (49→49px, compact/natural) | 1/3→**3/3** (58→58px, compact/natural) | 1/3→**3/3** (49→49px, compact/natural) | 1/3→**3/3** (49→49px, compact/natural) | 1/3→**3/3** (42→42px, compact/natural) | 1/3→**3/3** (42→42px, compact/natural) | 0/1→**1/1** (36→36px, compact) | 0/1→**1/1** (42→42px, compact) |
| 430-tab 430×782 | 1/3→**3/3** (54→54px, compact/natural) | 1/3→**3/3** (64→64px, compact/natural) | 1/3→**3/3** (54→54px, compact/natural) | 1/3→**3/3** (54→54px, compact/natural) | 1/3→**3/3** (47→47px, compact/natural) | 1/3→**3/3** (47→47px, compact/natural) | 1/1→**1/1** (37→37px, compact) | 1/1→**1/1** (47→47px, compact) |
| 430-standalone 430×932 | 1/3→**3/3** (54→54px, compact/natural) | 1/3→**3/3** (64→64px, compact/natural) | 1/3→**3/3** (54→54px, compact/natural) | 1/3→**3/3** (54→54px, compact/natural) | 1/3→**3/3** (47→47px, compact/natural) | 1/3→**3/3** (47→47px, compact/natural) | 0/1→**1/1** (37→37px, compact) | 0/1→**1/1** (47→47px, compact) |

Total: before 26/180 · after 180/180

The before cell sizes for clipped crate boards are nominal: the cells kept their size, but the frame was clipped. The real screenshot shows ~4.3 of 6 rows.

## Artifacts
- Before/after screenshots: `reports/v4.3.1/screens/before/`, `reports/v4.3.1/screens/after/` (126 each; standalone shots shade the simulated inset bands)
- Contact sheet: `reports/contact-sheet-v4.3.1-iphone.png` (the real iPhone screenshot + 10 before/after pairs)
- Measurements: `reports/v4.3.1/fit-before.json`, `reports/v4.3.1/fit-after.json` (+ `.log`)
- Progress: `reports/v4.3.1/PROGRESS.md`

## Emulated / not verified
- **No real iPhone.** Everything is Playwright WebKit (Linux build v2388) with iPhone emulation, not iOS Safari.
- **Safari toolbars** are modelled by shortening the viewport (375×525, 390×664, 390×694, 393×702, 430×782). Real Safari's toolbar collapses on scroll. The app never scrolls, so it should stay expanded, but `dvh` changes (refit on visualViewport resize) are tested only through viewport resizes.
- **iOS 26's floating/translucent bottom toolbar** (the lilies card hidden in the report) can't be reproduced. If iOS lays the page out under the floating bar, the bottom ~40 px could still sit beneath translucent chrome. The mitigation is the svh/dvh height + the safe-area bottom padding.
- **Safe-area insets** are simulated by rewriting `env(safe-area-inset-*)` in the CSS; the notch and the home indicator are not real.
- The D-pad/Show-me states were reached by playing 2 moves and pressing Restart 3×, as a player would. Swipe gestures themselves were not re-tested on iPhone.

## Tests
- **Unit:** 184/184 (`reports/v4.3.1/unit-final.log`). That is 181 existing (5 version literals updated 4.3 → 4.3.1) + 3 new in `tests/v431.test.js` (build/precache/import, no rule-swallowing CSS comments, dvh/svh/vh and tier CSS present).
- **E2E full** (`reports/v4.3.1/e2e-full-try1.log`, 517 tests = Chromium mobile-412 199 + mobile-360 199 + WebKit iPhone 119): first pass 503 passed / 14 failed.
  - 12 of the failures were version-label literals ("Updated to v4.3", "v4.3 · build", `capydoku-v4\.3-`). These were updated to 4.3.1 in updates.spec, upgrade-v43.spec (assertion only; the test title still says v4.2.1 → v4.3), v31-extension.spec and v43-crates.spec.
  - 2 were hangs: v41 strong haptics (412) and v4 tutorial (360). Both pass in isolation in 9 s and 4 s, and neither touches the changed screens' fit.
  - **Rerun** of the 6 affected spec files on both Chromium projects: 22/22 passed (`reports/v4.3.1/e2e-rerun1.log`). Final: **517/517** (WebKit 119/119 on the first pass, also in the standalone run `e2e-webkit-try1.log`).
- **No regression at 360×780 / 412×915.** The sizing, crate, boss and design specs all pass unchanged on Chromium.
- **Package:** `/workspace/capydoku/capydoku-v4.3.1-runtime.tar.gz` (109 files, 12,195,805 bytes), sha256 `a85567b4daef4828e83a268d6c897f82f46ee21849bf1cd56b82235aafe0c224`. Extracted hashes match. Archive-only smoke: 106/106 precached URLs return 200 online and offline, offline reload works, progress persists (`reports/v4.3.1/runtime-archive-smoke-v4.3.1.json`).
