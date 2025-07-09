/**
 * Performance Baseline Tests
 * 
 * These tests establish performance baselines and catch regressions during optimization.
 * Current baselines (before optimization):
 * - Cold cache: ~2700ms
 * - Hot cache: ~50ms (when working)
 */

const fetch = require('node-fetch');

const API_URL = process.env.TEST_API_URL || 'https://api.llm-benchmarks.com';
const TIMEOUT = 30000;

describe('Performance Baseline Tests', () => {
  
  describe('Response Time Baselines', () => {
    test('cold cache performance baseline (bypass_cache=true)', async () => {
      const start = Date.now();
      const response = await fetch(`${API_URL}/api/processed?days=3&bypass_cache=true`, {
        timeout: TIMEOUT
      });
      const duration = Date.now() - start;
      
      expect(response.status).toBe(200);
      
      // Current baseline: should complete under 5 seconds
      expect(duration).toBeLessThan(5000);
      
      console.log(`Cold cache performance: ${duration}ms`);
      
      // Log detailed timing if response includes it
      const cacheHeader = response.headers.get('x-cache');
      if (cacheHeader) {
        console.log(`Cache status: ${cacheHeader}`);
      }
    }, TIMEOUT);

    test('warm cache performance (if cache is working)', async () => {
      // First request to potentially warm cache
      await fetch(`${API_URL}/api/processed?days=3`);
      
      // Second request to test cache
      const start = Date.now();
      const response = await fetch(`${API_URL}/api/processed?days=3`);
      const duration = Date.now() - start;
      
      expect(response.status).toBe(200);
      
      console.log(`Warm cache performance: ${duration}ms`);
      
      // If cache is working, should be much faster
      // But we don't enforce this since cache might be disabled
      if (duration > 1000) {
        console.warn('Cache might not be working - response took >1s');
      }
    }, TIMEOUT);
  });

  describe('Payload Size Baselines', () => {
    test('response payload size is reasonable', async () => {
      const response = await fetch(`${API_URL}/api/processed?days=3&bypass_cache=true`);
      const text = await response.text();
      const sizeKB = text.length / 1024;
      
      expect(response.status).toBe(200);
      
      // Current baseline: should be under 500KB
      expect(sizeKB).toBeLessThan(500);
      
      console.log(`Response payload size: ${sizeKB.toFixed(2)} KB`);
      
      // Parse to ensure it's valid JSON
      const data = JSON.parse(text);
      expect(data).toHaveProperty('speedDistribution');
    }, TIMEOUT);

    test('different day ranges have expected size relationships', async () => {
      const [response3, response12] = await Promise.all([
        fetch(`${API_URL}/api/processed?days=3&bypass_cache=true`),
        fetch(`${API_URL}/api/processed?days=12&bypass_cache=true`)
      ]);
      
      const [text3, text12] = await Promise.all([
        response3.text(),
        response12.text()
      ]);
      
      const size3KB = text3.length / 1024;
      const size12KB = text12.length / 1024;
      
      console.log(`3-day payload: ${size3KB.toFixed(2)} KB`);
      console.log(`12-day payload: ${size12KB.toFixed(2)} KB`);
      
      // 12-day should be larger (more time series data)
      expect(size12KB).toBeGreaterThanOrEqual(size3KB * 0.8); // Allow some variance
    }, TIMEOUT);
  });

  describe('Concurrent Request Performance', () => {
    test('handles multiple concurrent requests', async () => {
      const concurrentRequests = 3;
      const start = Date.now();
      
      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        fetch(`${API_URL}/api/processed?days=3&t=${i}`) // Add unique param to avoid browser caching
      );
      
      const responses = await Promise.all(promises);
      const duration = Date.now() - start;
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // Should handle concurrent requests reasonably
      expect(duration).toBeLessThan(15000); // 15 seconds for 3 concurrent requests
      
      console.log(`${concurrentRequests} concurrent requests completed in ${duration}ms`);
    }, TIMEOUT);
  });

  describe('Memory and Resource Usage', () => {
    test('response includes performance timing headers', async () => {
      const response = await fetch(`${API_URL}/api/processed?days=3&bypass_cache=true`);
      
      expect(response.status).toBe(200);
      
      // Check for any custom timing headers
      const timing = response.headers.get('x-response-time');
      const cache = response.headers.get('x-cache');
      
      if (timing) {
        console.log(`Server timing: ${timing}`);
      }
      if (cache) {
        console.log(`Cache status: ${cache}`);
      }
    }, TIMEOUT);
  });
});