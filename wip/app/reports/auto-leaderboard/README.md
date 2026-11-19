# Automatic leaderboard enrollment

User requested that entering a game nickname automatically count the player and their accumulated points, with no separate Join step. The follow-up explicitly removed the ability to leave. This supersedes the earlier optional-membership requirements.

Published with explicit user approval; implementation saved in handoff-v5-wip. Production service configuration was unchanged.

- Saving the initial nickname automatically registers and sends current campaign scores and consecutive progress.
- Existing named saves register and send historical best scores and completions at next app startup. Existing registered identities and chosen leaderboard names remain intact.
- No Join leaderboard or Leave and delete my entry control remains. The client no longer exposes a leave operation. Legacy exclusion flags do not prevent registration. Old pending deletion queues are cancelled; their last valid identity is reused so that an undeleted row is not duplicated.
- The existing nickname screen explains in English that nickname, score and progress appear on the shared leaderboard. No additional confirmation is required. Existing named players see a brief update notice.
- Offline registration/progress persists and flushes on reconnection. Anonymous visitors without a game nickname can still read; registered named players are counted automatically.
- Existing per-pond scoring, phase-2 boss completion, leaderboard views, and board/phase preservation stay unchanged. No new runtime files or external assets.

Verification: 34 current campaign/migration/solver/client unit tests passed. Six browser checks passed in Chromium and WebKit using the real Worker with local Miniflare/workerd/D1: automatic initial nickname registration, automatic historical-score sync, two independent profiles seeing each other, old exclusion migration, offline queue/reload/reconnect, score improvements, absent join/leave controls, and preserved phase-2/crate boards. Local test records are deleted via the low-level test adapter during cleanup; these are not production entries or an in-game operation. Existing server administrative/deletion API is unchanged.

Existing players must open the updated game with connectivity before this device-local progress can appear remotely. Scores from devices that have not opened the update cannot be collected remotely.

Prepared offline cache: `capydoku-v5.0-3e1df1a0593b` (113 URLs).

Published main commit: `eeb2d71c9419f26c230f111f4033ba182ee851fd`. Rollback tag: `pre-auto-ranking-v5.0` → `545e89522fa83724715c69e0f414bc530f153abe`. The extracted release passed the 113-resource offline/reload smoke test with zero browser errors. The archive-only test disables remote ranking with the existing loopback-only test switch; real ranking flows were separately checked against the local Worker and production service health. See archive-smoke.json, pages-build.json and live-verification.json.
