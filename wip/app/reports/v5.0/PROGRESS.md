# Production status

v5.0 is now published with explicit approval. See [PUBLISHED.md](PUBLISHED.md)
for the production commit, checks and rollback reference.

# Continued integration on handoff-v5-wip

Campaign and the 24 explicitly selected crates are integrated. Published world 1,
dailies and C1–C6 are preserved. Campaign/migration/score/ranking/cache tests:
25/25; independent minimum pushes: 24/24. Local cache is v5.0 with 111 URLs. Browser suite: 80/80 across Chromium and WebKit.
See [INTEGRATION.md](INTEGRATION.md) for browser results, commands and the
historical-suite limitations. Remote ranking remains disabled; no publication.

The original handoff checklist below describes the earlier snapshot.

# v5.0 Capybara Calm — progress (LOCAL ONLY)
- [x] 0 backup → /workspace/capydoku/app-v4.3.1-backup/ (cp -a, sha256 verified 4142 files; v4.3.1 tar copied inside)
- [x] 0b PLAN.md written (+ scoring/leaderboard 18:27, Cloudflare backend 18:39)
- [ ] 1 logic pools generating (reports/v5.0/pools/*.log, started 18:26 ET, 1500 s each; 10-r3/r4/r5 ×2, 9-r4)
- [ ] 2 crate levels 35…150 — generator scripts/gen-crates-v50.mjs (exact reverse BFS) done; cand-8-s801: 1357 candidates (≤140 moves); analyze.py pending
- [ ] 3 pick levels.json 150 + verify
- [~] 4 roles.js (150), core caps, lilies /450, world tints (v50.css), transitions, world badges, replay grouped by world — done in code; visual check + Hot Spring check pending
- [~] 5 rename: index.html, manifest, hub, welcome — done; README / remaining strings + old spec updates pending
- [ ] 6 migration + unit tests
- [ ] 7 (after 7b/7c) cache bump + E2E (Chromium 360/412 + WebKit) + reruns
- [~] 7b scoring (score.js) + solved summary + Settings › Progress world scores — code + 8 unit tests done; E2E pending
- [~] 7c leaderboard client reshaped to the Worker API (UUID, http/mock/none, API URL '' = off), world-change top 10 — 10 client tests (mock + Worker handler) pass; E2E pending
- [x] 7d (Cloudflare account postponed 18:53: stays local, mock kept, no deploy) Worker in /workspace/capydoku/worker (schema, rules, handler, wrangler.toml template, README) — 5 shim tests + 1 Miniflare/workerd local-D1 test pass; NOT deployed
- [ ] 9a explanatory errors (rule-break highlight + not-in-solution visual/haptic/hint)
- [ ] 9b success feedback (ripple, solved-zone mark; no auto ×)
- [ ] 9c bigger board: one-line header after pond 1, bottom bar (× / Capy / Undo / Jun), '?' rules, tool mode, emphasis, fit.js + cell sizes before/after
- [ ] 9d transitions only for new world / boss; direct Next pond; world top 10 kept
- [ ] 9e before/after screenshots + unit/E2E for 9a–9d
- [ ] 8 contact sheet, ROUND-v5.0.md, KNOWN-ISSUES, tar + sha256
