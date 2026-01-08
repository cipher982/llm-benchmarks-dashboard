/**
 * Time Series Processing Tests
 *
 * These tests verify the time series data processing pipeline, with focus on:
 * - Timestamp range generation (covers full time window)
 * - Data alignment to grid timestamps
 * - Downsampling behavior for longer time ranges
 *
 * Critical regression test: The generateTimestampRange function must always
 * generate timestamps that reach "now", not fall short due to downsampling.
 */

// Mock MongoDB connection before importing modules that need it
jest.mock('../utils/connectToMongoDB', () => jest.fn().mockResolvedValue(true));

// Mock mongoose for deprecation_snapshots model
jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  return {
    ...actualMongoose,
    models: {},
    model: jest.fn().mockReturnValue({
      find: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([])
      })
    }),
    Schema: actualMongoose.Schema,
  };
});

const { processTimeSeriesData } = require('../utils/dataProcessing');

// Helper to create mock CloudBenchmark data
const createMockBenchmark = (overrides = {}) => ({
  _id: 'test-id',
  provider: 'test-provider',
  providerCanonical: 'test-provider',
  providerSlug: 'test-provider',
  model_name: 'test-model',
  modelCanonical: 'test-model',
  modelSlug: 'test-model',
  tokens_per_second: [50, 51, 52],
  tokens_per_second_timestamps: [
    new Date(Date.now() - 60 * 60 * 1000),  // 1 hour ago
    new Date(Date.now() - 30 * 60 * 1000),  // 30 min ago
    new Date(Date.now() - 5 * 60 * 1000),   // 5 min ago
  ],
  time_to_first_token: [0.1, 0.1, 0.1],
  time_to_first_token_timestamps: [
    new Date(Date.now() - 60 * 60 * 1000),
    new Date(Date.now() - 30 * 60 * 1000),
    new Date(Date.now() - 5 * 60 * 1000),
  ],
  tokens_per_second_mean: 51,
  tokens_per_second_min: 50,
  tokens_per_second_max: 52,
  tokens_per_second_quartiles: [50, 51, 52],
  time_to_first_token_mean: 0.1,
  time_to_first_token_min: 0.1,
  time_to_first_token_max: 0.1,
  time_to_first_token_quartiles: [0.1, 0.1, 0.1],
  display_name: 'test-model',
  ...overrides,
});

