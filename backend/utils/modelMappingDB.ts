import { CloudBenchmark } from '../types/CloudData';
import type { ProcessedData } from './processCloud';
import connectToMongoDB from './connectToMongoDB';
import mongoose from 'mongoose';
import { createSlug } from './seoUtils';
import { getProviderDisplayName } from './providerMetadata';

// Model schema for the models collection
const ModelSchema = new mongoose.Schema({
  provider: { type: String, required: true },
  model_id: { type: String, required: true },
  display_name: { type: String, required: true },
  enabled: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  imported_from: { type: String, default: 'api' },
  deprecated: { type: Boolean, default: false },
  deprecation_date: { type: String },
  successor_model: { type: String },
  deprecation_reason: { type: String }
});

const Model = mongoose.models.ModelMapping || mongoose.model('ModelMapping', ModelSchema, 'models');


// Cache for model mappings to avoid repeated DB queries
interface ModelMetadata {
  display_name: string;
  deprecated?: boolean;
  deprecation_date?: string;
  successor_model?: string;
  deprecation_reason?: string;
}

let modelMappingCache: { [key: string]: ModelMetadata } | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get model metadata from database (display name and deprecation info)
 * Uses caching with multiple fallback layers for reliability
 */
async function getModelMetadata(provider: string, modelId: string): Promise<ModelMetadata> {
  try {
    // Check cache first
    const now = Date.now();
    if (modelMappingCache && (now - cacheTimestamp) < CACHE_TTL) {
      const cacheKey = `${provider}:${modelId}`;
      if (modelMappingCache[cacheKey]) {
        return modelMappingCache[cacheKey];
      }
    }

    // Refresh cache if needed (with timeout protection)
    if (!modelMappingCache || (now - cacheTimestamp) >= CACHE_TTL) {
      const refreshPromise = refreshModelMappingCache();
      // Don't wait more than 2 seconds for cache refresh
      await Promise.race([
        refreshPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Cache refresh timeout')), 2000))
      ]);
    }

    // Try cache again after refresh
    const cacheKey = `${provider}:${modelId}`;

    if (modelMappingCache && modelMappingCache[cacheKey]) {
        return modelMappingCache[cacheKey];
    }

    // Fallback: return original model name if not found
    return { display_name: modelId };

  } catch (error) {
    // Multiple fallback strategies - never fail completely
    return { display_name: modelId };
  }
}

/**
 * Refresh the model mapping cache from database
 */
async function refreshModelMappingCache(): Promise<void> {
  try {
    await connectToMongoDB();

    const models = await Model.find({}, {
      provider: 1,
      model_id: 1,
      display_name: 1,
      deprecated: 1,
      deprecation_date: 1,
      successor_model: 1,
      deprecation_reason: 1
    });

    const newCache: { [key: string]: ModelMetadata } = {};
    models.forEach(model => {
      const cacheKey = `${model.provider}:${model.model_id}`;
      newCache[cacheKey] = {
        display_name: model.display_name,
        deprecated: model.deprecated,
        deprecation_date: model.deprecation_date,
        successor_model: model.successor_model,
        deprecation_reason: model.deprecation_reason
      };
    });

    modelMappingCache = newCache;
    cacheTimestamp = Date.now();
  } catch (error) {
    // Silently fail - cache will remain as-is
  }
}

/**
 * New database-powered version of mapModelNames
 * Replaces the old hardcoded mapping function
 */
