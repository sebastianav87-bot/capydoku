# Shared leaderboard v5.0

Implemented in `handoff-v5-wip`; user explicitly authorized publication after tests and activation of the public service.

Public API: https://capybara-calm-ranking.sebalarc.chatgpt.site
Game: https://sebastianav87-bot.github.io/capydoku/

The existing Worker runs on Sites with a separate managed D1 database. Site project: `appgprj_6afbd19d4890819182612ed10531f4b9`; source commit `1e55c7d44a76585d384f40bcd167edb13cec3326`; deployment `appgdep_6afc2d5e67108191ae4f505adcc3af02` succeeded. `ALLOWED_ORIGIN` is the GitHub Pages origin and `RATE_SALT` is a hosting secret. No credentials are committed.

Overall is public by default. Joining is optional and publishes the chosen nickname, best campaign scores and consecutive last-cleared pond. By-world comparisons remain available. Migrated completions count even without historical scores. A two-phase boss updates progress only when phase 2 finishes. Puzzle saves remain local; this is not cross-device cloud save.

The game queues offline changes, flushes on reconnect, caches the last table with a Last synced label, and deletes the shared entry on leaving (queues deletion if offline). Opening from pause preserves the board, phase and active time. Public table rows do not disclose other players' UUIDs. Existing score ceilings and rate limits apply; scores are client-reported, not cheat-proof.

Evidence is in adjacent logs and JSON reports. Public-service test creates two independent temporary profiles, checks score/progress tie ordering and replay improvements, and deletes both. Browser flow uses the real Worker/workerd/D1 locally, isolated from production, in Chromium and WebKit. It covers anonymous browsing, opt-in, prefilled name and preview, migration scores, peer updates, replay, offline reload/reconnect, deletion, phase-2 board preservation and crate pause/resume.

Remaining limits: physical iPhone behavior is unverified; full historical unit tests still depend on omitted backup/mockup fixtures and stale version assertions (see KNOWN-ISSUES). The dedicated current campaign/migration, boss, client, Worker and browser suites are the release checks. Production TLS/HTTP/CORS and published resource bytes are verified separately; local browser flows do not claim to be physical-device tests.

## Release checks

- Current campaign/migration, scoring, client and all 15 boss pairs: **32 passed** (`unit-v50.log`).
- Worker rules/handler and real Miniflare workerd/D1: **7 passed** (`worker-tests.log`).
- Shared leaderboard browser flow: **4 passed**, Chromium and WebKit (`browser-results.json`).
- Campaign browser regressions: **80 passed**, four viewport/browser projects, independent-server single-worker rerun (`../v5.0/ranking-recheck-results.json`).
- Boss browser regressions: **14 passed** (`../boss-phases/ranking-results.json`).
- Extracted runtime: **113 resources available online and offline**, saved mark survives reload, zero browser errors (`archive-smoke.json`).
- Public service: two profiles, progress tie break, replay scoring, By world and deletion passed (`public-service-test.json`). Production CORS preflight allows the GitHub Pages origin (`public-cors-headers.txt`).

The first parallel campaign run lost its reused HTTP server when another suite finished; double-tap timing also failed under the parallel load. The independent-server, single-worker rerun is the final campaign check (`campaign-recheck.log`, `../v5.0/ranking-recheck-results.json`). Initial logs are retained as diagnostic history, not claimed as passing.

Rollback frontend: `pre-shared-leaderboard-v5.0` → `aa235a4b06c07bd733298776b8beba68325da7f2`. Use a normal revert/release commit restoring that runtime; do not force-push history. Disable `leaderboardApi` and rebuild cache to disconnect the app without deleting the service database.
