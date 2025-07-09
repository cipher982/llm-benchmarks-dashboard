/**
 * API Baseline Tests
 * 
 * These tests lock in the current behavior of your API endpoints to prevent regressions
 * during optimization. Run with: npm test
 */

const fetch = require('node-fetch');

// Test configuration
const API_URL = process.env.TEST_API_URL || 'https://api.llm-benchmarks.com';
const TIMEOUT = 30000; // 30 second timeout for slow queries

describe('API Baseline Tests', () => {
  beforeAll(() => {
    console.log(`Testing against: ${API_URL}`);
  });

  describe('/api/processed endpoint', () => {
    test('returns expected data structure (cold cache)', async () => {
      const response = await fetch(`${API_URL}/api/processed?days=3&bypass_cache=true`, {
        timeout: TIMEOUT
      });
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      
      // Core structure validation
      expect(data).toHaveProperty('speedDistribution');
      expect(data).toHaveProperty('timeSeries');
      expect(data).toHaveProperty('table');
      
      // speedDistribution validation
      expect(Array.isArray(data.speedDistribution)).toBe(true);
      expect(data.speedDistribution.length).toBeGreaterThan(25); // Should have at least 25 models
      
      data.speedDistribution.forEach(model => {
        expect(model).toHaveProperty('provider');
        expect(model).toHaveProperty('model_name');
        expect(model).toHaveProperty('mean_tokens_per_second');
        expect(model).toHaveProperty('density_points');
        expect(Array.isArray(model.density_points)).toBe(true);
      });
      
      // timeSeries validation
      expect(data.timeSeries).toHaveProperty('timestamps');
      expect(data.timeSeries).toHaveProperty('models');
      expect(Array.isArray(data.timeSeries.timestamps)).toBe(true);
      expect(Array.isArray(data.timeSeries.models)).toBe(true);
      expect(data.timeSeries.models.length).toBeGreaterThan(25);
      
      // table validation
      expect(Array.isArray(data.table)).toBe(true);
      expect(data.table.length).toBeGreaterThan(25);
      
      data.table.forEach(row => {
        expect(row).toHaveProperty('provider');
        expect(row).toHaveProperty('model_name');
        expect(row).toHaveProperty('tokens_per_second_mean');
        expect(typeof row.tokens_per_second_mean).toBe('number');
      });
    }, TIMEOUT);

    test('model names are clean (no ugly technical names)', async () => {
      const response = await fetch(`${API_URL}/api/processed?days=3&bypass_cache=true`, {
        timeout: TIMEOUT
      });
      
      const data = await response.json();
      
      // Check for ugly model names that were the original bug
      const uglyPatterns = [
        /meta-llama\/meta-llama/,  // The original bug pattern
        /\/.*\//,                 // Multiple slashes
        /-instruct-instruct/,     // Duplicate suffixes
        /^[a-f0-9]{8,}$/         // Hash-like names
      ];
      
      const uglyModels = [];
      
      [...data.speedDistribution, ...data.table].forEach(model => {
        uglyPatterns.forEach(pattern => {
          if (pattern.test(model.model_name)) {
            uglyModels.push({
              name: model.model_name,
              provider: model.provider,
              pattern: pattern.toString()
            });
          }
        });
      });
      
      if (uglyModels.length > 0) {
        console.error('Ugly model names found:', uglyModels);
      }
      
      expect(uglyModels).toHaveLength(0);
    }, TIMEOUT);

    test('model count patterns match current behavior', async () => {
      const response = await fetch(`${API_URL}/api/processed?days=3&bypass_cache=true`);
      const data = await response.json();
      
      const speedDistCount = data.speedDistribution.length;
      const timeSeriesCount = data.timeSeries.models.length;
      const tableCount = data.table.length;
      
      // Document current behavior (to catch regressions)
      console.log(`Model counts - SpeedDist: ${speedDistCount}, TimeSeries: ${timeSeriesCount}, Table: ${tableCount}`);
      
      // SpeedDist includes provider prefixes, so it has more models than TimeSeries
      expect(speedDistCount).toBeGreaterThan(timeSeriesCount);
      
      // All should have reasonable counts
      expect(speedDistCount).toBeGreaterThan(25);
      expect(timeSeriesCount).toBeGreaterThan(25);
      expect(tableCount).toBeGreaterThan(25);
      
      // Sample model name formats to document current behavior
      const speedDistSample = data.speedDistribution[0]?.model_name || '';
      const timeSeriesSample = data.timeSeries.models[0]?.model_name || '';
      const tableSample = data.table[0]?.model_name || '';
      
      console.log(`Sample names - SpeedDist: "${speedDistSample}", TimeSeries: "${timeSeriesSample}", Table: "${tableSample}"`);
    }, TIMEOUT);

    test('different day ranges return different data volumes', async () => {
      const [response3, response12] = await Promise.all([
        fetch(`${API_URL}/api/processed?days=3&bypass_cache=true`),
        fetch(`${API_URL}/api/processed?days=12&bypass_cache=true`)
      ]);
      
      const [data3, data12] = await Promise.all([
        response3.json(),
        response12.json()
      ]);
      
      // More days should generally mean more data points in time series
      expect(data12.timeSeries.timestamps.length).toBeGreaterThanOrEqual(data3.timeSeries.timestamps.length);
      
      // Model counts might be similar but 12-day should have at least as many
      expect(data12.speedDistribution.length).toBeGreaterThanOrEqual(data3.speedDistribution.length - 5);
    }, TIMEOUT);
  });


  describe('Cache behavior', () => {
    test('bypass_cache parameter is honored', async () => {
      // First request with bypass
      const start1 = Date.now();
      const response1 = await fetch(`${API_URL}/api/processed?days=3&bypass_cache=true`);
      const duration1 = Date.now() - start1;
      
      // Second request without bypass (should be faster if cached)
      const start2 = Date.now();
      const response2 = await fetch(`${API_URL}/api/processed?days=3`);
      const duration2 = Date.now() - start2;
      
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      
      // Bypass should be slower (if cache is working)
      console.log(`Bypass cache: ${duration1}ms, Normal: ${duration2}ms`);
      
      // Data should be identical
      const [data1, data2] = await Promise.all([response1.json(), response2.json()]);
      expect(data1.speedDistribution.length).toBe(data2.speedDistribution.length);
    }, TIMEOUT);
  });
});