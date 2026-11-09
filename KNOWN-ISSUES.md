# Known issues / limitations

- **No real Galaxy S24 / Android Chrome / installed Android PWA test.** Verified only in desktop Chromium 158 mobile emulation with touch at 412×915. Real touch timing, browser chrome/keyboard insets, OS install UI, app kill/relaunch and thermal/performance behavior remain unverified. Localhost SW operation and strict browser-offline reload were verified.
- The prototype is installable-manifest/SW-ready, but this build was deliberately **not hosted**. Installing on a real phone will need a later authorized HTTPS deployment or equivalent secure local setup; no such deployment or account was created here.
- Difficulty ramp is a reproducible heuristic, **not human-balanced or usability-playtested**. Mathematical uniqueness and no-guessing solvability are proven for all 30 boards and sampled 365 daily dates, not a claim that each deduction is obvious to a new player.
- Daily uses a finite **365-source bank plus deterministic dihedral transforms**. It can repeat in later cycles. It is not an indefinitely unique daily puzzle generator. Advanced/rock dailies are accessible before campaign 21.
- Saves and streaks are local to this browser/device. No cloud sync/backup/anti-clock-cheating. Data clearing/private-session expiry can lose progress; quota/unavailable storage produces a warning. Undo history resets on reload; board and orange count do not.
- Zone patterns and non-color warning/hint cues are supplied, but the seventh taupe/chevron zone and this interactive UI have not had clinical CVD/accessibility or screen-reader user testing. Reduced-motion support exists; broad browser/device coverage is not claimed.

No unresolved failing automated tests or observed clipping/overlap at 412×915 at handoff.
