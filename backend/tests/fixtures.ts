/**
 * Playwright Fixtures
 *
 * Custom fixtures for test setup, including:
 * - Dynamic base URL (port allocation)
 * - API mocking (for fast, reliable tests)
 */

import { test as base, Page } from '@playwright/test';
import { getTestPortSync } from './utils/get-test-port';
import fs from 'fs';
import path from 'path';

// Read the port from the file (synchronously for fixture setup)
function getDynamicBaseURL(): string {
  const portFile = path.join(__dirname, 'utils', '.test-server-port');

  if (fs.existsSync(portFile)) {
    const port = fs.readFileSync(portFile, 'utf8').trim();
    return `http://localhost:${port}`;
  }

  // Fallback to environment variable or default
  return process.env.TEST_SERVER_URL || process.env.TEST_URL || 'http://localhost:3000';
}

// Load API fixtures
const fixturesPath = path.join(__dirname, 'fixtures', 'api-responses.json');
const apiFixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));

/**
 * Mock API responses for testing
 * This prevents tests from depending on database connectivity
 */
async function mockApiRoutes(page: Page) {
  // Only mock our API endpoints, not Next.js internal requests
  await page.route(/^.*\/api\/(processed|status|model|local)(\?.*)?$/, async (route) => {
    const url = route.request().url();

    if (url.includes('/api/processed')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(apiFixtures.processed),
      });
    } else if (url.includes('/api/status')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(apiFixtures.status),
      });
    } else if (url.includes('/api/model')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          model: apiFixtures.processed.table[0],
          timeSeries: {},
        }),
      });
    } else if (url.includes('/api/local')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(apiFixtures.local),
      });
    } else {
      // Let other requests pass through
      await route.continue();
    }
  });
}

// Extend base test with custom fixtures
export const test = base.extend({
  // Override baseURL for each test
  baseURL: async ({}, use) => {
    const url = getDynamicBaseURL();
    await use(url);
  },

  // Enable API mocking in CI (no real database), use real API locally
  page: async ({ page }, use) => {
    if (process.env.CI) {
      await mockApiRoutes(page);
    }
    await use(page);
  },
});

export { expect } from '@playwright/test';
