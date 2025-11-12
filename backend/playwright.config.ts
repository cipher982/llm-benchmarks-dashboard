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
    // Start our custom test server that finds an available port
    command: 'node tests/utils/start-test-server.js',
    // Don't specify a URL - our fixtures will read the dynamic port
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      // Provide MongoDB URI for dev server (use existing or mock with fast timeouts)
      MONGODB_URI: process.env.MONGODB_URI ||
        'mongodb://localhost:27017/test-db?serverSelectionTimeoutMS=2000&connectTimeoutMS=2000',
    },
  },
});
