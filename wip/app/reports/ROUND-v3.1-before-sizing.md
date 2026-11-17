# Capydoku v3.1 — local-only look-and-feel round

No push, publication, repo, account or spend. The live deployment is untouched. Completed local cache **capydoku-v3.1-63e8bdeebfd7** is prepared under conditional permission; screenshot approval is still needed before any live update.

## Snapshot first

Before edits, copied the current full app to `/workspace/capydoku/app-v3-backup/`. **36/36 shipped runtime files match the v3 tar exactly**, including the service worker/cache. The snapshot's **345 original non-node_modules files** are hashed in `/workspace/capydoku/v3-backup-sha256.json`. Details: `shipped-v3-backup-verification.json`. Existing v1/v2 backups and the v3 runtime tar are retained unchanged.

## 1. Power messages and card size

Root causes:
- `activatePower()` unconditionally created a toast, while the card rendered identical Peek/Nap text. Measured before: **2 Peek copies**, **2 Nap copies**. Second chance had one toast, but used a different message surface.
- `.strip { flex:1; max-height:190px }` expanded a message card to consume leftover viewport height. The idle/Peek card was **190px** tall despite fitting ~96px of content.

Fix:
- One centralized `pondMessage()` and one card surface for all three powers; no power toast. Peek/Nap derive their message from the active state; Second chance displays a card-only confirmation until the next board action.
- Card is intrinsic/compact (`flex-grow:0`), **96px** idle/Peek at 412×915. It can wrap actual longer content but cannot fill spare viewport space.
- Empty title/detail lines do not reserve space; if both are empty the whole card hides. Bottom counters stay anchored and the board never shifts. The empty-content screenshot is an explicit defensive test fixture, not a fabricated normal gameplay state.

## 2. Chooser preview edges

Root cause: **opaque white steam was baked into the RGB JPEG** `bloom-hello-pond.jpg`. It has no alpha channel. Portrait `object-fit:cover` crops the steam columns at the frame sides. This was neither a starter PNG alpha fringe nor a CSS mask/overlay bug.

Fix: reconstructed only the outer steam/background patches using untouched neighboring columns aligned to the pond rim. The first cleanup was visually reviewed and refined to avoid leaving any teal base/rim artifacts. The character region is **unchanged before encoding**; quality-100 JPEG adds only codec rounding (maximum 3/255, mean <0.1/255 per channel). All original starter cutout PNGs remain byte-identical. Near-white steam pixels in the two source ROIs: **8,282 → 0**.

The same existing asset URL is shared by **first-run chooser and switch selector**; both were checked/captured. Home, Hot Spring and in-level switching all use that selector. Jun/Remy previews were also checked. No mockup/source/backup art was modified.

Reproduce cleanup: `python3 scripts/clean-preview-v3.1.py`. Audit: `preview-cleanup-v3.1.json`, `preview-steam-edit-mask-v3.1.png`, `preview-clean-lossless-v3.1.png`.

## 3. Celebration root cause and restoration

Compared the original v1 source and actual v1/v3 frame sequences from their untouched backups. **The jump was not literally absent in shipped v3** at 412×915: it was replaced by a less legible choreography. V1 launched directly upward for **1.5s**, with **100ms** stagger and dedicated jump/swim poses. V2/v3 changed it to **0.9s**, spending its first **400ms moving DOWN to the board dock**, then only ~500ms airborne, with **350ms** stagger. The current starter map also reused the standing cutout for all poses. This made the action read as a shuffle rather than the original concurrent leap; before frames show it. No solver/completion-trigger failure or hidden-flyer bug was found.

Restored v1-style direct upward arcs and concurrent launches: **1500ms flight / 100ms stagger**, with an 85px lift adapted to the current cutouts (v1: 65px). All current starter PNGs remain untouched and swappable in characters.js. A CSS lower-edge water fade helps the same cutouts read as soaking after landing. Retained timed splash rings, steam, per-landing sound/haptics, reaction, saved oranges and golden lily. Lantern/badge and lily/capy overlaps found in screenshot review were separated. Reduced motion still crossfades directly to soaking. First landing 1500ms; last landing 1900/2000/2100ms for 5/6/7 capys; reaction ≥2800ms.

Before: `before-v3-flight-*.png`; original reference: `reference-v1-flight-*.png`; after: `after-v31-flight-*.png` plus all three `after-launch-{jun,bloom,remy}-{airborne,soaked}.png`. Frame labels are nominal sampling times, not a high-speed-camera claim.

## 4. End screen and consistent sizing

