import { CloudBenchmark } from '../types/CloudData';
import type { ProcessedData } from './processCloud';
import connectToMongoDB from './connectToMongoDB';
import mongoose from 'mongoose';
import { cached, clearCache } from './cache';
import { latestBenchmarkDate, mergeProcessedModelGroup } from './modelMappingMerge';

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
  transport_provider: { type: String, default: 'direct' },
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

// Derived cross-provider identity, maintained continuously by the reconciler.
const IdentitySchema = new mongoose.Schema({
  provider: { type: String, required: true },
  model_id: { type: String, required: true },
  canonical_key: { type: String },
  effective_from: { type: Date }
});

const IdentityModel = mongoose.models.ModelIdentity ||
  mongoose.model('ModelIdentity', IdentitySchema, 'bench_model_identity');

// Cache types
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
  /**
   * Cross-provider chart identity, from `bench_model_identity.canonical_key`.
   *
   * Deliberately separate from `display_name`. Names are presentation and now
   * come from a third party that can rename at will; identity must not move
   * when they do. Grouping charts on the name is what split
   * `claude-haiku-4.5` from `claude-haiku-4-5` into two lines for one model.
   * Undefined when the resolver has not placed the endpoint yet, in which case
   * it stays its own model rather than being guessed into someone else's.
   */
  identityKey?: string;
  enabled?: boolean;
  deprecated?: boolean;
  deprecation_date?: string;
  successor_model?: string;
  deprecation_reason?: string;
  lifecycle?: LifecycleMetadata;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const metadataCacheKey = (provider: string, modelId: string, transportProvider = 'direct'): string =>
  `${provider}:${modelId}:${transportProvider}`;

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
 * Get or refresh the model mapping cache from database
 */
