# Local asset provenance — v4

- Jun, Bloom, Remy, Doze, base, Bloom pond preview and crew soaking scene copied unchanged from `/workspace/capydoku/mockup/v5-starters/art/`. Supplied final starter PNGs include transparent corners and mandatory dark outlines. No generation service was called or paid for.
- Starter palette copied to `assets/starter-palette.json`; navy #32417B, gold #E2AD32, rust #A65430. All runtime character lookups are centralized in `characters.js`. Install icons are local Jun cutout derivatives on the approved soft background.
- Existing approved v3 zone gradients, rock, map/spring backgrounds and optional local WebAudio retained. Old unused cast files remain for comparison but are excluded from the runtime precache/archive and never rendered.
- Nunito fonts are locally vendored with `assets/Nunito-OFL.txt`. No third-party runtime JS library or CDN.
- All supplied illustrated art is identified in UI as “AI illustration”. No mockup or backup source files were modified.

## v3.1 local correction

`assets/starters/bloom-hello-pond.jpg` is a cleaned runtime derivative, no longer byte-identical to the supplied composed preview. Its source remains intact in the mockup, frozen v3 snapshot and runtime tar. White steam was baked into the opaque RGB JPEG; narrow portrait cover-cropping made it look cut out at the sides. `scripts/clean-preview-v3.1.py` reconstructs only the outer steam/background regions with rim-aligned samples. The character region is pixel-identical before JPEG encoding; quality-100 encoding introduces only ≤3/255 channel rounding (mean <0.1/255). Starter cutout PNGs are byte-identical to v3. See `reports/preview-cleanup-v3.1.json`, the lossless diagnostic and edit mask.


## v3.1 music
Three original CC0 source uploads, direct free downloads, no account or fees. Full source/license URLs, author credits, date checks, hashes, encodings and sizes are in `assets/music/LICENSES.md` and `reports/music-v3.1.json`. In-app credits are in Settings. No Timberborn music is used. All starter PNGs remain byte-identical to shipped v3; the existing outer-steam JPEG cleanup is retained. This was the v3.1 status; approved v6 and v6.1 are now integrated below.

## v4 approved v6 integration

Source: `/workspace/capydoku/mockup/v6/`, read-only. The provided map-painted / hotspring / celebration-pool JPGs, nine three-state boss landmarks, generic-capy SVG, tutorial-hand SVG and original v1 jump/sit PNGs are copied unchanged to `assets/v6/`. All39PNG exports and the complete notes were reviewed. The starter cast remains the unchanged v5 cutouts. Exact flat A–F zone values now follow v6 notes. AI illustration remains labeled on screens. The separate fixed sleeping-clue asset is not a new campaign rule.

Generic board/Peek/counter art and celebration poses are centralized in `characters.js`'s PIECES map. Per-capy power art uses its POWER_ICONS map. The initial temporary line icons were replaced with the approved v6.1 peek / second-chance / nap SVGs, copied unchanged from mockup/v6.1/assets/. The three approved 128px power-face crops are also unchanged. POWER_IDENTITY contains the exact approved colors, names and one-line phrases. All new/changed v6.1 PNG references, notes and SVGs were reviewed; inherited references match the already-reviewed v6 set. Existing Nunito OFL and CC0 music licenses remain included offline.

## v4 approved v6.2 illustrated generic piece

The board, counter, rules summary and Peek now use the byte-identical `mockup/v6.2/art/generic-capy.svg` compatibility wrapper, containing the approved transparent 153×153 (51px@3x) PNG. It is raster, not vector. `BOARD_SPRITE` is the single swappable source in characters.js; board and Peek aliases point there. Starter, Doze and launch/swim assets were not changed. The master/chroma JPEG is NOT shipped. The former flat v6 sprite was replaced, not layered. Conflict remains an outline/badge with filter:none; designer contrast evidence is informative, not a new independent WCAG audit. Three unused legacy composed/base images remain on disk for historical regressions but are excluded from precache/runtime packaging (1,539,480 bytes saved).

## v4 final approved overrides (supersedes earlier cast/map notes)

- v6.3: all nine supplied locked/next/beaten boss SVGs copied byte-for-byte to `assets/v63/`. Body120px, SVG canvas160px, normal ponds50px. Geometry matches the approved412×3740strip. SVGs embed their raster images and have no remote references.
- Bloom v6.4 is approved by the latest instruction despite the source notes' older pending header. All16assets copied unchanged to `assets/v64/`; body/face/intro and12density PNGs come from this single revision. `characters.js` centralizes paths and responsive selection. Old Bloom compatibility URLs contain new art but are excluded from precache; obsolete art lives only in reports/retired-bloom-v4 (not runtime). The unused transparent introPNG is also excluded.
- New master960×960, face128×128, introJPEG900×700. All32/44/51/64exports use proper1x/2x/3x resolution. No flower/body recolor or silhouette edit was made. Jun/Remy and v1 launch/swim art remain unchanged.
- The v6.2 approved generic capy is shared by board, counter, rules and Peek via BOARD_SPRITE. It is not Bloom and never inherits conflict tint.
- Approved design v6–v6.4 is local-only. The current brief overrides any shown Hint or Relax UI, old sizing and automatic Peek placement.

## Final approved v6.5 and music
- Original lily-earned/outline/golden.svg copied byte-for-byte from mockup/v6.5/art. No consent/analytics assets or transport built.
- Nickname trio uses the canonical unchanged Jun/Remy and approved v6.4 Bloom map. No separate old Bloom nickname artwork.
- Northumberland by Spring Spring / Spring Enterprises, CC0 source independently checked10 November2026 EST; two local mobile transcodes,4,186,008bytes; see assets/music/LICENSES.md. Old three-track music files live only in development reports, excluded from runtime.
