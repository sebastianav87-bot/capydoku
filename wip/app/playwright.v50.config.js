import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: 'v50.spec.js',
  outputDir: `test-results-v50-${process.env.V50_RUN || 'browser'}`, timeout: 45000, workers: 2,
  reporter: [['list'], ['json', { outputFile: `reports/v5.0/${process.env.V50_RUN || 'browser'}-results.json` }]],
  use: { baseURL: 'http://127.0.0.1:8765', isMobile: true, hasTouch: true,
    headless: true, launchOptions: { args: ['--no-sandbox'] },
    screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium-360', use: { browserName: 'chromium', viewport: { width: 360, height: 780 } } },
    { name: 'chromium-412', use: { browserName: 'chromium', viewport: { width: 412, height: 915 } } },
    { name: 'chromium-short', use: { browserName: 'chromium', viewport: { width: 375, height: 525 } } },
    { name: 'webkit-iphone', timeout: 90000, use: { browserName: 'webkit', launchOptions: { args: [] }, viewport: { width: 390, height: 664 }, deviceScaleFactor: 3 } },
  ],
  webServer: { command: 'python3 -m http.server 8765 --bind 127.0.0.1',
    url: 'http://127.0.0.1:8765', reuseExistingServer: true, stdout: 'ignore', stderr: 'ignore' },
});