Removed the small-height `height:auto / overflow:visible` fallback and 260px minimum lower area **for solved screens**. Baseline v3 normal solve produced a 784px document in a 780px viewport (the sampled buttons themselves happened to fit); the layout is now one safe-area-aware viewport. All three controls are fully visible with document height exactly viewport height after normal, boss 10, boss 30 and daily solves at **412×915 and 360×780**. Eight E2E cases cover the button rectangles and scroll. Daily’s Next pond opens the next uncleared campaign pond; after 30 it returns to Pond Path.

Board cap formula is `n×52 + (n−1)×3 + 6 + 16`: 52px cells, 3px gaps, 3px grid padding, 8px outer padding. Width is constrained by 4px side margins. Cells are **52px at every campaign size at 412px**. At 360px, seven 48px cells plus required spacing cannot fit; they remain **44.56px minimum**, above 44px. All cells are measured, not just inferred. 5px zone outlines remain. Spare height is shared around the play area and the flex lower section, never by growing the compact message card.

|Viewport|Grid|Board before → after px|Cell before → after px|
|--|--|--:|--:|
|412x915|5×5|400 → 294|73.19 → 52.00|
|412x915|6×6|400 → 349|60.50 → 52.00|
|412x915|7×7|400 → 404|51.42 → 52.00|
|360x780|5×5|348 → 294|62.80 → 52.00|
|360x780|6×6|348 → 349|51.83 → 52.00|
|360x780|7×7|348 → 352|44.00 → 44.56|

Screenshot QA additionally caught the existing 360px seven-slot row clipping Relax. Narrow screens now use 24px counter **icons** (the switch remains ≥44px), and hide the optional daily date suffix so the header controls/oranges fit. New E2E rectangle checks cover both widths. This deliberately supersedes the old mockup’s larger 5/6-column cells; color/pattern/art remain unchanged.

## 5. Haptics — moderately stronger

|Type|Old ms|New ms|
|--|--|--|
|Drag mark / clear tick|8|12|
|Legal capy|24|32|
|Illegal capy|[35,55,35]|[45,60,45]|
|Solve|[35,55,55,55,85]|[45,60,70,60,105]|
|Each water landing|12|18|

Drag throttle stays **70ms**, movement threshold **10 CSS px**, single/double-tap window **280ms**. Only newly changed cells tick; already-marked/visited cells do not. The one persisted Haptics toggle suppresses every pattern. Missing/throwing APIs fail silently. Mocked tests verify exact patterns, new-cell/clear ticks, fast-drag throttling, mute and landing timing. Physical feel still needs S24 testing.

## 6. $0 original CC0 acoustic music

Live source pages were opened and saved; all explicitly list **CC0**, with direct downloads requiring neither account nor payment. CC0 permits commercial/in-app copying, modification and distribution without fees. Evidence: `music-source-pages/`; full titles/authors/source and license URLs, date checked (**2026-11-09 EST**), credits and hashes: `assets/music/LICENSES.md`, `music-v3.1.json`. No Timberborn recordings/assets are used. The mood selection is based on source descriptions/instrumentation, not a claim of human listening or proven melodic provenance.

|Track / author|Source|Opus bytes|MP3 bytes|
|--|--|--:|--:|
|Flute and Guitar — Alex McCulloch (Pro Sensory)|https://opengameart.org/content/flute-and-guitar|456,542|610,263|
|Minimalistic Flute & Strings Tune — Spring Spring|https://opengameart.org/content/minimalistic-flute-strings-tune|1,215,627|1,556,940|
|Revelation — Indieteur|https://opengameart.org/content/revelation|469,229|679,017|

All three are **CC0 1.0 Universal**: https://creativecommons.org/publicdomain/zero/1.0/ . Combined audio **4,987,618 bytes (4.99 MB / 4.76 MiB)**; audio + license **4,990,327 bytes**, within the 5 MB aim. Stereo Opus 40kbps nominal + MP3 64kbps; −21 LUFS / −3dBTP normalization, 0.8s leading / 1.5s trailing fades. FFmpeg fully decoded all six, and browser metadata decoding passed for all six. Both formats are precached, not lazily downloaded.

WebKit’s source confirms Ogg/Opus arrived on iOS **18.4**: https://webkit.org/blog/16574/webkit-features-in-safari-18-4/ . `canPlayType` selects MP3 on older Safari; an Opus decoder error retries MP3 once. The service worker supports offline single-byte-range responses for iPhone media requests; tested 206 / 32-byte slice alongside all normal 200s.

