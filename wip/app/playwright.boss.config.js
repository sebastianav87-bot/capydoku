import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir:'./tests',testMatch:'boss-phases.spec.js',timeout:90000,workers:2,
 outputDir:`test-results-boss-${process.env.BOSS_RUN||'final'}`,reporter:[['list'],['json',{outputFile:`reports/boss-phases/${process.env.BOSS_RUN||'final'}-results.json`}]],
 use:{baseURL:'http://127.0.0.1:8765',isMobile:true,hasTouch:true,headless:true,viewport:{width:390,height:664},screenshot:'only-on-failure',trace:'retain-on-failure'},
 projects:[{name:'chromium',use:{browserName:'chromium',launchOptions:{args:['--no-sandbox']}}},{name:'webkit',use:{browserName:'webkit',deviceScaleFactor:3}}],
 webServer:{command:'python3 -m http.server 8765 --bind 127.0.0.1',url:'http://127.0.0.1:8765',reuseExistingServer:true,stdout:'ignore',stderr:'ignore'}
});
