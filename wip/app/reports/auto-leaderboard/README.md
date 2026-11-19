# Automatic leaderboard enrollment

User requested that entering a game nickname automatically count the player and their accumulated points, with no separate Join step. The follow-up explicitly removed the ability to leave. This supersedes the earlier optional-membership requirements.

Saved in handoff-v5-wip; not yet published. No production players or service configuration were changed during testing.

- Saving the initial nickname automatically registers and sends current campaign scores and consecutive progress.
- Existing named saves register and send historical best scores and completions at next app startup. Existing registered identities and chosen leaderboard names remain intact.
- No Join leaderboard or Leave and delete my entry control remains. The client no longer exposes a leave operation. Legacy exclusion flags do not prevent registration. Old pending deletion queues are cancelled; their last valid identity is reused so that an undeleted row is not duplicated.
- The existing nickname screen explains in English that nickname, score and progress appear on the shared leaderboard. No additional confirmation is required. Existing named players see a brief update notice.
- Offline registration/progress persists and flushes on reconnection. Anonymous visitors without a game nickname can still read; registered named players are counted automatically.
- Existing per-pond scoring, phase-2 boss completion, leaderboard views, and board/phase preservation stay unchanged. No new runtime files or external assets.

Verification: 34 current campaign/migration/solver/client unit tests passed. Six browser checks passed in Chromium and WebKit using the real Worker with local Miniflare/workerd/D1: automatic initial nickname registration, automatic historical-score sync, two independent profiles seeing each other, old exclusion migration, offline queue/reload/reconnect, score improvements, absent join/leave controls, and preserved phase-2/crate boards. Local test records are deleted via the low-level test adapter during cleanup; these are not production entries or an in-game operation. Existing server administrative/deletion API is unchanged.

Existing players must open the updated game with connectivity before this device-local progress can appear remotely. Scores from devices that have not opened the update cannot be collected remotely.

Prepared offline cache: `capydoku-v5.0-3e1df1a0593b` (113 URLs).
