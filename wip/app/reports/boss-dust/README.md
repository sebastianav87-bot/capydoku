# Boss earth and dust polish

Saved on handoff-v5-wip; not published. Includes the prior removal of the visible AI illustration label.

All 15 bosses share the updated transition: jagged earth opening, seven irregular sand-colored dust puffs and four small crumbs per sinking capy. Dust spreads beyond cell clipping, rises, expands and fades. Crumbs scatter and fall. The existing survivor outline and peek remain visible, and the existing phase checkpoint, timing and reward logic are unchanged. Decoration is aria-hidden and ignores pointer input. Reduced motion skips particle creation and retains the short 200 ms phase change. Particle animations finish before the phase-2 reveal; rebuilding the board removes all decoration.

Verification: 32 current unit/campaign/migration/solver/client checks passed. All 14 boss browser tests passed in Chromium and WebKit: early/final full transformation, checkpoint reload offline, loss/retry, rewards once, reduced motion and legacy replay. After the final adjustment to spread distance, the four early/final full-transformation tests passed again on both browsers. Tests assert the dust/crumb counts and absence of particles with reduced motion. Browser reports: ../boss-phases/dust-results.json and dust-final-results.json. The preview.png is a deliberately paused animation at 650 ms for visual inspection, not a full motion recording.

Offline cache rebuilt: capydoku-v5.0-76af60992d19, all 113 existing runtime URLs retained. No external assets added. Ranking endpoint and public production release were not changed. Physical phone review remains outstanding.
