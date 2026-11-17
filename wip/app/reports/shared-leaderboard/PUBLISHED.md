# Shared leaderboard release

User authorized publication after tests and explicitly requested the public service remain activated.

- Game: https://sebastianav87-bot.github.io/capydoku/
- Published main commit: `d384a149bcb09e2c53d56cd6cc4f1ade4f9ba4d8`.
- Implementation and test evidence: WIP commit `1be8746` on `handoff-v5-wip`.
- Public Worker/D1: https://capybara-calm-ranking.sebalarc.chatgpt.site
- Cache: `capydoku-v5.0-41651411c70f` (113 runtime URLs).
- Rollback tag: `pre-shared-leaderboard-v5.0` → `aa235a4b06c07bd733298776b8beba68325da7f2`.
- `gh-pages` was not modified. The WIP branch's root v4.3.1 reference remains unchanged.

Checks passed: 32 current unit/campaign/migration/boss-pair checks; 7 Worker tests; 4 shared leaderboard browser tests; 14 boss browser tests; 80 campaign/browser regressions. Browser coverage is Chromium and WebKit emulation, not a physical iPhone. The extracted release's 113 runtime URLs worked online/offline and retained saved marks.

The public service was tested with two independent temporary profiles: anonymous read, joined publication, Overall score ordering, progress tie break, replay improvement without advance, By world and deletion. Temporary entries were removed. Production CORS preflight permits the game origin. Published resource verification is recorded in `live-verification.json`.

Existing installations receive the new service worker when opened online. If the previous screen persists, close the app completely and reopen it with connectivity. Existing progress and two-phase boss checkpoints retain their localStorage keys.

Users may read without joining. Join leaderboard publishes the selected nickname, score and progress. Leave and delete my entry deletes the shared row; offline deletion is retried when the game reconnects. Puzzle saves remain local; reinstalling or clearing storage can still erase them.
