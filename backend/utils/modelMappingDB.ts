import { CloudBenchmark } from '../types/CloudData';
import connectToMongoDB from './connectToMongoDB';
import mongoose from 'mongoose';
import { createSlug } from './seoUtils';

// Model schema for the models collection
const ModelSchema = new mongoose.Schema({
  provider: { type: String, required: true },
  model_id: { type: String, required: true },
  display_name: { type: String, required: true },
  enabled: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  imported_from: { type: String, default: 'api' }
});

const Model = mongoose.models.ModelMapping || mongoose.model('ModelMapping', ModelSchema, 'models');

// Cache for model mappings to avoid repeated DB queries
let modelMappingCache: { [key: string]: string } | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get model display name from database
 * Uses caching with multiple fallback layers for reliability
 */ 
async function getModelDisplayName(provider: string, modelId: string): Promise<string> {
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
    
    // DEBUG: Log cache lookup details
    console.log(`🔍 CACHE LOOKUP: Provider="${provider}", ModelId="${modelId}"`);
    console.log(`🔍 CACHE KEY: "${cacheKey}"`);
    console.log(`🔍 CACHE HAS KEY: ${modelMappingCache ? Object.keys(modelMappingCache).includes(cacheKey) : 'No cache'}`);
    if (modelMappingCache) {
      console.log(`🔍 AVAILABLE KEYS: ${Object.keys(modelMappingCache).filter(k => k.includes(provider)).slice(0, 3)}`);
    }
    
    if (modelMappingCache && modelMappingCache[cacheKey]) {
      console.log(`✅ FOUND MAPPING: "${modelId}" → "${modelMappingCache[cacheKey]}"`);
      return modelMappingCache[cacheKey];
    }

    // Fallback: return original model name if not found
    console.warn(`❌ Model mapping not found for ${provider}/${modelId}, using original name`);
    return modelId;

  } catch (error) {
    console.error('Error getting model display name:', error);
    // Multiple fallback strategies - never fail completely
    return modelId;
  }
}

/**
 * Refresh the model mapping cache from database
 */
async function refreshModelMappingCache(): Promise<void> {
  try {
    await connectToMongoDB();
    
    const models = await Model.find({}, { provider: 1, model_id: 1, display_name: 1 });
    
    const newCache: { [key: string]: string } = {};
    models.forEach(model => {
      const cacheKey = `${model.provider}:${model.model_id}`;
      newCache[cacheKey] = model.display_name;
    });

    modelMappingCache = newCache;
    cacheTimestamp = Date.now();
    
    console.log(`Model mapping cache refreshed with ${models.length} models`);
  } catch (error) {
    console.error('Error refreshing model mapping cache:', error);
  }
}

/**
 * New database-powered version of mapModelNames
 * Replaces the old hardcoded mapping function
 */
export const mapModelNamesDB = async (data: CloudBenchmark[]): Promise<CloudBenchmark[]> => {
  try {
    // Ensure cache is loaded
    if (!modelMappingCache) {
      await refreshModelMappingCache();
    }

    // Group data by provider-model combination for processing
    const modelGroups: { [key: string]: CloudBenchmark[] } = {};
    
    for (const item of data) {
      // Skip invalid data
      if (!item.provider || !item.model_name) {
        continue;
      }

      const displayName = await getModelDisplayName(item.provider, item.model_name);
      const groupKey = `${item.provider}_${displayName}`;
      
      if (!modelGroups[groupKey]) {
        modelGroups[groupKey] = [];
      }
      
      modelGroups[groupKey].push(item);
    }

    // Merge groups into aggregated results (same logic as original mapModelNames)
    const mergedData: CloudBenchmark[] = Object.entries(modelGroups).map(([groupKey, items]) => {
      const [provider, modelName] = groupKey.split('_');
      const originalModelId = items[0].model_name; // The canonical model_id from MongoDB
      const mergedItem: CloudBenchmark = {
        _id: items[0]._id,
        provider: provider,
        providerSlug: createSlug(provider),
        model_name: modelName, // This is now the display name
        modelSlug: createSlug(originalModelId), // Use the original model_id for the slug
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
    });

    return mergedData;

  } catch (error) {
    console.error('Error in mapModelNamesDB:', error);
    // Fallback: return original data without mapping
    return data;
  }
};

/**
 * Feature flag function - allows switching between old and new mapping
 * Includes automatic fallback if database system fails
 */
export const mapModelNames = async (data: CloudBenchmark[], useDatabase: boolean = false): Promise<CloudBenchmark[]> => {
  if (useDatabase) {
    try {
      // Try database-powered mapping first
      return await mapModelNamesDB(data);
    } catch (error) {
      console.error('Database mapping failed, falling back to hardcoded mapping:', error);
      // Automatic fallback to old system if database fails
      const { mapModelNames: originalMapModelNames } = await import('./modelMapping');
      return originalMapModelNames(data);
    }
  } else {
    // Import and use original mapping function
    const { mapModelNames: originalMapModelNames } = await import('./modelMapping');
    return originalMapModelNames(data);
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