Settings has an independent, persisted **Music** toggle, default on but strictly silent until a trusted first touch/key on each page load. No media is allocated/played before interaction; autoplay rejection is caught. Existing v1/v2/v3 progress gets the new-field default without changing schema or losing progress/streak/powers. Effects off is not a music mute: the controls are deliberately separate. Music-off and explicit mute are respected; HTML media’s mute flag is not overridden. Gain **0.14** normal / **0.085** Relax (calmer, not muted); 800ms fade-in, 240ms toggle fade-out, immediate pause on hidden tab. Tracks rotate and wrap. In-app **Music credits** includes all authors, including Alex McCulloch’s requested name even though CC0 does not impose attribution. No external playback requests.

## 7. Verification, tests and visual review

Campaign/daily data are byte-identical to shipped v3: **30 + 365 safe + 365 rock-eligible = 760** unique, connected boards, all no-guess. Python full-permutation oracle and separate JS row DFS/proof checks were re-run. **5,840** actual transformed daily outputs across both eligibility states also pass determinism/uniqueness/pure logic. Deduction set remains house-single + shared-conflict, no branching. Updated `verification-v3.1.json/.md`; `verify-v3.1.log`, `daily-v3.1.log`. All per-level solution counts/rocks/techniques remain recorded.

```sh
npm run test:unit
CAPYDOKU_REPORT_VERSION=v3.1 CAPYDOKU_SCREENSHOT_DIR=reports/screenshots-v3.1/regression npm run test:e2e
python3 scripts/verify-v3.py
TZ=America/New_York node scripts/verify-daily-v3.mjs
python3 scripts/contact-sheet-v3.1.py
```

**65/65 unit + 65/65 e2e PASS**, no failures/skips/flaky tests and **0 browser console/page errors**. Final e2e began **2026-11-09 21:20:41 EST**, duration **141.64s**. All **42/42 precache URLs return 200 online AND offline**, including music. Actual shipped-v3 → v3.1 SW upgrade, old-cache removal, progress/streak preservation, unseen-query offline reload and Range audio pass; inherited v1/v2 migrations/upgrades still pass. Logs `unit-v3.1.log`, `e2e-v3.1.log`; JSON `playwright-v3.1.json`, `TEST-SUMMARY-v3.1.json`; HTML `playwright-html-v3.1/`.

Screenshot audit: **134 native PNGs** = **121 at exactly 412×915**, plus **13 explicitly labeled 360×780** additions. Location `screenshots-v3.1/`, smaller captures `360x780/`, inherited coverage `regression/`. Main `contact-sheet-v3.1.png`; paged `contact-review-v3.1-*.png` and `contact-regression-review-v3.1-*.png`. All pages and key full-size captures were visually inspected; clipped Relax at 360 and celebration overlaps were fixed before final run.

## 8. Local release boundary, backups and honest limits

The completed batch’s cache bump is **prepared locally only: `capydoku-v3.1-63e8bdeebfd7`** (was `capydoku-v3-5288463b8ae5`). This uses the explicit conditional permission for a finished batch; **no live link was updated**. Further accidental cache rebuilds remain guarded. Initial held-v3 audit is retained in `cache-hold-v3.1-initial.json`; current local candidate in `cache-hold-v3.1.json`. Screenshot review/approval is still needed before any future publish. No v3.1 archive was requested/generated; optional packaging now targets a separate v3.1 filename and cannot overwrite the frozen v3 tar.

Snapshot audit: v1 **74/74**, v2 **226/226**, v3 **345/345**, pre-extension v3.1 **445/445** original hashes match. All **36/36 shipped v3 tar files** match `app-v3-backup/`; tar hash is unchanged. Extra rollback point `app-v31-ui-backup/`. Details `backup-integrity-v3.1.json`; runtime change hashes `runtime-diff-v3-v3.1.json`.

**v6 completed handoff arrived during this round, but has no explicit v6 approval marker/status; not integrated.** notes.md/manifest were checked. Its proposed Hint return, Relax defensive-power disable, final-cell Peek restriction and generic/v1 celebration pieces conflict with the existing user brief; none were acted on. Inventory/status in `v6-status-v3.1.json`. No mockup or backup was modified by this implementation.

Real iPhone/Safari/WebKit, S24 hardware, physical haptic strength, hardware mute/interruptions/notches, and human judgment of musical mood/quality remain **unverified**. Chromium includes actual local audio playback/decoding plus mocks, not physical listening. Existing localStorage eviction and finite daily-bank limitations remain in `KNOWN-ISSUES.md`.
