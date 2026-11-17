# Boss earth and dust polish

Published with explicit user approval; implementation saved on handoff-v5-wip. Includes the prior removal of the visible AI illustration label.

All 15 bosses share the updated transition: jagged earth opening, seven irregular sand-colored dust puffs and four small crumbs per sinking capy. Dust spreads beyond cell clipping, rises, expands and fades. Crumbs scatter and fall. The existing survivor outline and peek remain visible, and the existing phase checkpoint, timing and reward logic are unchanged. Decoration is aria-hidden and ignores pointer input. Reduced motion skips particle creation and retains the short 200 ms phase change. Particle animations finish before the phase-2 reveal; rebuilding the board removes all decoration.

Verification: 32 current unit/campaign/migration/solver/client checks passed. All 14 boss browser tests passed in Chromium and WebKit: early/final full transformation, checkpoint reload offline, loss/retry, rewards once, reduced motion and legacy replay. After the final adjustment to spread distance, the four early/final full-transformation tests passed again on both browsers. Tests assert the dust/crumb counts and absence of particles with reduced motion. Browser reports: ../boss-phases/dust-results.json and dust-final-results.json. The preview.png is a deliberately paused animation at 650 ms for visual inspection, not a full motion recording.

Offline cache rebuilt: capydoku-v5.0-76af60992d19, all 113 existing runtime URLs retained. No external assets added. Ranking endpoint remains active and unchanged. Physical phone review remains outstanding.

Publication: main `545e89522fa83724715c69e0f414bc530f153abe`. Rollback: tag `pre-boss-dust-v5.0` points to `d384a149bcb09e2c53d56cd6cc4f1ade4f9ba4d8`. Only the four changed runtime files were published; the WIP root v4.3.1 reference and gh-pages were left intact. Extracted runtime smoke passed all 113 URLs online/offline, saved-mark reload and zero browser errors. See archive-smoke.json and live-verification.json.
