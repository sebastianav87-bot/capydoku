#!/bin/bash
# v4.2: full E2E in two passes (new v4.2 specs → reports/screenshots-v4.2, v4.1-and-older regression → reports/screenshots-v4.2/regression)
cd "$(dirname "$0")/.."
CAPYDOKU_REPORT_VERSION=v4.2-new CAPYDOKU_SCREENSHOT_DIR=reports/screenshots-v4.2 npx playwright test tests/v42.spec.js tests/upgrade-v42.spec.js > reports/v4.2/e2e-new.log 2>&1
echo "NEW_EXIT=$?" >> reports/v4.2/e2e-new.log
LEGACY=$(node -e "const s=require('fs').readFileSync('playwright.config.js','utf8');const m=s.match(/testMatch:\[([^\]]*)\]/)[1].split(',').map(x=>x.replace(/'/g,'')).filter(x=>!['v42.spec.js','upgrade-v42.spec.js'].includes(x));console.log(m.map(x=>'tests/'+x).join(' '))")
CAPYDOKU_REPORT_VERSION=v4.2-regression CAPYDOKU_SCREENSHOT_DIR=reports/screenshots-v4.2/regression npx playwright test $LEGACY > reports/v4.2/e2e-regression.log 2>&1
echo "REGRESSION_EXIT=$?" >> reports/v4.2/e2e-regression.log
