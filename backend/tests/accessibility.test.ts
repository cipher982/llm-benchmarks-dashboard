/**
 * Accessibility Testing Suite
 *
 * Automatically checks all pages for WCAG compliance issues including:
 * - Color contrast ratios
 * - Keyboard navigation
 * - ARIA attributes
 * - Form labels
 *
 * Run with: npm test tests/accessibility.test.ts
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

const PAGES_TO_TEST = [
  { path: '/status', name: 'Status Page' },
  { path: '/cloud', name: 'Cloud Benchmarks' },
  { path: '/local', name: 'Local Benchmarks' },
];

test.describe('Accessibility Tests', () => {
  PAGES_TO_TEST.forEach(({ path, name }) => {
    test(`${name} should not have accessibility violations`, async ({ page }) => {
      await page.goto(`${BASE_URL}${path}`);

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Run axe accessibility scan
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      // Log violations for debugging
      if (accessibilityScanResults.violations.length > 0) {
        console.log(`\n❌ Accessibility violations found on ${name}:`);
        accessibilityScanResults.violations.forEach((violation) => {
          console.log(`\n- ${violation.id}: ${violation.description}`);
          console.log(`  Impact: ${violation.impact}`);
          console.log(`  Help: ${violation.helpUrl}`);
          violation.nodes.forEach((node) => {
            console.log(`    HTML: ${node.html.substring(0, 100)}...`);
          });
        });
      }

      // Fail test if violations found
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test(`${name} should have sufficient color contrast`, async ({ page }) => {
      await page.goto(`${BASE_URL}${path}`);
      await page.waitForLoadState('networkidle');

      // Specifically check color contrast
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['color-contrast'])
        .analyze();

      if (accessibilityScanResults.violations.length > 0) {
        console.log(`\n❌ Color contrast violations on ${name}:`);
        accessibilityScanResults.violations.forEach((violation) => {
          violation.nodes.forEach((node) => {
            console.log(`  Element: ${node.html.substring(0, 100)}...`);
            console.log(`  Contrast ratio issue: ${node.failureSummary}`);
          });
        });
      }

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });
});
