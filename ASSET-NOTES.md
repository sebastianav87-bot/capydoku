# Local asset provenance — v3

- Jun, Bloom, Remy, Doze, base, Bloom pond preview and crew soaking scene copied unchanged from `/workspace/capydoku/mockup/v5-starters/art/`. Supplied final starter PNGs include transparent corners and mandatory dark outlines. No generation service was called or paid for.
- Starter palette copied to `assets/starter-palette.json`; navy #32417B, gold #E2AD32, rust #A65430. All runtime character lookups are centralized in `characters.js`. Install icons are local Jun cutout derivatives on the approved soft background.
- Existing approved v3 zone gradients, rock, map/spring backgrounds and optional local WebAudio retained. Old unused cast files remain for comparison but are excluded from the runtime precache/archive and never rendered.
- Nunito fonts are locally vendored with `assets/Nunito-OFL.txt`. No third-party runtime JS library or CDN.
- All supplied illustrated art is identified in UI as “AI illustration”. No mockup or backup source files were modified.

## v3.1 local correction

`assets/starters/bloom-hello-pond.jpg` is a cleaned runtime derivative, no longer byte-identical to the supplied composed preview. Its source remains intact in the mockup, frozen v3 snapshot and runtime tar. White steam was baked into the opaque RGB JPEG; narrow portrait cover-cropping made it look cut out at the sides. `scripts/clean-preview-v3.1.py` reconstructs only the outer steam/background regions with rim-aligned samples. The character region is pixel-identical before JPEG encoding; quality-100 encoding introduces only ≤3/255 channel rounding (mean <0.1/255). Starter cutout PNGs are byte-identical to v3. See `reports/preview-cleanup-v3.1.json`, the lossless diagnostic and edit mask.


## v3.1 music
Three original CC0 source uploads, direct free downloads, no account or fees. Full source/license URLs, author credits, date checks, hashes, encodings and sizes are in `assets/music/LICENSES.md` and `reports/music-v3.1.json`. In-app credits are in Settings. No Timberborn music is used. All starter PNGs remain byte-identical to shipped v3; the existing outer-steam JPEG cleanup is retained. v6 art is not integrated because it is not marked approved.
