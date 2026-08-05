import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for LLM Benchmarks Dashboard
 *
 * This configuration uses a custom test server script that automatically
 * finds an available port, avoiding conflicts with other running services.
 *
 * To run tests:
 * 1. Start test server: node tests/utils/start-test-server.js (in another terminal)
 * 2. Run tests: npm run test:a11y
 *
 * Or use the webServer option below to start automatically.
 */

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    // baseURL will be set dynamically by the fixtures
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'node tests/utils/start-test-server.js',
    // Wait for the server to actually answer before running anything. Without
    // this Playwright raced the dev server's boot and the suite failed with
    // ERR_CONNECTION_REFUSED — which matters because `test:a11y` is a tracked
    // pre-deploy gate, so a flaky start blocked deploys.
    url: `http://localhost:${process.env.TEST_SERVER_PORT || 3210}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: { MONGODB_URI: '' },
  },
});
