# Two-phase bosses published

Publication explicitly authorized by Sebastián in the conversation after the WIP
review. GitHub Pages continues to serve `main` at:
https://sebastianav87-bot.github.io/capydoku/

- Published commit: `aa235a4b06c07bd733298776b8beba68325da7f2`.
- Source WIP commit: `8681d2a574d85482940f43f0bd3540d14a10b340`.
- Live cache: `capydoku-v5.0-9be5b9e0b436` (113 precached resources).
- Runtime package: 116 files, SHA256
  `b0c1286e782142dee9157b5036e36e834be6e7a3bfc31f68493f82904af1d723`.
- Previous production: `91beb341ae233f9ff76612e089c4c2fd380f75b0`, preserved
  remotely as tag `pre-two-phase-bosses-v5.0`.
- GitHub Pages build `built` at the exact published SHA, no build error.
- All precached files plus `sw.js`: **114/114 HTTP 200**, fetched with the
  commit-specific cache-busting query. Every response matches tested source bytes.
- Extracted package browser smoke: **113/113 online and offline**, saved mark
  resumes after offline reload and an unseen query; no browser errors.
- Ranking API remains empty. No Worker deployed, no `gh-pages` change, no Sites
  preview update. The private preview still contains the earlier v5.0 runtime.

The runtime tar checksum and each extracted file hash were verified before
copying into a clean `main` clone. `.git` and `.nojekyll` were retained. Only
runtime files were published, not the WIP directory or test/generation reports.

For a requested rollback, revert `aa235a4b06c07bd733298776b8beba68325da7f2`
on an up-to-date main and push normally; never force-push. Wait for Pages and
verify the previous cache. Rollback restores files, not player localStorage;
the older v5.0 cannot understand phase-two checkpoints, so back up such saves
before opening the older app. Completed rewards and best scores use the same
schema and ceiling as the earlier v5.0.

Source tests, the 15 solver-pair proofs and mobile browser results are in
[README.md](README.md). Real-phone UX/haptics remain unverified; publication
does not turn emulated checks into physical-device testing.
