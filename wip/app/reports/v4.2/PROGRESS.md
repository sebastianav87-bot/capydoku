# v4.2 PROGRESS
- [x] Step 0: app/ copied to /workspace/capydoku/app-v4.1-backup/ (cp -a). 94/94 runtime files byte-identical to capydoku-v4.1-runtime.tar.gz (sha256 53e11568…). Hashes in backup-v4.1-sha256.txt.
- [x] Crate art exported from Designer art_v3.py → assets/crates/*.svg (scripts/build-crate-art.py).
- [x] crates.js (pure rules, walkPath, deadlocks, BFS solver, spare-orange helpers).
- [x] 3 levels verified by Designer solver.py → crate-levels.json, reports/v4.2/crate-levels-solver.json:
      L1 Crate Cove 1 5×5 18 moves/8 pushes (par 25); L2 Crate Cove 3 6×6 30/13 (par 40); L3 Crate Cove 5 7×7 57/22 (opt pushes 20, par 80).
- [x] UI integrated: bonus-ui.js + bonus-v42.css; app.js hooks (transition offer after 5/15/25, spare orange HUD/hint/toast, Settings D-pad, canReload incl. bonusReward, keyboard/swipe); config.js cratePush/crateLand; core.js bonus field (schema stays 3, additive) + session spare; powers.js spare absorbs first lost orange.
- [x] build-sw.py → v4.2, cache bumped (re-run `python3 scripts/build-sw.py --bump-cache` after any edit). Dev smoke OK at 412/360 (reports/v4.2/dev/).
- [ ] NEXT: tests/v42.test.js (unit), tests/v42.spec.js (E2E + screenshots), full regression, contact sheet, report, tar.
- [x] Unit: tests/v42.test.js (11 tests) added to npm test:unit; version-literal updates in unit.test.js:44, updates.test.js:10-11, v31.test.js:3 (v4.1→v4.2 cache/hold/toast). Unit suite 148/148 expected.
- [x] E2E: tests/v42.spec.js (9 tests ×2 viewports) and tests/upgrade-v42.spec.js (3 ×2) pass in isolation. core.js load() writes the bonus block back once for v4.1 saves (bonusMigrated).
- [x] Version-literal updates in tests/upgrade-v41.spec.js + tests/updates.spec.js ('Updated to v'+BUILD.version; reports → reports/v4.2/regression-v4-upgrade-*).
- [ ] RUNNING: full E2E in background: logs reports/v4.2/e2e-regression.log (legacy specs) and reports/v4.2/e2e-new.log (v4.2 specs).
- [x] Full E2E finished (00:45 EST): new v4.2 specs 24/24 passed (e2e-new.log); regression 293/298 passed, 5 failed (e2e-regression.log), all in v31-extension.spec.js: 2× stale /^capydoku-v4\.1-/ literal (fixed → v4\.2), 2× v1 flight/soak timing, 1× 360 solved-daily fit timeout.
- [ ] NEXT: rerun v31-extension.spec.js in isolation (bg, log reports/v4.2/e2e-rerun-v31-extension.log); rerun v42.spec.js for added "packed" shots + deadlock settle.
- [x] app-v4.1-backup matches live v4.1: sw.js CACHE + build-info = capydoku-v4.1-923843f2cc02; digest recomputed from backup files with the backup build-sw.py = same; 91 precache URLs; 94 tar files byte-identical (+ "/" = the Producer's 95 URLs).
- [x] v31-extension.spec.js isolation rerun ×2 both viewports: 72/72 passed (incl. the 3 timing failures) → flaky under full-suite load. v4.2 specs final run 24/24 (e2e-new-final.log) with packed shots.
- [x] Unit final 148/148 (reports/v4.2/unit-final.log). Contact sheets: reports/contact-sheet-v4.2.png (42), -key.png (40), -regression.png (256). Key shots reviewed.
- [x] Runtime tar /workspace/capydoku/capydoku-v4.2-runtime.tar.gz (106 files, sha256 1be28e1b…d03c); extracted online 103/103 + offline 103/103, offline reload OK.
- [x] reports/ROUND-v4.2.md, reports/TEST-SUMMARY-v4.2.json, KNOWN-ISSUES.md written. DONE — awaiting The Producer's review; nothing published.