export const mapModelNamesDB = async (data: ProcessedData[]): Promise<CloudBenchmark[]> => {
  try {
    // Ensure cache is loaded
    if (!modelMappingCache) {
      await refreshModelMappingCache();
    }

    // Group data by provider-model combination for processing
    const modelGroups = new Map<string, ProcessedData[]>();
    const metadataMap = new Map<string, ModelMetadata>();

    for (const item of data) {
      // Skip invalid data
      if (!item.provider || !item.model_name) {
        continue;
      }

      const providerCanonical = item.providerCanonical ?? item.provider;
      const modelCanonical = item.modelCanonical ?? item.model_name;
      const metadata = await getModelMetadata(providerCanonical, modelCanonical);

      const groupKey = JSON.stringify({
        providerCanonical,
        modelDisplay: metadata.display_name,
      });

      // Store metadata separately
      metadataMap.set(groupKey, metadata);

      const group = modelGroups.get(groupKey) ?? [];
      group.push({
        ...item,
        providerCanonical,
        modelCanonical,
      });
      modelGroups.set(groupKey, group);
    }

    // Merge groups into aggregated results (same logic as original mapModelNames)
    const mergedData: CloudBenchmark[] = await Promise.all(
      Array.from(modelGroups.entries()).map(async ([groupKey, items]) => {
      const { providerCanonical, modelDisplay } = JSON.parse(groupKey) as { providerCanonical: string; modelDisplay: string };
      const originalProviderCanonical = providerCanonical;
      const originalModelCanonical = items[0].modelCanonical ?? items[0].model_name; // The canonical model_id from MongoDB
      const metadata = metadataMap.get(groupKey) || { display_name: modelDisplay };

      // Compute last benchmark date from all items in group (not just first!)
      const allTimestamps = items
        .map(item => item.last_run_ts)
        .filter(ts => ts != null);
      const lastBenchmarkDate = allTimestamps.length > 0
        ? new Date(Math.max(...allTimestamps.map(ts => ts.getTime()))).toISOString()
        : undefined;

      const mergedItem: CloudBenchmark = {
        _id: items[0]._id,
        provider: getProviderDisplayName(providerCanonical),
        providerCanonical: originalProviderCanonical,
        providerSlug: createSlug(originalProviderCanonical),
        model_name: modelDisplay, // This is now the display name
        modelCanonical: originalModelCanonical,
        modelSlug: createSlug(originalModelCanonical), // Use the original model_id for the slug
        tokens_per_second: [],
        time_to_first_token: [],
        tokens_per_second_mean: 0,
        tokens_per_second_min: Infinity,
        tokens_per_second_max: -Infinity,
        tokens_per_second_quartiles: [0, 0, 0],
        time_to_first_token_mean: 0,
        time_to_first_token_min: Infinity,
        time_to_first_token_max: -Infinity,
        time_to_first_token_quartiles: [0, 0, 0],
        display_name: modelDisplay,
        deprecated: metadata.deprecated,
        deprecation_date: metadata.deprecation_date,
        successor_model: metadata.successor_model,
        last_benchmark_date: lastBenchmarkDate,
      };

      // Aggregate data from all items in the group
      items.forEach(item => {
        mergedItem.tokens_per_second.push(...item.tokens_per_second);
        if (item.time_to_first_token) {
          mergedItem.time_to_first_token!.push(...item.time_to_first_token);
        }
        mergedItem.tokens_per_second_mean += item.tokens_per_second_mean;
        mergedItem.tokens_per_second_min = Math.min(mergedItem.tokens_per_second_min, item.tokens_per_second_min);
        mergedItem.tokens_per_second_max = Math.max(mergedItem.tokens_per_second_max, item.tokens_per_second_max);
        mergedItem.time_to_first_token_mean += item.time_to_first_token_mean;
        
        // Handle optional time_to_first_token values
        if (item.time_to_first_token_min !== undefined) {
          mergedItem.time_to_first_token_min = Math.min(
            mergedItem.time_to_first_token_min ?? Infinity,
            item.time_to_first_token_min
          );
        }
        if (item.time_to_first_token_max !== undefined) {
          mergedItem.time_to_first_token_max = Math.max(
            mergedItem.time_to_first_token_max ?? -Infinity,
            item.time_to_first_token_max
          );
        }
      });

      // Calculate averages
      mergedItem.tokens_per_second_mean /= items.length;
      mergedItem.time_to_first_token_mean /= items.length;

      return mergedItem;
    })
  );

    return mergedData;

  } catch (error) {
    console.error('Error in mapModelNamesDB:', error);
    throw error;
  }
};

/**
 * Feature flag function - allows switching between old and new mapping
 * Includes automatic fallback if database system fails
 */
export const mapModelNames = async (data: ProcessedData[], useDatabase: boolean = false): Promise<CloudBenchmark[]> => {
  if (useDatabase) {
    try {
      // Try database-powered mapping first
      return await mapModelNamesDB(data);
    } catch (error) {
      console.error('Database mapping failed, falling back to hardcoded mapping:', error);
      // Automatic fallback to old system if database fails
      const { mapModelNamesHardcoded } = await import('./modelMapping');
      return mapModelNamesHardcoded(data);
    }
  } else {
    // Import and use original mapping function
    const { mapModelNamesHardcoded } = await import('./modelMapping');
    return mapModelNamesHardcoded(data);
  }
};

/**
 * Utility function to clear the cache (useful for testing)
 */
export const clearModelMappingCache = (): void => {
  modelMappingCache = null;
  cacheTimestamp = 0;
};

export default mapModelNamesDB;
