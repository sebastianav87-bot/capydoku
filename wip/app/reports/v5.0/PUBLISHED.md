# v5.0 published to GitHub Pages

Publication explicitly authorized by Sebastián in this conversation on
2026-11-16 (America/New_York).

- Live game: https://sebastianav87-bot.github.io/capydoku/
- Published `main` commit: `91beb341ae233f9ff76612e089c4c2fd380f75b0`.
- Runtime source: `handoff-v5-wip` commit `78ccbfdbb7f96cf7ba34310b787ce13fb48419fa`.
- Cache: `capydoku-v5.0-25c22c6bb18a` (111 precached URLs).
- Runtime tar SHA256: `1de68ff2c6fad65f14aa03690d0ca97f1e9573ffda6ad47c75310a13ba12343c`.
- GitHub Pages build: `built`, matching the published commit, no build error.
- Remote ranking remains disabled (`leaderboardApi: ''`). No Worker deployed.
- `gh-pages` was not created or changed. Only the packaged runtime was copied
  into a clean `main` checkout; `.git` and `.nojekyll` were preserved.

## Verification

All 114 archive files were verified after extraction. Runtime bytes match the
private preview. The archive-only browser smoke passed: 111/111 resources HTTP
200 online and offline; saved mark survives offline reload and an unseen query;
zero browser errors. Earlier v5.0 suites passed 25 dedicated unit tests, 28
powers/rewards unit tests, 24 exact minimum-push checks and 80 browser cases.

After Pages completed, curl fetched every precached URL plus `sw.js` with a
commit-specific cache-busting query: **112/112 HTTP 200**, every response
byte-identical to the tested runtime. The live service worker has the expected
v5.0 cache. JSON manifests alongside this file retain hashes and results.

An additional direct live-browser smoke could not complete in the managed
environment: direct browser egress is unavailable; the configured HTTPS proxy
works for curl and Playwright's request client, but its CA is not trusted by the
downloaded Chromium. TLS verification was not disabled. This does not affect
the successful Pages build, verified public HTTP responses or archive browser
smoke; real-device Safari and haptics remain unverified as before.

## Rollback

The remote tag `pre-v5.0-v4.3.1` preserves the previous production commit
`bd571030a5950d13a24f14ff9fbcd712bc5f5248`.

If rollback is requested, make a new revert commit on an up-to-date `main`:

```
git revert 91beb341ae233f9ff76612e089c4c2fd380f75b0
git push origin main
```

Then wait for Pages and verify the v4.3.1 cache and resources. Do not force-push.
Rollback restores application files; it does not undo localStorage writes on
players' devices. The v4.3.1 app knows only 30 ponds, so v5.0 progress beyond
pond 30 and v5.0 scores must not be assumed safe under the old save sanitizer.
Back up a player's local save before opening an old build when that matters.

The WIP checkout's root remains the frozen v4.3.1 reference used by migration
tests. Continue v5.0 development under `wip/app`; do not confuse that reference
copy with the current production `main`.
