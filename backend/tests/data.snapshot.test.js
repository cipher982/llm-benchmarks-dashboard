/**
 * Data Structure Snapshot Tests
 * 
 * These tests capture the current "good" state of your data structures
 * and will fail if changes affect the output in unexpected ways.
 * 
 * Run with: npm test
 * Update snapshots with: npm test -- --updateSnapshot
 */

const fetch = require('node-fetch');

const API_URL = process.env.TEST_API_URL || 'https://api.llm-benchmarks.com';
const TIMEOUT = 30000;

// Helper to normalize data for consistent snapshots
function createDataSnapshot(data) {
  return {
    // Count-based snapshots (stable over time)
    counts: {
      speedDistribution: data.speedDistribution.length,
      timeSeries: data.timeSeries.models.length,
      table: data.table.length,
      timestamps: data.timeSeries.timestamps.length
    },
    
    // Structure snapshots (should never change)
    structure: {
      speedDistributionKeys: data.speedDistribution.length > 0 
        ? Object.keys(data.speedDistribution[0]).sort()
        : [],
      timeSeriesKeys: Object.keys(data.timeSeries).sort(),
      timeSeriesModelKeys: data.timeSeries.models.length > 0
        ? Object.keys(data.timeSeries.models[0]).sort()
        : [],
      tableKeys: data.table.length > 0
        ? Object.keys(data.table[0]).sort()
        : []
    },
    
    // Sample data for validation (first few entries, sorted for stability)
    samples: {
      providers: [...new Set([
        ...data.speedDistribution.map(m => m.provider),
        ...data.table.map(m => m.provider)
      ])].sort(),
      
      // First 5 model names (sorted) to catch naming changes
      modelNames: [...new Set([
        ...data.speedDistribution.map(m => m.model_name),
        ...data.table.map(m => m.model_name)
      ])].sort().slice(0, 10),
      
      // Density point structure (should be consistent)
      densityPointStructure: data.speedDistribution.length > 0 && 
        data.speedDistribution[0].density_points.length > 0
        ? Object.keys(data.speedDistribution[0].density_points[0]).sort()
        : []
    },
    
    // Value ranges to catch dramatic changes
    ranges: {
      speedDistMeans: data.speedDistribution.length > 0 ? {
        min: Math.min(...data.speedDistribution.map(m => m.mean_tokens_per_second)),
        max: Math.max(...data.speedDistribution.map(m => m.mean_tokens_per_second)),
        count: data.speedDistribution.filter(m => m.mean_tokens_per_second > 0).length
      } : null,
      
      tableMeans: data.table.length > 0 ? {
        min: Math.min(...data.table.map(m => m.tokens_per_second_mean)),
        max: Math.max(...data.table.map(m => m.tokens_per_second_mean)),
        count: data.table.filter(m => m.tokens_per_second_mean > 0).length
      } : null
    }
  };
}

describe('Data Structure Snapshot Tests', () => {
  
  test('processed data structure snapshot (3 days)', async () => {
    const response = await fetch(`${API_URL}/api/processed?days=3&bypass_cache=true`, {
      timeout: TIMEOUT
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    
    const snapshot = createDataSnapshot(data);
    
    // This will create a snapshot file on first run
    expect(snapshot).toMatchSnapshot('processed-data-3days');
  }, TIMEOUT);

  test('processed data structure snapshot (12 days)', async () => {
    const response = await fetch(`${API_URL}/api/processed?days=12&bypass_cache=true`, {
      timeout: TIMEOUT
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    
    const snapshot = createDataSnapshot(data);
    
    expect(snapshot).toMatchSnapshot('processed-data-12days');
  }, TIMEOUT);
  
  test('model naming consistency over time', async () => {
    const response = await fetch(`${API_URL}/api/processed?days=3&bypass_cache=true`);
    const data = await response.json();
    
    // Extract all unique model names and create a naming quality report
    const allModelNames = [...new Set([
      ...data.speedDistribution.map(m => m.model_name),
      ...data.table.map(m => m.model_name)
    ])].sort();
    
    const namingAnalysis = {
      totalUniqueModels: allModelNames.length,
      
      // Categorize names by quality patterns
      cleanNames: allModelNames.filter(name => 
        !name.includes('/') && 
        !name.includes('meta-llama/meta-llama') &&
        name.length < 50
      ).length,
      
      suspiciousNames: allModelNames.filter(name =>
        name.includes('/') ||
        name.includes('meta-llama/meta-llama') ||
        name.length > 50
      ),
      
      // Provider coverage
      providersRepresented: [...new Set(data.table.map(m => m.provider))].sort(),
      
      // Length distribution
      nameLengths: {
        shortest: Math.min(...allModelNames.map(n => n.length)),
        longest: Math.max(...allModelNames.map(n => n.length)),
        average: Math.round(allModelNames.reduce((sum, n) => sum + n.length, 0) / allModelNames.length)
      }
    };
    
    // This snapshot will catch if model naming gets worse
    expect(namingAnalysis).toMatchSnapshot('model-naming-analysis');
    
    // Enforce zero suspicious names
    if (namingAnalysis.suspiciousNames.length > 0) {
      console.error('Suspicious model names detected:', namingAnalysis.suspiciousNames);
    }
    expect(namingAnalysis.suspiciousNames).toHaveLength(0);
  }, TIMEOUT);

  test('density points data structure consistency', async () => {
    const response = await fetch(`${API_URL}/api/processed?days=3&bypass_cache=true`);
    const data = await response.json();
    
    // Analyze density points structure across all models
    const densityAnalysis = {
      modelsWithDensityPoints: data.speedDistribution.filter(m => 
        m.density_points && Array.isArray(m.density_points) && m.density_points.length > 0
      ).length,
      
      totalModels: data.speedDistribution.length,
      
      // Structure of density points (should be consistent)
      densityPointStructure: data.speedDistribution.length > 0 && 
        data.speedDistribution[0].density_points &&
        data.speedDistribution[0].density_points.length > 0
        ? {
            pointCount: data.speedDistribution[0].density_points.length,
            keys: Object.keys(data.speedDistribution[0].density_points[0]).sort(),
            xRange: {
              min: Math.min(...data.speedDistribution[0].density_points.map(p => p.x)),
              max: Math.max(...data.speedDistribution[0].density_points.map(p => p.x))
            }
          }
        : null
    };
    
    expect(densityAnalysis).toMatchSnapshot('density-points-structure');
    
    // All models should have density points
    expect(densityAnalysis.modelsWithDensityPoints).toBe(densityAnalysis.totalModels);
  }, TIMEOUT);
});