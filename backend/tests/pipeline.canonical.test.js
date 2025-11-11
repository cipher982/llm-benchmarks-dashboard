/**
 * Pipeline Integration Tests - Canonical/Display/Slug Architecture
 *
 * These tests verify the end-to-end pipeline from raw MongoDB data
 * to final frontend-ready data, with special focus on:
 * - Canonical field immutability
 * - Slug generation consistency
 * - Display name mapping
 * - Vertex provider handling
 */

const { cleanTransformCloud } = require('../utils/processCloud');
const { mapModelNamesHardcoded } = require('../utils/modelMapping');
const { mapModelNamesDB } = require('../utils/modelMappingDB');
const { processRawTableData, processSpeedDistData, processTimeSeriesData } = require('../utils/dataProcessing');
const { createSlug } = require('../utils/seoUtils');
const { getProviderDisplayName } = require('../utils/providerMetadata');

// Mock MongoDB connection for DB mapper tests
jest.mock('../utils/connectToMongoDB', () => jest.fn().mockResolvedValue(true));

describe('Pipeline Integration Tests - Canonical Architecture', () => {

  // Sample raw data representing different scenarios
  const createRawBenchmark = (overrides = {}) => ({
    _id: 'test-id-1',
    run_ts: '2025-01-15T12:00:00Z',
    model_name: 'test-model',
    display_name: 'Test Model',
    temperature: 0.7,
    gen_ts: '2025-01-15T12:00:00Z',
    requested_tokens: 100,
    output_tokens: 100,
    generate_time: 1.5,
    tokens_per_second: 50,
    provider: 'test-provider',
    streaming: true,
    time_to_first_token: 0.1,
    ...overrides
  });

  const defaultProcessedFields = {
    tokens_per_second_timestamps: [new Date('2025-01-15T12:00:00Z')],
    time_to_first_token_timestamps: [new Date('2025-01-15T12:00:00Z')]
  };

  describe('Stage 1: cleanTransformCloud (Raw → ProcessedData)', () => {
    test('creates canonical fields from raw data', () => {
      const rawData = [createRawBenchmark({ provider: 'vertex', model_name: 'gemini-1.5-pro' })];

      const result = cleanTransformCloud(rawData);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        provider: 'vertex',
        providerCanonical: 'vertex',
        model_name: 'gemini-1.5-pro',
        modelCanonical: 'gemini-1.5-pro'
      });
    });

    test('validates and skips records with missing provider', () => {
      const rawData = [
        createRawBenchmark({ provider: null }),
        createRawBenchmark({ provider: 'valid-provider' })
      ];

      const result = cleanTransformCloud(rawData);

      expect(result).toHaveLength(1);
      expect(result[0].provider).toBe('valid-provider');
    });

    test('validates and skips records with missing model_name', () => {
      const rawData = [
        createRawBenchmark({ model_name: '' }),
        createRawBenchmark({ model_name: 'valid-model' })
      ];

      const result = cleanTransformCloud(rawData);

      expect(result).toHaveLength(1);
      expect(result[0].model_name).toBe('valid-model');
    });

    test('aggregates multiple samples for same provider-model combination', () => {
      const rawData = [
        createRawBenchmark({ provider: 'openai', model_name: 'gpt-4', tokens_per_second: 40 }),
        createRawBenchmark({ provider: 'openai', model_name: 'gpt-4', tokens_per_second: 60 })
      ];

      const result = cleanTransformCloud(rawData);

      expect(result).toHaveLength(1);
      expect(result[0].tokens_per_second).toEqual([40, 60]);
      expect(result[0].tokens_per_second_mean).toBeCloseTo(50);
    });
  });

  describe('Stage 2: mapModelNames (ProcessedData → CloudBenchmark)', () => {
    describe('Canonical Field Immutability', () => {
      test('preserves vertex as canonical provider (does not mutate to google)', () => {
        const processedData = [{
          _id: 'test-1',
          ...defaultProcessedFields,
          provider: 'vertex',
          providerCanonical: 'vertex',
          model_name: 'gemini-1.5-pro',
          modelCanonical: 'gemini-1.5-pro',
          tokens_per_second: [50],
          time_to_first_token: [0.1],
          tokens_per_second_mean: 50,
          tokens_per_second_min: 50,
          tokens_per_second_max: 50,
          tokens_per_second_quartiles: [50, 50, 50],
          time_to_first_token_mean: 0.1,
          time_to_first_token_min: 0.1,
          time_to_first_token_max: 0.1,
          time_to_first_token_quartiles: [0.1, 0.1, 0.1]
        }];

        const result = mapModelNamesHardcoded(processedData);

        expect(result).toHaveLength(1);
        expect(result[0].providerCanonical).toBe('vertex');
        expect(result[0].provider).toBe('google'); // Display name
        expect(result[0].providerSlug).toBe('vertex'); // Slug from canonical
      });

      test('never mutates providerCanonical field', () => {
        const providers = ['openai', 'anthropic', 'vertex', 'azure', 'fireworks'];

        providers.forEach(originalProvider => {
          const processedData = [{
            _id: `test-${originalProvider}`,
            ...defaultProcessedFields,
            provider: originalProvider,
            providerCanonical: originalProvider,
            model_name: 'test-model',
            modelCanonical: 'test-model',
            tokens_per_second: [50],
            time_to_first_token: [0.1],
            tokens_per_second_mean: 50,
            tokens_per_second_min: 50,
            tokens_per_second_max: 50,
            tokens_per_second_quartiles: [50, 50, 50],
            time_to_first_token_mean: 0.1,
            time_to_first_token_min: 0.1,
            time_to_first_token_max: 0.1,
            time_to_first_token_quartiles: [0.1, 0.1, 0.1]
          }];

          const result = mapModelNamesHardcoded(processedData);

          expect(result[0].providerCanonical).toBe(originalProvider);
        });
      });

      test('never mutates modelCanonical field', () => {
        const processedData = [{
          _id: 'test-1',
          ...defaultProcessedFields,
          provider: 'openai',
          providerCanonical: 'openai',
          model_name: 'gpt-4-0613',
          modelCanonical: 'gpt-4-0613',
          tokens_per_second: [50],
          time_to_first_token: [0.1],
          tokens_per_second_mean: 50,
          tokens_per_second_min: 50,
          tokens_per_second_max: 50,
          tokens_per_second_quartiles: [50, 50, 50],
          time_to_first_token_mean: 0.1,
          time_to_first_token_min: 0.1,
          time_to_first_token_max: 0.1,
          time_to_first_token_quartiles: [0.1, 0.1, 0.1]
        }];

        const result = mapModelNamesHardcoded(processedData);

        expect(result[0].modelCanonical).toBe('gpt-4-0613');
        expect(result[0].model_name).toBe('gpt-4'); // Mapped display name
      });
    });

    describe('Slug Generation Consistency', () => {
      test('generates slugs from canonical fields, not display names', () => {
        const processedData = [{
          _id: 'test-1',
          ...defaultProcessedFields,
          provider: 'vertex',
          providerCanonical: 'vertex',
          model_name: 'gemini-1.5-pro',
          modelCanonical: 'gemini-1.5-pro',
          tokens_per_second: [50],
          time_to_first_token: [0.1],
          tokens_per_second_mean: 50,
          tokens_per_second_min: 50,
          tokens_per_second_max: 50,
          tokens_per_second_quartiles: [50, 50, 50],
          time_to_first_token_mean: 0.1,
          time_to_first_token_min: 0.1,
          time_to_first_token_max: 0.1,
          time_to_first_token_quartiles: [0.1, 0.1, 0.1]
        }];

        const result = mapModelNamesHardcoded(processedData);

        // Slug should be from canonical "vertex", not display "google"
        expect(result[0].providerSlug).toBe(createSlug('vertex'));
        expect(result[0].providerSlug).not.toBe(createSlug('google'));

        expect(result[0].modelSlug).toBe(createSlug('gemini-1.5-pro'));
      });

      test('all slugs are URL-safe and consistent', () => {
        const processedData = [{
          _id: 'test-1',
          ...defaultProcessedFields,
          provider: 'test',
          providerCanonical: 'Test Provider With Spaces',
          model_name: 'test',
          modelCanonical: 'Test/Model:Name',
          tokens_per_second: [50],
          time_to_first_token: [0.1],
          tokens_per_second_mean: 50,
          tokens_per_second_min: 50,
          tokens_per_second_max: 50,
          tokens_per_second_quartiles: [50, 50, 50],
          time_to_first_token_mean: 0.1,
          time_to_first_token_min: 0.1,
          time_to_first_token_max: 0.1,
          time_to_first_token_quartiles: [0.1, 0.1, 0.1]
        }];

        const result = mapModelNamesHardcoded(processedData);

        // Slugs should be URL-safe
        expect(result[0].providerSlug).toMatch(/^[a-z0-9-]+$/);
        expect(result[0].modelSlug).toMatch(/^[a-z0-9-]+$/);

        // Verify they don't contain special characters
        expect(result[0].providerSlug).not.toContain(' ');
        expect(result[0].modelSlug).not.toContain('/');
        expect(result[0].modelSlug).not.toContain(':');
      });
    });

    describe('Display Name Mapping', () => {
      test('maps display names while preserving canonicals', () => {
        const processedData = [{
          _id: 'test-1',
          ...defaultProcessedFields,
          provider: 'openai',
          providerCanonical: 'openai',
          model_name: 'gpt-4-0613',
          modelCanonical: 'gpt-4-0613',
          tokens_per_second: [50],
          time_to_first_token: [0.1],
          tokens_per_second_mean: 50,
          tokens_per_second_min: 50,
          tokens_per_second_max: 50,
          tokens_per_second_quartiles: [50, 50, 50],
          time_to_first_token_mean: 0.1,
          time_to_first_token_min: 0.1,
          time_to_first_token_max: 0.1,
          time_to_first_token_quartiles: [0.1, 0.1, 0.1]
        }];

        const result = mapModelNamesHardcoded(processedData);

        expect(result[0]).toMatchObject({
          provider: 'openai', // Display
          providerCanonical: 'openai', // Canonical (unchanged)
          model_name: 'gpt-4', // Mapped display name
          modelCanonical: 'gpt-4-0613', // Canonical (unchanged)
        });
      });

      test('groups models with same display name but different canonical IDs', () => {
        const processedData = [
          {
            _id: 'test-1',
            ...defaultProcessedFields,
            provider: 'openai',
            providerCanonical: 'openai',
            model_name: 'gpt-4-0613',
            modelCanonical: 'gpt-4-0613',
            tokens_per_second: [40],
            time_to_first_token: [0.1],
            tokens_per_second_mean: 40,
            tokens_per_second_min: 40,
            tokens_per_second_max: 40,
            tokens_per_second_quartiles: [40, 40, 40],
            time_to_first_token_mean: 0.1,
            time_to_first_token_min: 0.1,
            time_to_first_token_max: 0.1,
            time_to_first_token_quartiles: [0.1, 0.1, 0.1]
          },
          {
            _id: 'test-2',
            ...defaultProcessedFields,
            provider: 'openai',
            providerCanonical: 'openai',
            model_name: 'gpt-4-0314',
            modelCanonical: 'gpt-4-0314',
            tokens_per_second: [60],
            time_to_first_token: [0.2],
            tokens_per_second_mean: 60,
            tokens_per_second_min: 60,
            tokens_per_second_max: 60,
            tokens_per_second_quartiles: [60, 60, 60],
            time_to_first_token_mean: 0.2,
            time_to_first_token_min: 0.2,
            time_to_first_token_max: 0.2,
            time_to_first_token_quartiles: [0.2, 0.2, 0.2]
          }
        ];

        const result = mapModelNamesHardcoded(processedData);

        // Both should map to "gpt-4" display name and be merged
        expect(result).toHaveLength(1);
        expect(result[0].model_name).toBe('gpt-4');
        expect(result[0].tokens_per_second).toEqual([40, 60]);
      });
    });

    describe('Type Safety', () => {
      test('returns CloudBenchmark[] with all required slug fields', () => {
        const processedData = [{
          _id: 'test-1',
          ...defaultProcessedFields,
          provider: 'openai',
          providerCanonical: 'openai',
          model_name: 'gpt-4',
          modelCanonical: 'gpt-4',
          tokens_per_second: [50],
          time_to_first_token: [0.1],
          tokens_per_second_mean: 50,
          tokens_per_second_min: 50,
          tokens_per_second_max: 50,
          tokens_per_second_quartiles: [50, 50, 50],
          time_to_first_token_mean: 0.1,
          time_to_first_token_min: 0.1,
          time_to_first_token_max: 0.1,
          time_to_first_token_quartiles: [0.1, 0.1, 0.1]
        }];

        const result = mapModelNamesHardcoded(processedData);

        // Verify CloudBenchmark shape
        expect(result[0]).toHaveProperty('providerSlug');
        expect(result[0]).toHaveProperty('modelSlug');
        expect(result[0].providerSlug).toBeTruthy();
        expect(result[0].modelSlug).toBeTruthy();
      });
    });
  });

  describe('Stage 3: processRawTableData (CloudBenchmark → TableRow)', () => {
    test('throws error if slugs are missing', () => {
      const invalidData = [{
        _id: 'test-1',
        provider: 'openai',
        providerCanonical: 'openai',
        // Missing providerSlug
        model_name: 'gpt-4',
        modelCanonical: 'gpt-4',
        modelSlug: 'gpt-4',
        tokens_per_second: [50],
        time_to_first_token: [0.1],
        tokens_per_second_mean: 50,
        time_to_first_token_mean: 0.1
      }];

      expect(() => processRawTableData(invalidData)).rejects.toThrow('Missing slugs');
    });

    test('preserves canonical and slug fields in table rows', async () => {
      const cloudBenchmarks = [{
        _id: 'test-1',
        provider: 'google',
        providerCanonical: 'vertex',
        providerSlug: 'vertex',
        model_name: 'gemini-1.5-pro',
        modelCanonical: 'gemini-1.5-pro',
        modelSlug: 'gemini-15-pro',
        tokens_per_second: [50],
        time_to_first_token: [0.1],
        tokens_per_second_mean: 50,
        tokens_per_second_min: 45,
        tokens_per_second_max: 55,
        time_to_first_token_mean: 0.1
      }];

      const result = await processRawTableData(cloudBenchmarks);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        provider: 'google', // Display
        providerCanonical: 'vertex', // Canonical
        providerSlug: 'vertex', // Slug
        model_name: 'gemini-1.5-pro',
        modelCanonical: 'gemini-1.5-pro',
        modelSlug: 'gemini-15-pro'
      });
    });

    test('carries lifecycle metadata into table rows', async () => {
      const cloudBenchmarks = [{
        _id: 'test-2',
        provider: 'openai',
        providerCanonical: 'openai',
        providerSlug: 'openai',
        model_name: 'gpt-4o',
        modelCanonical: 'gpt-4o-20241120',
        modelSlug: 'gpt-4o-20241120',
        tokens_per_second: [60],
        time_to_first_token: [0.2],
        tokens_per_second_mean: 60,
        tokens_per_second_min: 60,
        tokens_per_second_max: 60,
        time_to_first_token_mean: 0.2,
        lifecycle_status: 'stale',
        lifecycle_confidence: 'medium',
        lifecycle_reasons: ['Last success 65 days ago.'],
        lifecycle_recommended_actions: ['investigate_provider_catalog'],
        lifecycle_catalog_state: 'missing',
        lifecycle_computed_at: '2025-11-10T12:00:00Z',
        lifecycle_metrics: {
          successes_30d: 0,
          errors_7d: 5
        }
      }];

      const result = await processRawTableData(cloudBenchmarks);

      expect(result[0].lifecycle_status).toBe('stale');
      expect(result[0].lifecycle_recommended_actions).toContain('investigate_provider_catalog');
      expect(result[0].lifecycle_computed_at).toBe('2025-11-10T12:00:00Z');
    });

    test('filters flagged lifecycle statuses when hideFlagged is true', async () => {
      const cloudBenchmarks = [{
        _id: 'test-active',
        provider: 'openai',
        providerCanonical: 'openai',
        providerSlug: 'openai',
        model_name: 'gpt-4o',
        modelCanonical: 'gpt-4o',
        modelSlug: 'gpt-4o',
        tokens_per_second: [60],
        time_to_first_token: [0.2],
        tokens_per_second_mean: 60,
        tokens_per_second_min: 60,
        tokens_per_second_max: 60,
        time_to_first_token_mean: 0.2,
        lifecycle_status: 'active'
      }, {
        _id: 'test-flagged',
        provider: 'openai',
        providerCanonical: 'openai',
        providerSlug: 'openai',
        model_name: 'gpt-4o-preview',
        modelCanonical: 'gpt-4o-preview',
        modelSlug: 'gpt-4o-preview',
        tokens_per_second: [45],
        time_to_first_token: [0.3],
        tokens_per_second_mean: 45,
        tokens_per_second_min: 45,
        tokens_per_second_max: 45,
        time_to_first_token_mean: 0.3,
        lifecycle_status: 'likely_deprecated'
      }];

      const result = await processRawTableData(cloudBenchmarks, { hideFlagged: true });

      expect(result).toHaveLength(1);
      expect(result[0].lifecycle_status).toBe('active');
    });
  });

  describe('End-to-End Pipeline Integration', () => {
    test('vertex provider flows correctly through entire pipeline', async () => {
      // Step 1: Raw data from MongoDB
      const rawData = [createRawBenchmark({
        provider: 'vertex',
        model_name: 'gemini-1.5-pro',
        tokens_per_second: 50,
        time_to_first_token: 0.1
      })];

      // Step 2: Clean and transform
      const processedData = cleanTransformCloud(rawData);
      expect(processedData[0].providerCanonical).toBe('vertex');

      // Step 3: Map model names
      const mappedData = mapModelNamesHardcoded(processedData);
      expect(mappedData[0]).toMatchObject({
        provider: 'google', // Display
        providerCanonical: 'vertex', // Canonical preserved
        providerSlug: 'vertex', // Slug from canonical
        modelCanonical: 'gemini-1.5-pro'
      });

      // Step 4: Generate table data
      const tableData = await processRawTableData(mappedData);
      expect(tableData[0]).toMatchObject({
        provider: 'google',
        providerCanonical: 'vertex',
        providerSlug: 'vertex'
      });

      // Verify URL would be /models/vertex/gemini-15-pro
      const expectedUrl = `/models/${tableData[0].providerSlug}/${tableData[0].modelSlug}`;
      expect(expectedUrl).toContain('/models/vertex/');
      expect(expectedUrl).not.toContain('/models/google/');
    });

    test('multiple providers maintain separate canonical identities', async () => {
      const rawData = [
        createRawBenchmark({ provider: 'vertex', model_name: 'gemini-1.5-pro' }),
        createRawBenchmark({ provider: 'openai', model_name: 'gpt-4' }),
        createRawBenchmark({ provider: 'anthropic', model_name: 'claude-3-opus' })
      ];

      const processedData = cleanTransformCloud(rawData);
      const mappedData = mapModelNamesHardcoded(processedData);

      const vertexEntry = mappedData.find(m => m.providerCanonical === 'vertex');
      const openaiEntry = mappedData.find(m => m.providerCanonical === 'openai');
      const anthropicEntry = mappedData.find(m => m.providerCanonical === 'anthropic');

      expect(vertexEntry).toBeDefined();
      expect(vertexEntry.providerCanonical).toBe('vertex');
      expect(vertexEntry.providerSlug).toBe('vertex');
      expect(vertexEntry.provider).toBe('google');

      expect(openaiEntry.providerCanonical).toBe('openai');
      expect(anthropicEntry.providerCanonical).toBe('anthropic');
    });
  });

  describe('Provider Metadata Helper', () => {
    test('getProviderDisplayName maps vertex to google', () => {
      expect(getProviderDisplayName('vertex')).toBe('google');
    });

    test('getProviderDisplayName returns canonical for unmapped providers', () => {
      expect(getProviderDisplayName('openai')).toBe('openai');
      expect(getProviderDisplayName('anthropic')).toBe('anthropic');
      expect(getProviderDisplayName('unknown-provider')).toBe('unknown-provider');
    });

    test('getProviderDisplayName handles empty input', () => {
      expect(getProviderDisplayName('')).toBe('');
      expect(getProviderDisplayName(null)).toBe(null);
    });
  });

  describe('Data Validation and Error Handling', () => {
    test('filters out invalid entries early in pipeline', () => {
      const rawData = [
        createRawBenchmark({ provider: null, model_name: 'test' }),
        createRawBenchmark({ provider: 'valid', model_name: '' }),
        createRawBenchmark({ provider: 'valid', model_name: 'valid', tokens_per_second: 0.5 }),
        createRawBenchmark({ provider: 'valid', model_name: 'valid', tokens_per_second: 50 })
      ];

      const result = cleanTransformCloud(rawData);

      // Should only have 1 valid entry
      expect(result).toHaveLength(1);
      expect(result[0].provider).toBe('valid');
      expect(result[0].model_name).toBe('valid');
      expect(result[0].tokens_per_second_mean).toBe(50);
    });

    test('pipeline fails fast when encountering data without slugs', async () => {
      const invalidCloudBenchmark = [{
        provider: 'openai',
        model_name: 'gpt-4',
        tokens_per_second: [50],
        time_to_first_token: [0.1],
        tokens_per_second_mean: 50
        // Missing providerSlug, modelSlug, providerCanonical, modelCanonical
      }];

      await expect(processRawTableData(invalidCloudBenchmark)).rejects.toThrow();
    });
  });
});
