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

// Lifecycle status schema (model_status collection)
const LifecycleStatusSchema = new mongoose.Schema({
  provider: { type: String, required: true },
  model_id: { type: String, required: true },
  status: { type: String },
  confidence: { type: String },
  reasons: { type: [String], default: [] },
  recommended_actions: { type: [String], default: [] },
  catalog_state: { type: String },
  computed_at: { type: Date },
  metrics: { type: mongoose.Schema.Types.Mixed }
});

const LifecycleStatusModel = mongoose.models.ModelLifecycleStatus ||
  mongoose.model('ModelLifecycleStatus', LifecycleStatusSchema, 'model_status');


// Cache for model mappings to avoid repeated DB queries
interface LifecycleMetrics {
  last_success?: string;
  successes_7d?: number;
  successes_30d?: number;
  successes_120d?: number;
  errors_7d?: number;
  errors_30d?: number;
  hard_failures_7d?: number;
  hard_failures_30d?: number;
}

interface LifecycleMetadata {
  status?: string;
  confidence?: string;
  reasons?: string[];
  recommended_actions?: string[];
  catalog_state?: string;
  computed_at?: string;
  metrics?: LifecycleMetrics;
}

interface ModelMetadata {
  display_name: string;
  deprecated?: boolean;
  deprecation_date?: string;
  successor_model?: string;
  deprecation_reason?: string;
  lifecycle?: LifecycleMetadata;
}

let modelMappingCache: { [key: string]: ModelMetadata } | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const toIsoString = (value: unknown): string | undefined => {
  if (!value) {
    return undefined;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  const parsed = new Date(value as string);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed.toISOString();
};

const normalizeLifecycleMetrics = (raw: any): LifecycleMetrics | undefined => {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }
  return {
    last_success: toIsoString(raw.last_success),
    successes_7d: typeof raw.successes_7d === 'number' ? raw.successes_7d : undefined,
    successes_30d: typeof raw.successes_30d === 'number' ? raw.successes_30d : undefined,
    successes_120d: typeof raw.successes_120d === 'number' ? raw.successes_120d : undefined,
    errors_7d: typeof raw.errors_7d === 'number' ? raw.errors_7d : undefined,
    errors_30d: typeof raw.errors_30d === 'number' ? raw.errors_30d : undefined,
    hard_failures_7d: typeof raw.hard_failures_7d === 'number' ? raw.hard_failures_7d : undefined,
    hard_failures_30d: typeof raw.hard_failures_30d === 'number' ? raw.hard_failures_30d : undefined,
  };
};

const toStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.map(item => String(item)).filter(Boolean);
};

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

    const lifecycleStatuses = await LifecycleStatusModel.find({}, {
      provider: 1,
      model_id: 1,
      status: 1,
      confidence: 1,
      reasons: 1,
      recommended_actions: 1,
      catalog_state: 1,
      computed_at: 1,
      metrics: 1
    }).lean();

    lifecycleStatuses.forEach(status => {
      const cacheKey = `${status.provider}:${status.model_id}`;
      const existing = newCache[cacheKey] || { display_name: status.model_id };

      newCache[cacheKey] = {
        ...existing,
        lifecycle: {
          status: status.status || undefined,
          confidence: status.confidence || undefined,
          reasons: toStringArray(status.reasons),
          recommended_actions: toStringArray(status.recommended_actions),
          catalog_state: status.catalog_state || undefined,
          computed_at: toIsoString(status.computed_at),
          metrics: normalizeLifecycleMetrics(status.metrics)
        }
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
      // Only compute if we have actual timestamps - don't fabricate dates
      const allTimestamps = items
        .map(item => item.last_run_ts)
        .filter((ts): ts is Date => ts != null);
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
        tokens_per_second_timestamps: [],  // Initialize timestamp array
        time_to_first_token: [],
        time_to_first_token_timestamps: [],  // Initialize timestamp array
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
        lifecycle_status: metadata.lifecycle?.status,
        lifecycle_confidence: metadata.lifecycle?.confidence,
        lifecycle_reasons: metadata.lifecycle?.reasons,
        lifecycle_recommended_actions: metadata.lifecycle?.recommended_actions,
        lifecycle_catalog_state: metadata.lifecycle?.catalog_state,
        lifecycle_computed_at: metadata.lifecycle?.computed_at,
        lifecycle_metrics: metadata.lifecycle?.metrics,
      };

      // Aggregate data from all items in the group
      items.forEach(item => {
        mergedItem.tokens_per_second.push(...item.tokens_per_second);
        mergedItem.tokens_per_second_timestamps.push(...item.tokens_per_second_timestamps);  // Preserve timestamps
        if (item.time_to_first_token) {
          mergedItem.time_to_first_token!.push(...item.time_to_first_token);
        }
        if (item.time_to_first_token_timestamps) {
          mergedItem.time_to_first_token_timestamps!.push(...item.time_to_first_token_timestamps);  // Preserve timestamps
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
