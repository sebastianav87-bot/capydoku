# Final visual review · v2 + approved v3 + final v4 cast

All 42 raw browser PNGs are exactly 412×915 (screenshot-integrity-v2.json). I opened the final contact sheet, all seven six-screen review pages (every capture), and full-size rules/settings/rock-intro/7×7/detail/celebration screens. Captures are live UI, not mockup composites.

Observed/fixed during review:
- Replaced dusty colors with the exact polished six hi/lo v3 hex pairs; retained patterns, 11px cell radius and true 5px zone edges.
- The reed strip now sits 8px below controls; the lower column uses remaining flex space and anchors the counter/stacked Relax row at the safe-area end, as specified. Deliberate soft negative space is below the strip, not a stranded gap above it.
- Fixed settings buttons stretching across labels and awkward instruction line breaks; all three toggles fit/read cleanly.
- Fixed the upgraded rock overlay's dismissal target; its arrow/spotlight points at the actual rock and both first-encounter paths are captured.
- Fixed blank first-frame sheet icons by waiting for actual local image decoding before native screenshots; every captured image has naturalWidth > 0. No image compositing or fake overlays were used.
- Moved spring lanterns into open pool space so they do not sit on character cards. Four stages show actual earned-slot/decor changes, not unearned placeholders presented as rewards.
- Copied six final v4 cutouts unchanged, with their supplied dark edges; central map preserves legacy save IDs. No character was redrawn. Scene art Ring/Doze does not introduce rule variants.
- Six celebration captures show anticipation, motion, sequential ripples, soaking and reaction; duplicate stationary source sprites are hidden as flyers leave. New Tuff joins the boss soak, and reduced-motion capture has no flyers/splashes.

No unintended clipping, overlap, horizontal overflow, missing icons or unreadable main copy observed at this viewport. The 7×7 row of seven 28px counters and Relax control fits. Six-zone cells are ≥60px; seven-zone cells are ~51px (physical viewport constraint), still ≥44px. Safe-area CSS exists, but a real phone/chrome-inset/OS install test was not performed.

Conscious source differences: actual retuned playable boards/progress/streaks; seven-zone extension; truthful rules sheet instead of unsupported Sleepy/Duck exception claims; four real boss-gated buddies rather than the mockup's unearned/future cast slots; CSS motion with existing pose cutouts rather than newly generated animation art. Future cast unlocks and the alternate home-navigation option B remain outside scope.
