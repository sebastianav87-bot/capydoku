#!/bin/bash
cd "$(dirname "$0")/.."
CAPYDOKU_REPORT_VERSION=v4.2-rerun-v31ext CAPYDOKU_SCREENSHOT_DIR=reports/screenshots-v4.2/regression npx playwright test tests/v31-extension.spec.js --repeat-each=2 > reports/v4.2/e2e-rerun-v31-extension.log 2>&1
echo "RERUN_EXIT=$?" >> reports/v4.2/e2e-rerun-v31-extension.log
CAPYDOKU_REPORT_VERSION=v4.2-new CAPYDOKU_SCREENSHOT_DIR=reports/screenshots-v4.2 npx playwright test tests/v42.spec.js tests/upgrade-v42.spec.js > reports/v4.2/e2e-new-final.log 2>&1
echo "NEW_EXIT=$?" >> reports/v4.2/e2e-new-final.log
