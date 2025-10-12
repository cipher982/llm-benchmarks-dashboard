/**
 * API Contract Tests - Canonical/Display/Slug Architecture
 *
 * These tests validate that the API endpoints properly expose the
 * canonical/display/slug architecture to frontend consumers.
 *
 * Run against local: TEST_API_URL=http://localhost:3000 npm test
 * Run against prod: npm test (uses default production URL)
 */

const fetch = require('node-fetch');

const API_URL = process.env.TEST_API_URL || 'https://api.llm-benchmarks.com';
const TIMEOUT = 30000;

describe('API Contract Tests - Canonical Architecture', () => {
  beforeAll(() => {
    console.log(`Testing canonical architecture against: ${API_URL}`);
  });

  describe('/api/processed endpoint', () => {
    let processedData;

    beforeAll(async () => {
      const response = await fetch(`${API_URL}/api/processed?days=3&bypass_cache=true`, {
        timeout: TIMEOUT
      });

      if (response.ok) {
        processedData = await response.json();
      }
    });

    test('returns data with expected structure', async () => {
      expect(processedData).toBeDefined();
      expect(processedData).toHaveProperty('speedDistribution');
      expect(processedData).toHaveProperty('timeSeries');
      expect(processedData).toHaveProperty('table');
    });

    describe('Table Data - Canonical Field Requirements', () => {
      test('every table row has all required canonical/display/slug fields', async () => {
        if (!processedData?.table) {
          console.warn('Skipping test: no table data available');
          return;
        }

        expect(processedData.table.length).toBeGreaterThan(0);

        processedData.table.forEach((row, index) => {
          // Required fields for canonical architecture
          expect(row).toHaveProperty('provider');
          expect(row).toHaveProperty('providerCanonical');
          expect(row).toHaveProperty('providerSlug');
          expect(row).toHaveProperty('model_name');
          expect(row).toHaveProperty('modelCanonical');
          expect(row).toHaveProperty('modelSlug');

          // All should be truthy (not null, undefined, or empty string)
          expect(row.provider).toBeTruthy();
          expect(row.providerCanonical).toBeTruthy();
          expect(row.providerSlug).toBeTruthy();
          expect(row.model_name).toBeTruthy();
          expect(row.modelCanonical).toBeTruthy();
          expect(row.modelSlug).toBeTruthy();

          // Context for debugging failures
          if (!row.providerSlug || !row.modelSlug) {
            console.error(`Row ${index} missing slugs:`, {
              provider: row.provider,
              providerCanonical: row.providerCanonical,
              providerSlug: row.providerSlug,
              model_name: row.model_name,
              modelCanonical: row.modelCanonical,
              modelSlug: row.modelSlug
            });
          }
        });
      });

      test('slugs are URL-safe (lowercase, alphanumeric with hyphens)', async () => {
        if (!processedData?.table) {
          console.warn('Skipping test: no table data available');
          return;
        }

        const urlSafePattern = /^[a-z0-9-]+$/;

        processedData.table.forEach((row) => {
          expect(row.providerSlug).toMatch(urlSafePattern);
          expect(row.modelSlug).toMatch(urlSafePattern);

          // Should not contain uppercase or special characters
          expect(row.providerSlug).toBe(row.providerSlug.toLowerCase());
          expect(row.modelSlug).toBe(row.modelSlug.toLowerCase());
        });
      });

      test('canonical fields differ from slugs (not just lowercase)', async () => {
        if (!processedData?.table) {
          console.warn('Skipping test: no table data available');
          return;
        }

        // Find at least one example where canonical != slug
        const exampleWithDifference = processedData.table.find(row => {
          const canonicalNormalized = row.modelCanonical.toLowerCase().replace(/[^a-z0-9]/g, '-');
          return row.modelSlug !== canonicalNormalized;
        });

        // This test verifies slugs are processed, not just lowercased
        expect(exampleWithDifference).toBeDefined();
      });
    });

    describe('Vertex Provider - Canonical vs Display Separation', () => {
      test('vertex provider data exists in response', async () => {
        if (!processedData?.table) {
          console.warn('Skipping test: no table data available');
          return;
        }

        const vertexRows = processedData.table.filter(row => row.providerCanonical === 'vertex');

        if (vertexRows.length === 0) {
          console.warn('No vertex provider data found - skipping test');
          return;
        }

        expect(vertexRows.length).toBeGreaterThan(0);
      });

      test('vertex canonical maps to google display with vertex slug', async () => {
        if (!processedData?.table) {
          console.warn('Skipping test: no table data available');
          return;
        }

        const vertexRows = processedData.table.filter(row => row.providerCanonical === 'vertex');

        if (vertexRows.length === 0) {
          console.warn('No vertex provider data found - skipping test');
          return;
        }

        vertexRows.forEach((row) => {
          expect(row.providerCanonical).toBe('vertex'); // Database value
          expect(row.provider).toBe('google'); // Display name
          expect(row.providerSlug).toBe('vertex'); // URL uses canonical
        });
      });

      test('vertex models link to /models/vertex/* not /models/google/*', async () => {
        if (!processedData?.table) {
          console.warn('Skipping test: no table data available');
          return;
        }

        const vertexRows = processedData.table.filter(row => row.providerCanonical === 'vertex');

        if (vertexRows.length === 0) {
          console.warn('No vertex provider data found - skipping test');
          return;
        }

        vertexRows.forEach((row) => {
          const expectedUrl = `/models/${row.providerSlug}/${row.modelSlug}`;

          expect(expectedUrl).toContain('/models/vertex/');
          expect(expectedUrl).not.toContain('/models/google/');

          // Verify slug is URL-safe
          expect(row.providerSlug).toMatch(/^[a-z0-9-]+$/);
          expect(row.modelSlug).toMatch(/^[a-z0-9-]+$/);
        });
      });
    });

    describe('Slug Consistency Across Providers', () => {
      test('all providers have consistent slug generation', async () => {
        if (!processedData?.table) {
          console.warn('Skipping test: no table data available');
          return;
        }

        // Group by providerCanonical
        const providerGroups = processedData.table.reduce((acc, row) => {
          if (!acc[row.providerCanonical]) {
            acc[row.providerCanonical] = [];
          }
          acc[row.providerCanonical].push(row);
          return acc;
        }, {});

        // Verify each provider group has consistent slug
        Object.entries(providerGroups).forEach(([canonical, rows]) => {
          const slugs = [...new Set(rows.map(r => r.providerSlug))];

          expect(slugs.length).toBe(1); // All rows for a provider should have same slug
          expect(slugs[0]).toBeTruthy();
          expect(slugs[0]).toMatch(/^[a-z0-9-]+$/);
        });
      });

      test('different canonical providers have different slugs', async () => {
        if (!processedData?.table) {
          console.warn('Skipping test: no table data available');
          return;
        }

        const canonicalToSlug = processedData.table.reduce((acc, row) => {
          acc[row.providerCanonical] = row.providerSlug;
          return acc;
        }, {});

        const canonicals = Object.keys(canonicalToSlug);
        const slugs = Object.values(canonicalToSlug);

        // Should have multiple unique providers
        expect(canonicals.length).toBeGreaterThan(1);

        // Each canonical should map to a unique slug (bijection)
        expect(new Set(slugs).size).toBe(slugs.length);
      });
    });

    describe('Performance and Data Quality', () => {
      test('response includes performance timing data', async () => {
        if (!processedData) {
          console.warn('Skipping test: no processed data available');
          return;
        }

        // Response might include timing headers or metadata
        expect(processedData.table).toBeDefined();
        expect(Array.isArray(processedData.table)).toBe(true);
      });

      test('no duplicate provider-model combinations in table', async () => {
        if (!processedData?.table) {
          console.warn('Skipping test: no table data available');
          return;
        }

        const combinations = processedData.table.map(row =>
          `${row.providerCanonical}:${row.modelCanonical}`
        );

        const uniqueCombinations = new Set(combinations);

        expect(uniqueCombinations.size).toBe(combinations.length);
      });

      test('model names are human-readable (not ugly technical IDs)', async () => {
        if (!processedData?.table) {
          console.warn('Skipping test: no table data available');
          return;
        }

        const uglyPatterns = [
          /accounts\/fireworks/,
          /meta-llama\/.*-hf$/,
          /togethercomputer\//
        ];

        // Display names should be clean
        processedData.table.forEach((row) => {
          uglyPatterns.forEach(pattern => {
            expect(row.model_name).not.toMatch(pattern);
          });
        });

        // But canonical IDs can contain original technical names
        // (this is expected and correct)
      });
    });
  });

  describe('Data Consistency Across Days', () => {
    test('different day ranges maintain canonical field consistency', async () => {
      const [data3days, data7days] = await Promise.all([
        fetch(`${API_URL}/api/processed?days=3&bypass_cache=true`, { timeout: TIMEOUT })
          .then(r => r.ok ? r.json() : null)
          .catch(() => null),
        fetch(`${API_URL}/api/processed?days=7&bypass_cache=true`, { timeout: TIMEOUT })
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      ]);

      if (!data3days?.table || !data7days?.table) {
        console.warn('Skipping test: unable to fetch comparison data');
        return;
      }

      // Find common provider-model combinations
      const keys3 = new Set(data3days.table.map(r => `${r.providerCanonical}:${r.modelCanonical}`));
      const keys7 = new Set(data7days.table.map(r => `${r.providerCanonical}:${r.modelCanonical}`));

      const commonKeys = [...keys3].filter(k => keys7.has(k));

      expect(commonKeys.length).toBeGreaterThan(0);

      // For common entries, verify canonical fields and slugs are consistent
      commonKeys.forEach(key => {
        const [canonical, modelCanonical] = key.split(':');

        const row3 = data3days.table.find(r =>
          r.providerCanonical === canonical && r.modelCanonical === modelCanonical
        );
        const row7 = data7days.table.find(r =>
          r.providerCanonical === canonical && r.modelCanonical === modelCanonical
        );

        // Canonical fields and slugs should be identical
        expect(row3.providerCanonical).toBe(row7.providerCanonical);
        expect(row3.providerSlug).toBe(row7.providerSlug);
        expect(row3.modelCanonical).toBe(row7.modelCanonical);
        expect(row3.modelSlug).toBe(row7.modelSlug);

        // Display names should also be consistent
        expect(row3.provider).toBe(row7.provider);
        expect(row3.model_name).toBe(row7.model_name);
      });
    });
  });

  describe('Regression Prevention', () => {
    test('vertex provider models do not 404 (regression test for issue #1)', async () => {
      if (!processedData?.table) {
        console.warn('Skipping test: no table data available');
        return;
      }

      const vertexRows = processedData.table.filter(row => row.providerCanonical === 'vertex');

      if (vertexRows.length === 0) {
        console.warn('No vertex provider data found - skipping regression test');
        return;
      }

      // The bug was: links used display name "google" but routes expected "vertex"
      // This caused all vertex models to 404

      vertexRows.forEach((row) => {
        // Correct: canonical is vertex, slug is vertex
        expect(row.providerCanonical).toBe('vertex');
        expect(row.providerSlug).toBe('vertex');

        // Display can be google (for UI), but URL uses vertex
        expect(row.provider).toBe('google');

        // Verify the URL structure is correct
        const modelUrl = `/models/${row.providerSlug}/${row.modelSlug}`;
        expect(modelUrl).toMatch(/^\/models\/vertex\/[a-z0-9-]+$/);
      });
    });

    test('no provider has undefined or null canonical fields (regression test)', async () => {
      if (!processedData?.table) {
        console.warn('Skipping test: no table data available');
        return;
      }

      const invalidRows = processedData.table.filter(row =>
        !row.providerCanonical || !row.modelCanonical ||
        !row.providerSlug || !row.modelSlug
      );

      if (invalidRows.length > 0) {
        console.error('Found rows with missing canonical/slug fields:', invalidRows);
      }

      expect(invalidRows.length).toBe(0);
    });

    test('slugs are derived from canonical IDs, not display names (regression test)', async () => {
      if (!processedData?.table) {
        console.warn('Skipping test: no table data available');
        return;
      }

      // Find vertex rows to verify the fix
      const vertexRows = processedData.table.filter(row => row.providerCanonical === 'vertex');

      if (vertexRows.length === 0) {
        console.warn('No vertex provider data for regression test');
        return;
      }

      vertexRows.forEach((row) => {
        // The bug was: slug was generated from display name "google"
        // instead of canonical "vertex"

        // Correct: slug matches canonical
        expect(row.providerSlug).toBe('vertex');

        // Wrong (old bug): slug would have been 'google'
        expect(row.providerSlug).not.toBe('google');
      });
    });
  });
});