describe('Time Series Processing', () => {

  describe('Timestamp Range Generation', () => {

    test('3-day range timestamps reach current time', async () => {
      const data = [createMockBenchmark()];
      const result = await processTimeSeriesData(data, 3);

      const timestamps = result.timestamps;
      const lastTimestamp = new Date(timestamps[timestamps.length - 1]);
      const now = new Date();

      // Last timestamp should be within 30 minutes of now
      const diffMinutes = (now - lastTimestamp) / (1000 * 60);
      expect(diffMinutes).toBeLessThan(30);
    });

    test('7-day range timestamps reach current time', async () => {
      const data = [createMockBenchmark()];
      const result = await processTimeSeriesData(data, 7);

      const timestamps = result.timestamps;
      const lastTimestamp = new Date(timestamps[timestamps.length - 1]);
      const now = new Date();

      // Last timestamp should be within 60 minutes of now (larger tolerance for downsampled data)
      const diffMinutes = (now - lastTimestamp) / (1000 * 60);
      expect(diffMinutes).toBeLessThan(60);
    });

    test('14-day range timestamps reach current time (REGRESSION)', async () => {
      // This is the critical regression test for the bug fixed in commit 2f12195
      // Previously, 14-day ranges only covered ~12 days due to downsampling math error
      const data = [createMockBenchmark()];
      const result = await processTimeSeriesData(data, 14);

      const timestamps = result.timestamps;
      const lastTimestamp = new Date(timestamps[timestamps.length - 1]);
      const now = new Date();

      // Last timestamp should be within 2 hours of now
      // (14 days downsampled to 144 points = ~2.3 hour intervals)
      const diffMinutes = (now - lastTimestamp) / (1000 * 60);
      expect(diffMinutes).toBeLessThan(150); // 2.5 hours tolerance
    });

    test('30-day range timestamps reach current time', async () => {
      const data = [createMockBenchmark()];
      const result = await processTimeSeriesData(data, 30);

      const timestamps = result.timestamps;
      const lastTimestamp = new Date(timestamps[timestamps.length - 1]);
      const now = new Date();

      // Last timestamp should be within 5 hours of now
      // (30 days downsampled to 144 points = ~5 hour intervals)
      const diffMinutes = (now - lastTimestamp) / (1000 * 60);
      expect(diffMinutes).toBeLessThan(300); // 5 hours tolerance
    });

    test('timestamp range covers full requested period', async () => {
      const days = 14;
      const data = [createMockBenchmark()];
      const result = await processTimeSeriesData(data, days);

      const timestamps = result.timestamps;
      const firstTimestamp = new Date(timestamps[0]);
      const lastTimestamp = new Date(timestamps[timestamps.length - 1]);

      // Range should cover approximately the requested number of days
      const rangeDays = (lastTimestamp - firstTimestamp) / (1000 * 60 * 60 * 24);
      expect(rangeDays).toBeGreaterThan(days - 1); // Allow 1 day tolerance
      expect(rangeDays).toBeLessThanOrEqual(days);
    });

    test('timestamps are evenly distributed', async () => {
      const data = [createMockBenchmark()];
      const result = await processTimeSeriesData(data, 14);

      const timestamps = result.timestamps.map(t => new Date(t).getTime());

      // Calculate intervals between consecutive timestamps
      const intervals = [];
      for (let i = 1; i < timestamps.length; i++) {
        intervals.push(timestamps[i] - timestamps[i - 1]);
      }

      // All intervals should be roughly equal (within 30 min tolerance for rounding)
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const maxDeviation = Math.max(...intervals.map(i => Math.abs(i - avgInterval)));

      // Max deviation should be less than 1 hour (grid rounding effects)
      expect(maxDeviation).toBeLessThan(60 * 60 * 1000);
    });

  });

  describe('Data Alignment', () => {

    test('aligns data points to nearest grid timestamp', async () => {
      const now = new Date();
      const recentTimestamp = new Date(now.getTime() - 15 * 60 * 1000); // 15 min ago

      const data = [createMockBenchmark({
        tokens_per_second: [99],
        tokens_per_second_timestamps: [recentTimestamp],
      })];

      const result = await processTimeSeriesData(data, 3);

      // Find the provider's values
      const model = result.models.find(m => m.model_name === 'test-model');
      const provider = model.providers.find(p => p.providerCanonical === 'test-provider');

      // The value 99 should appear somewhere in the recent portion of the array
      const hasRecentValue = provider.values.slice(-5).some(v => v === 99);
      expect(hasRecentValue).toBe(true);
    });

    test('returns null for grid slots without data', async () => {
      // Create data with only one very old timestamp
      const oldTimestamp = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago

      const data = [createMockBenchmark({
        tokens_per_second: [50],
        tokens_per_second_timestamps: [oldTimestamp],
      })];

      const result = await processTimeSeriesData(data, 3);

      const model = result.models.find(m => m.model_name === 'test-model');
      const provider = model.providers.find(p => p.providerCanonical === 'test-provider');

      // Most recent slots should be null since data is old
      const recentValues = provider.values.slice(-10);
      const nullCount = recentValues.filter(v => v === null).length;
      expect(nullCount).toBeGreaterThan(5);
    });

  });

  describe('Model Grouping', () => {

    test('groups benchmarks by model name', async () => {
      const data = [
        createMockBenchmark({ model_name: 'model-a', providerCanonical: 'provider-1' }),
        createMockBenchmark({ model_name: 'model-a', providerCanonical: 'provider-2' }),
        createMockBenchmark({ model_name: 'model-b', providerCanonical: 'provider-1' }),
      ];

      const result = await processTimeSeriesData(data, 3);

      expect(result.models).toHaveLength(2);

      const modelA = result.models.find(m => m.model_name === 'model-a');
      expect(modelA.providers).toHaveLength(2);

      const modelB = result.models.find(m => m.model_name === 'model-b');
      expect(modelB.providers).toHaveLength(1);
    });

    test('preserves provider metadata in grouped data', async () => {
      const data = [createMockBenchmark({
        providerCanonical: 'bedrock',
        deprecated: true,
        deprecation_date: '2025-01-01',
      })];

      const result = await processTimeSeriesData(data, 3);

      const model = result.models[0];
      const provider = model.providers[0];

      expect(provider.providerCanonical).toBe('bedrock');
      expect(provider.deprecated).toBe(true);
      expect(provider.deprecation_date).toBe('2025-01-01');
    });

  });

  describe('Output Structure', () => {

    test('returns correct structure with timestamps and models', async () => {
      const data = [createMockBenchmark()];
      const result = await processTimeSeriesData(data, 3);

      expect(result).toHaveProperty('timestamps');
      expect(result).toHaveProperty('models');
      expect(Array.isArray(result.timestamps)).toBe(true);
      expect(Array.isArray(result.models)).toBe(true);
    });

    test('model values array length matches timestamps length', async () => {
      const data = [createMockBenchmark()];
      const result = await processTimeSeriesData(data, 3);

      const timestampCount = result.timestamps.length;

      result.models.forEach(model => {
        model.providers.forEach(provider => {
          expect(provider.values.length).toBe(timestampCount);
        });
      });
    });

    test('timestamps are ISO 8601 strings', async () => {
      const data = [createMockBenchmark()];
      const result = await processTimeSeriesData(data, 3);

      result.timestamps.forEach(ts => {
        expect(typeof ts).toBe('string');
        expect(() => new Date(ts)).not.toThrow();
        expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      });
    });

  });

});
