# Capydoku v3 — test summary

Final full run started **2026-11-09 20:37:43 EST (America/New_York)**. Local only; no publication / push / repository / account / spend.

| Check | Result |
|--|--|
| `npm run test:unit` | **56/56 pass**, 0 skipped / failures |
| `npm run test:e2e` | **44/44 pass**, 0 skipped / retries / flaky / failures; 80.08s |
| Browser console/page errors | **0**, asserted after every mobile test |
| Target | Chromium, mobile + touch, **412×915 CSS px**, scale 1, America/New_York |
| `python3 scripts/verify-v3.py` | **760/760** unique, pure logic, connected regions |
| `TZ=America/New_York node scripts/verify-daily-v3.mjs` | **5,840/5,840** actual date/state/transform outputs unique, logical and deterministic |
| Precache | **33/33 URLs HTTP 200**, online AND offline |
| Cache | `capydoku-v3-5288463b8ae5` |
| Actual frozen v1 → v3 SW upgrade | Pass: migration, old-cache removal, offline reload / unseen query |
| Actual frozen v2 → v3 SW upgrade | Pass: migration, old-cache removal, preserved partial board, new power executing offline |
| Native screenshots | **63** PNGs, each exactly **412×915**; contact sheet + 11 review pages |
| Backups | v1 **74/74**, v2 **226/226** original non-node_modules hashes unchanged |

## Coverage

All inherited tests retained/adapted: mark/capy/clear/Undo, 280ms double tap without X flicker, each row/column/zone/diagonal conflict/red capys/single orange cost, zero-life lock/retry, Relax no lives, solving/animation/progression/reload, bosses 10/20/30 and blocked rocks, daily determinism/streak/same-day/missed days, storage corruption/quota/future schema, offline startup/reload/unseen query, native board vs map scrolling, 10px drag threshold, one-gesture Undo, legal/illegal/solve/splash haptics, 8ms new-cell-only drag ticks with 70ms throttle and toggle off, rules/true 5px outlines/counters/Relax/spring tiers, reduced motion/local audio, mouse pointer-ID reuse and keyboard.

Added: first-run chooser and selection persistence; Home / Hot Spring / in-level switching with unchanged progress/streak/board/history; 29 Catmull–Rom segments through every one of 30 actual centers (**0px geometry error**, no node overlaps); every power and eligibility edge; Peek never placing, last target / all targets × / rock / fixed exclusions; Bloom no-mistake/full-life disabled, repair and fatal-error recovery; Nap legal/new-X charge spend, protected red mistakes, fourth loss, one-drag board Undo without resource refund; unused switch → new unused power and used/active Nap retained across switch/Undo/reload; all three Relax powers → Peek; no Hint button; powered boss no lily, Replay fresh attempt, subsequent pure boss persistent lily; iPhone context UA with absent vibration; exact install instruction; standalone detection; v1/v2 migrations and real SW upgrades, including an already-solved migrated boss that must not claim a retroactive pure reward. Spent power labels remain Used after switching away from an active Nap.

## Verification / difficulty

Campaign and both daily banks are byte-identical to v2. Independent Python full column-permutation enumeration and separate JS row DFS; JS validates every deduction against the unique solution. Only **house-single** and **shared-conflict** (documented in verification.md) are needed. Each first-five level has an immediate singleton-zone first move, five house-single placements, **0** preliminary deductions. Full 30-row v1→v2→v3 table: `proof-effort-v1-v2-v3.md/.json`; v2 = v3 throughout. Rocks start at 21, bosses stay 10/20/30.

## Visual review and conflicts

Viewed all supplied v5 art/mockups and every captured screen via contact-sheet review pages, plus native-size chooser, badge/path, switch, Hot Spring, iOS, power/drag and offline images. Fixed opaque locked nodes letting trail show through labels, toast/status overlap, and stale Nap remaining-charge copy during a live drag. Confirmed the last fix does not move the captured board mid-gesture. Final source PNG hashes and transparent corners are audited in `starter-art-audit-v3.json`.

Brief takes precedence: Hint removed despite design recommendation; power limit is per **attempt**, not permanently per puzzle; Relax defaults all powers to Peek instead of disabling defense. Cosmetic switching intentionally changes an unused power. No new fixed-Doze / wearable-accessory system was added to the unchanged verified campaign; legacy earnings/selection metadata and spring decoration progress retained. The crew scene is composed art; Jun/Remy previews use supplied cutouts over a CSS pond. Full details in README and KNOWN-ISSUES.

**Honest limits:** no real iPhone/Safari/WebKit or Galaxy S24 test, no physical vibration/OS-install/notch validation. iOS conditions are mocked/emulated in Chromium. No live deployment was attempted. **Extracted runtime archive offline smoke: PASS** (36 files, 33/33 URLs 200 online/offline, saved-mark persistence, unseen-query reload, zero browser errors). The archive is separately checked by `scripts/package-runtime.py --verify`; see `runtime-package-v3.json` and `runtime-archive-smoke.json` for that result.
