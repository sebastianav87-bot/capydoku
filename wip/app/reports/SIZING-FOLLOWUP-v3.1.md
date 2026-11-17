## Latest follow-up — constant-width boards (Mode B default)

The latest Producer direction wins: **Mode B is the default**, superseding the shrinking 5×5 choice in the original section 4 below. This deliberately makes 5×5 cells larger again; Mode A remains available for the earlier smaller-cell preference. No gameplay/progress, art or mockups changed.

### One product switch

`GAME_CONFIG.boardSizingMode` in **config.js** is the only switch: `'B'` = constant-width; `'A'` = target 52px cells/growing board. There is no UI, query-string or saved-progress override. All active and solved boards share the same sizing helpers in layout.js. Screenshots of A use an isolated test-only module substitution, not another shipped setting. A future A/B change is a runtime edit and needs a cache rebuild/test.

### Reference measurement

The supplied Meowdoku raster is **1080×2340**. Its solid white outer frame spans **x=15…1064 inclusive = 1050px** at six straight-edge interior rows. Board/screen = **1050/1080 = 35/36 = 97.2222%** (JPEG edge uncertainty about ±1px per side). The colored-tile span at row 800 is 1016px (94.07%); outer frame is the consistent board metric used here. Physical screenshot pixels are not CSS pixels. Evidence: `reference-sizing-measurement.json`, `reference-sizing-annotated.png`.

Mode B uses **35/36 of the app width** for every grid, constrained only by the existing 440px app maximum. At the requested widths this leaves approximately **5.72px margins at 412** / **5px at 360**, matching the reference proportions. Frame/gap/padding remain unchanged.

### Measured A → B table (CSS px)

Cell values are the **minimum actual button width** across the grid; grid subpixel rounding can differ by ~0.02px. All button heights also meet 44px.

|Viewport|Grid / level|A board|A cell min|B board (default)|B cell min|
|--|--|--:|--:|--:|--:|
|412×915|5×5 / 3|294.00|52.00|**400.55**|**73.30**|
|412×915|6×6 / 9|349.00|52.00|**400.55**|**60.58**|
|412×915|7×7 / 21|404.00|52.00|**400.55**|**51.50**|
|360×780|5×5 / 3|294.00|52.00|**350.00**|**63.19**|
|360×780|6×6 / 9|349.00|52.00|**350.00**|**52.16**|
|360×780|7×7 / 21|352.00|44.56|**350.00**|**44.28**|

The narrowest B target is **44.28px** on 360px 7×7; 412px 7×7 is **51.50px**, above 48px. No board clips horizontally. Solved controls remain a separate no-scroll viewport layout; normal, boss 10, boss 30 and Daily are re-tested at both requested sizes (eight cases).

### Captures, tests and local cache

Six exact **412×915 PNGs**, level 3 / level 9 (6×6) / level 21 (7×7) in both modes: `screenshots-v3.1/sizing/{A,B}-level-{3,9,21}-{5x5,6x6,7x7}.png`. Side-by-side sheet including the original reference: **sizing-A-vs-B.png**. Raw per-mode DOM measurements: `sizing-{A,B}-{412,360}-followup.json`; aggregate: `sizing-A-vs-B.json`. All six captures and the comparison sheet were visually checked for clipping, overlap and readability.

Full current test counts and offline checks are in section 7 / `TEST-SUMMARY-v3.1.json`. New A/B coverage includes all twelve viewport/grid combinations, minimum targets, reference-width uniformity and zero browser errors. The original section 4 and `sizing-before-after-v3.1.json` remain **historical Mode A** evidence, not the current default.

Before this follow-up, snapshotted 45 local runtime/doc files under `sizing-followup-before/`, hashes in `sizing-followup-before-sha256.json`; previous report retained as `ROUND-v3.1-before-sizing.md`. Shipped backups and the frozen v3 runtime tar remain untouched.

Prepared newer local cache: **capydoku-v3.1-1b654e8bec8d**, replacing the earlier local `capydoku-v3.1-63e8bdeebfd7`. **Not pushed or published.** No new archive was requested/generated. Real iPhone/S24 and physical haptics remain unverified.
