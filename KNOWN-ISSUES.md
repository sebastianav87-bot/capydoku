# Known issues / honest limits — v3

- Real iPhone/Safari and Galaxy S24 hardware, vibration strength, OS install prompts and physical notches are **unverified**. Automated iOS checks emulate platform values in Chromium, not WebKit. Viewport/touch tests are exactly 412×915, scale 1.
- Localhost install/offline and actual v1→v3 / v2→v3 service-worker upgrades are tested. No live site was changed. This box-only server is not a link a phone can access.
- All progress is device-local localStorage; no accounts/cloud sync/export UI. Browser eviction/clearing can erase it. Future schemas are read-only; unavailable storage warns.
- Daily content is a deterministic finite 365-board bank per eligibility state, with eight transforms. Human difficulty/playtest quality is not proven by the proof-effort metric.
- Peek is intentionally a one-cell solution ghost, not the old always-available logical Hint. Bloom/Remy normal-mode powers provide defense, not guidance; Relax converts them to Peek by default.
- The supplied v5 example includes fixed Doze and wearable accessory concepts. These new mechanics are not added to the unchanged verified campaign; old cast selection maps to a starter and original ID is retained. Earned boss progress becomes the spring's persistent decoration milestones. No wearable accessory editor/UI is implemented.
- Hot Spring crew uses the supplied composed scene (all three starters visibly half-submerged); changing starter changes badges/labels/hit target, not the scene's character order. Jun/Remy chooser previews use a CSS pond with their supplied cutouts; Bloom uses supplied stage art.
- English only. No comprehensive assistive-technology audit. Keyboard cell/control operation and reduced motion are tested; mobile touch targets and clipping are checked at the target viewport. Smaller heights use scrollable fallbacks, not an exhaustive device matrix.
- A service-worker update activates a new cache atomically; an already-open old UI must reload to run new modules. UI notifies when a fresh pond is ready.
