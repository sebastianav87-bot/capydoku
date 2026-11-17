# Capydoku v2 — final test summary

Local only; live v1 unchanged. Generated 2026-11-09 07:51 PM America/New_York (EST).

|Check|Final result|
|--|--|
|Unit: `npm run test:unit`|**36 passed, 0 failed**|
|Mobile touch: `npm run test:e2e`|**29 passed, 0 failed**, 0 retries/flaky/skipped|
|Browser console/page errors|**0**, asserted after every test|
|Campaign|30/30 count=1, no-guess proof, connected regions|
|Daily 2026-01-01…2026-12-31|365 dates × both eligibility states; all count=1 and no-guess proofs|
|Total source records|**760/760 verified** independently in Python + JS|
|Precache|**27/27 HTTP 200**, cache `capydoku-v2-3613aaa30778`|
|Offline|Installed-worker reload, unseen query, progress/resources pass|
|Real frozen v1 → v2 worker|Old cache retired, effective new JS, progress migrated, strict offline pass|
|Screenshots|**42 exact 412×915 PNGs**, all reviewed; contact sheet + seven review pages|
|v1 rollback snapshot|74 original non-dependency file hashes unchanged|

Proof effort first five: eliminations before first capy **[1,1,5,4,5] → [0,0,0,0,0]**; deductions **[6,7,10,9,10] → [5,5,5,5,5]**; hardest technique becomes house-single only. All 30 before/after rows: proof-effort-v1-v2.md/.json. Campaign 21–30 stay compatible and unchanged; rocks begin at 21, bosses 10/20/30.

Coverage includes original marks/place/clear/undo, all violation types and oranges, game over/retry, Relax, hint non-placement, actual solves/unlocks/reloads, every boss reward, daily consecutive/missed-day streaks, drag paint/clear/interpolation/capy skip/one Undo, tap timing/no flash, native scroll/no pull reload, mocked legal/illegal/solve/off haptics, 8ms drag ticks/new-only/clear/70ms throttle/off, rock gating and both intro paths, v1 migration, absent/throwing APIs, rules/chrome/targets, all four spring stages, six timed celebration beats/per-splash haptics, opt-in sound persistence, reduced motion, mouse ID reuse and keyboard activation.

Approved v3 visuals and final supplied v4 core cast are integrated. Skins retain v1 save IDs, now displayed Pebble/Tuff/Pip/Nib; Ring/Doze are scene art. Sleepy fixed clues, corner-touching Duck exceptions and future cast gates were NOT silently added to the requested rules.

Gesture values: 280ms delayed single/double window; 10px drag threshold; ≤6px segment sampling. Haptics: drag 8ms, at most once/70ms; legal 24ms; illegal [35,55,35]; solve [35,55,55,55,85]; each splash 12ms. All share the persisted default-on toggle; reduced motion skips splash feedback. Optional synthesized local sound defaults off.

The static supplied example board has one solution but stalls under our two deductions from empty; it is not one of the shipped 760. No uniqueness result was misrepresented as a logic proof. Real S24 install/vibration/audio and human balancing remain unverified. See KNOWN-ISSUES.md.

Logs: unit-v2.log, e2e-v2.log, playwright.json, playwright-html/index.html, retune-v2.log, precache-status.json, offline.json, offline-upgrade-v2.json and sw-upgrade-http.log. Earlier failing/superseded logs and traces are retained separately; final tests use no retries. CLI color-environment warnings are not application console errors.

## Runtime archive

`/workspace/capydoku/capydoku-v2-runtime.tar.gz` — 30 runtime/docs files, 4324478 bytes. Extracted hashes match; standalone archive served locally passed all 27 resource URLs online/offline, saved-mark reload, unseen query and zero browser errors.

`python3 scripts/package-runtime.py --verify`

SHA256: `3696728bf6dfef2a1247a823eabcc41063af7896f9ebbb980c9034d192f445db`