async function getModelMappingCache(): Promise<{ [key: string]: ModelMetadata }> {
  return cached('model-mapping-cache', CACHE_TTL, async () => {
    await connectToMongoDB();

    const models = await Model.find({}, {
      provider: 1,
      model_id: 1,
      display_name: 1,
      enabled: 1,
      deprecated: 1,
      deprecation_date: 1,
      successor_model: 1,
      deprecation_reason: 1
    }).lean();

    // Newest relation per endpoint, which is what grouping must read. The
    // collection is append-only and keeps history, so an older row for the same
    // endpoint is a superseded opinion rather than a second model.
    const identityRows = await IdentityModel.find({}, {
      provider: 1,
      model_id: 1,
      canonical_key: 1,
      effective_from: 1
    }).sort({ effective_from: 1 }).lean();
    const identityByEndpoint = new Map<string, string>();
    identityRows.forEach(row => {
      if (!row.provider || !row.model_id || !row.canonical_key) return;
      identityByEndpoint.set(`${row.provider}:${row.model_id}`, String(row.canonical_key));
    });

    const newCache: { [key: string]: ModelMetadata } = {};
    models.forEach(model => {
      const cacheKey = metadataCacheKey(model.provider, model.model_id);
      newCache[cacheKey] = {
        identityKey: identityByEndpoint.get(`${model.provider}:${model.model_id}`),
        display_name: model.display_name || model.model_id,
        enabled: model.enabled !== false,
        deprecated: model.deprecated,
        deprecation_date: model.deprecation_date,
        successor_model: model.successor_model,
        deprecation_reason: model.deprecation_reason
      };
    });

    const lifecycleStatuses = await LifecycleStatusModel.find({}, {
      provider: 1,
      model_id: 1,
      transport_provider: 1,
      status: 1,
      confidence: 1,
      reasons: 1,
      recommended_actions: 1,
      catalog_state: 1,
      computed_at: 1,
      metrics: 1
    }).lean();

    // Mongo rows written before transport-aware lifecycle status implicitly
    // belong to the direct lane. Keep explicit values last so a legacy row
    // cannot nondeterministically overwrite an explicit direct record while
    // the one-time index migration is being rolled through environments.
    lifecycleStatuses.sort((left: any, right: any) =>
      Number(Boolean(left.transport_provider)) - Number(Boolean(right.transport_provider))
    );
    lifecycleStatuses.forEach((status: any) => {
      const cacheKey = metadataCacheKey(status.provider, status.model_id, status.transport_provider || 'direct');
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

    return newCache;
  });
}

export function getModelMetadataSync(
  provider: string,
  modelId: string,
  transportProvider: string,
  cache: { [key: string]: ModelMetadata }
): ModelMetadata {
  const exact = cache[metadataCacheKey(provider, modelId, transportProvider)];
  if (exact) return exact;
  // Routed series must not inherit direct lifecycle status. Reuse only the
  // display/deprecation metadata from the direct model record.
  if (transportProvider !== 'direct') {
    const direct = cache[metadataCacheKey(provider, modelId)];
    if (direct) return { ...direct, lifecycle: undefined };
  }
  return { display_name: modelId };
}

/**
 * Where a display name comes from. The only thing that ever differed between
 * the database mapper and the hardcoded table it replaced.
 */
export type MetadataLookup = (providerCanonical: string, modelCanonical: string, transportProvider?: string) => ModelMetadata;

/**
 * Group benchmark rows into published lines and merge each group's samples.
 *
 * A lane is `(providerCanonical, modelCanonical, transportProvider)` — one
 * endpoint, on one transport. It used to be keyed on `display_name`, which made
 * a presentation string load-bearing in two directions at once: two spellings
 * of one model published as two lines, and two genuinely different endpoints
 * that happened to share a label were averaged into one series. Names now come
 * from a third-party catalogue that can rename at will, so keying identity on
 * them is a standing invitation to both faults.
 *
 * Cross-provider unification happens above this, on `identityKey`, so that one
 * model served by three providers is one chart line with three providers rather
 * than three lines.
 */
export const groupAndMerge = (data: ProcessedData[], lookup: MetadataLookup): CloudBenchmark[] => {
  const modelGroups = new Map<string, ProcessedData[]>();
  const metadataMap = new Map<string, ModelMetadata>();

  for (const item of data) {
    // Skip invalid data
    if (!item.provider || !item.model_name) {
      continue;
    }

    const providerCanonical = item.providerCanonical;
    const modelCanonical = item.modelCanonical;
    const transportProvider = item.transportProvider || 'direct';
    const metadata = lookup(providerCanonical, modelCanonical, transportProvider);

    const groupKey = JSON.stringify({
      providerCanonical,
      modelCanonical,
      transportProvider,
    });

    metadataMap.set(groupKey, metadata);

    const group = modelGroups.get(groupKey) ?? [];
    group.push({
      ...item,
      providerCanonical,
      modelCanonical,
    });
    modelGroups.set(groupKey, group);
  }

  return Array.from(modelGroups.entries()).map(([groupKey, items]) => {
    const { providerCanonical, modelCanonical, transportProvider } = JSON.parse(groupKey) as {
      providerCanonical: string;
      modelCanonical: string;
      transportProvider: string;
    };
    const metadata = metadataMap.get(groupKey) || { display_name: modelCanonical };
    const modelDisplay = metadata.display_name;

    return mergeProcessedModelGroup({
      items,
      providerCanonical,
      transportProvider,
      modelDisplay,
      modelCanonical: items[0].modelCanonical,
      metadata: {
        // Without this the identity is loaded, cached, and then dropped one
        // call short of the output — charts fall back to the display name and
        // look exactly as though identity grouping were working.
        identityKey: metadata.identityKey,
        enabled: metadata.enabled,
        deprecated: metadata.deprecated,
        deprecation_date: metadata.deprecation_date,
        successor_model: metadata.successor_model,
        last_benchmark_date: latestBenchmarkDate(items),
        lifecycle_status: metadata.enabled === false ? 'disabled' : metadata.lifecycle?.status,
        lifecycle_confidence: metadata.lifecycle?.confidence,
        lifecycle_reasons: metadata.lifecycle?.reasons,
        lifecycle_recommended_actions: metadata.lifecycle?.recommended_actions,
        lifecycle_catalog_state: metadata.lifecycle?.catalog_state,
        lifecycle_computed_at: metadata.lifecycle?.computed_at,
        lifecycle_metrics: metadata.lifecycle?.metrics,
      },
    });
  });
};

/**
 * Map raw benchmark rows to published lines using names from the database.
 *
 * There is no fallback. This used to drop back to a 377-line hand-maintained
 * table when the database read failed, which meant a Mongo blip served a
 * different set of names — including wrong ones, since that table mapped both
 * `Meta-Llama-3-8B` and `Meta-Llama-3-8B-Instruct` onto `llama-3-8b`. A page
 * that fails to load is a visible problem; a page that quietly publishes stale
 * names from a file nobody has edited in a year is not.
 */
export const mapModelNamesDB = async (data: ProcessedData[]): Promise<CloudBenchmark[]> => {
  const modelMappingCache = await getModelMappingCache();
  return groupAndMerge(data, (provider, modelId, transportProvider) =>
    getModelMetadataSync(provider, modelId, transportProvider || 'direct', modelMappingCache)
  );
};

export const mapModelNames = mapModelNamesDB;

/**
 * The DB-backed metadata lookup on its own, for pipelines that group
 * differently than `groupAndMerge` (e.g. the steady-state estimator) but must
 * source display names from the same `models` collection.
 */
export const getMetadataLookup = async (): Promise<MetadataLookup> => {
  const modelMappingCache = await getModelMappingCache();
  return (provider, modelId, transportProvider) =>
    getModelMetadataSync(provider, modelId, transportProvider || 'direct', modelMappingCache);
};

/**
 * Utility function to clear the cache (useful for testing)
 */
export const clearModelMappingCache = (): void => {
  clearCache('model-mapping-cache');
};

/**
 * Get the successor model for a given provider+model canonical pair, if any.
 * Returns undefined if the model has no known successor.
 */
export const getSuccessorModel = async (providerCanonical: string, modelCanonical: string): Promise<string | undefined> => {
  const cache = await getModelMappingCache();
  const entry = cache[metadataCacheKey(providerCanonical, modelCanonical)];
  return entry?.successor_model || undefined;
};

export default mapModelNamesDB;
