import connectToMongoDB from "./connectToMongoDB";
import { createSlug } from "./seoUtils";
import { processAllMetrics } from "../pages/api/processed";
import type { ModelPageData, ProviderModelEntry, ProviderPageData, SummaryMetrics } from "../types/ModelPages";
import type { ProcessedData as ProcessedDataBundle, TableRow } from "../types/ProcessedData";

// BenchmarkMetrics is authored in CommonJS
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { CloudMetrics } = require("../models/BenchmarkMetrics");

interface ProcessedModelBundle {
    filtered: ProcessedDataBundle;
    rawSampleCount: number;
    runCount: number;
    latestRunAt?: string;
}

const INVENTORY_TTL_MS = 10 * 60 * 1000; // 10 minutes
const DEFAULT_MODEL_DAYS = 30;
const DEFAULT_PROVIDER_DAYS = 30;
const MAX_STATIC_PATHS = 20;

let inventoryCache: ProviderModelEntry[] | null = null;
let inventoryCacheFetchedAt = 0;

function isInventoryCacheStale(): boolean {
    return !inventoryCache || Date.now() - inventoryCacheFetchedAt > INVENTORY_TTL_MS;
}

function toIsoDate(value?: Date | string | null): string | undefined {
    if (!value) return undefined;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
    return date.toISOString();
}

function buildSummaryFromTable(tableRows: TableRow[], rawSampleCount: number, runCount: number, latestRunAt?: string): SummaryMetrics {
    if (!tableRows.length) {
        return {
            tokensPerSecondMean: null,
            tokensPerSecondMin: null,
            tokensPerSecondMax: null,
            timeToFirstTokenMean: null,
            sampleCount: rawSampleCount,
            runCount,
            latestRunAt,
        };
    }

    const row = tableRows[0];
    return {
        tokensPerSecondMean: row.tokens_per_second_mean ?? null,
        tokensPerSecondMin: row.tokens_per_second_min ?? null,
        tokensPerSecondMax: row.tokens_per_second_max ?? null,
        timeToFirstTokenMean: row.time_to_first_token_mean ?? null,
        sampleCount: rawSampleCount,
        runCount,
        latestRunAt,
    };
}

function extractModelSpeedDistribution(data: ProcessedDataBundle["speedDistribution"], provider: string, model: string) {
    const entry = data.find((item) => item.provider === provider && item.model_name === model);
    if (!entry) return undefined;

    return {
        provider: entry.provider,
        modelName: entry.model_name,
        displayName: entry.display_name ?? entry.model_name,
        meanTokensPerSecond: entry.mean_tokens_per_second,
        minTokensPerSecond: entry.min_tokens_per_second,
        maxTokensPerSecond: entry.max_tokens_per_second,
        densityPoints: entry.density_points,
    };
}

function extractModelTimeSeries(data: ProcessedDataBundle["timeSeries"], model: string, displayName?: string) {
    if (!data?.timestamps?.length) return undefined;
    const entry = data.models.find((modelEntry) => modelEntry.model_name === model);
    if (!entry) return undefined;

    return {
        modelName: entry.model_name,
        displayName: entry.display_name ?? displayName ?? entry.model_name,
        timestamps: data.timestamps,
        providers: entry.providers,
    };
}

async function fetchInventory(forceRefresh = false): Promise<ProviderModelEntry[]> {
    if (!forceRefresh && !isInventoryCacheStale()) {
        return inventoryCache as ProviderModelEntry[];
    }

    await connectToMongoDB();
    const results = await CloudMetrics.aggregate([
        {
            $group: {
                _id: { provider: "$provider", model_name: "$model_name" },
                latestRunAt: { $max: "$run_ts" },
                displayName: { $last: "$display_name" },
            },
        },
        {
            $project: {
                _id: 0,
                provider: "$_id.provider",
                model: "$_id.model_name",
                displayName: "$displayName",
                latestRunAt: "$latestRunAt",
            },
        },
        {
            $sort: { provider: 1, model: 1 },
        },
    ]);

    inventoryCache = results.map((entry: any) => {
        const providerSlug = createSlug(entry.provider);
        const modelSlug = createSlug(entry.model);
        return {
            provider: entry.provider,
            providerSlug,
            model: entry.model,
            modelSlug,
            displayName: entry.displayName || entry.model,
            latestRunAt: toIsoDate(entry.latestRunAt),
        };
    });
    inventoryCacheFetchedAt = Date.now();
    return inventoryCache;
}

export async function getProviderModelInventory(): Promise<ProviderModelEntry[]> {
    return fetchInventory(false);
}

export async function getFeaturedStaticPaths(limit = MAX_STATIC_PATHS): Promise<Array<{ params: { provider: string; model: string } }>> {
    const inventory = await fetchInventory(false);
    const sorted = [...inventory].sort((a, b) => {
        const aTime = a.latestRunAt ? Date.parse(a.latestRunAt) : 0;
        const bTime = b.latestRunAt ? Date.parse(b.latestRunAt) : 0;
        return bTime - aTime;
    });

    return sorted.slice(0, limit).map((entry) => ({
        params: { provider: entry.providerSlug, model: entry.modelSlug },
    }));
}

async function resolveBySlug(providerSlug: string, modelSlug: string): Promise<ProviderModelEntry | undefined> {
    const inventory = await fetchInventory(false);
    return inventory.find((entry) => entry.providerSlug === providerSlug && entry.modelSlug === modelSlug);
}

async function resolveProviderBySlug(providerSlug: string): Promise<{ provider: string; providerSlug: string; latestRunAt?: string; displayName: string } | undefined> {
    const inventory = await fetchInventory(false);
    const matches = inventory.filter((entry) => entry.providerSlug === providerSlug);
    if (!matches.length) return undefined;

    const latestRunAt = matches.reduce<string | undefined>((latest, entry) => {
        if (!entry.latestRunAt) return latest;
        if (!latest) return entry.latestRunAt;
        return Date.parse(entry.latestRunAt) > Date.parse(latest) ? entry.latestRunAt : latest;
    }, undefined);

    return {
        provider: matches[0].provider,
        providerSlug,
        displayName: matches[0].provider,
        latestRunAt,
    };
}

async function fetchProcessedBundle(provider: string, model: string | null, days: number): Promise<ProcessedModelBundle | null> {
    await connectToMongoDB();
    const since = new Date();
    since.setDate(since.getDate() - days);

    const query: Record<string, unknown> = {
        provider,
        run_ts: { $gte: since },
    };
    if (model) {
        query.model_name = model;
    }

    const rawMetrics = await CloudMetrics.find(query)
        .select("provider model_name display_name tokens_per_second time_to_first_token run_ts")
        .lean()
        .exec();

    if (!rawMetrics.length) {
        return null;
    }

    const runCount = new Set(rawMetrics.map((metric: any) => String(metric.run_ts))).size;
    const latestRunAt = toIsoDate(
        rawMetrics.reduce<Date | undefined>((latest, metric: any) => {
            const run = metric.run_ts instanceof Date ? metric.run_ts : new Date(metric.run_ts);
            if (!latest) return run;
            return run > latest ? run : latest;
        }, undefined)
    );

    const processed = await processAllMetrics(rawMetrics, days);
    return {
        filtered: processed,
        rawSampleCount: rawMetrics.length,
        runCount,
        latestRunAt,
    };
}

export async function getModelPageData(providerSlug: string, modelSlug: string, days = DEFAULT_MODEL_DAYS): Promise<ModelPageData | null> {
    const resolved = await resolveBySlug(providerSlug, modelSlug);
    if (!resolved) {
        return null;
    }

    const processedBundle = await fetchProcessedBundle(resolved.provider, resolved.model, days);
    if (!processedBundle) {
        return null;
    }

    const { filtered, rawSampleCount, runCount, latestRunAt } = processedBundle;
    const tableData = (filtered.table ?? []) as TableRow[];
    const matchingTableRows = tableData.filter(
        (row) => row.provider === resolved.provider && row.model_name === resolved.model
    );

    const tableRows = matchingTableRows.map((row) => ({
        provider: row.provider,
        modelName: row.model_name,
        tokensPerSecondMean: row.tokens_per_second_mean,
        tokensPerSecondMin: row.tokens_per_second_min,
        tokensPerSecondMax: row.tokens_per_second_max,
        timeToFirstTokenMean: row.time_to_first_token_mean,
    }));

    const summary = buildSummaryFromTable(matchingTableRows, rawSampleCount, runCount, latestRunAt);
    const speedDistribution = extractModelSpeedDistribution(filtered.speedDistribution ?? [], resolved.provider, resolved.model);
    const timeSeries = extractModelTimeSeries(filtered.timeSeries, resolved.model, resolved.displayName);

    const inventory = await fetchInventory(false);
    const relatedModels = inventory
        .filter((entry) => entry.provider === resolved.provider && entry.modelSlug !== resolved.modelSlug)
        .slice(0, 6);

    const alternatives = inventory
        .filter((entry) => entry.provider !== resolved.provider)
        .sort((a, b) => {
            const aTime = a.latestRunAt ? Date.parse(a.latestRunAt) : 0;
            const bTime = b.latestRunAt ? Date.parse(b.latestRunAt) : 0;
            return bTime - aTime;
        })
        .slice(0, 6);

    return {
        provider: resolved.provider,
        providerSlug,
        model: resolved.model,
        modelSlug,
        displayName: resolved.displayName,
        summary,
        speedDistribution,
        timeSeries,
        tableRows,
        relatedModels,
        alternatives,
    };
}

export async function getProviderPageData(providerSlug: string, days = DEFAULT_PROVIDER_DAYS): Promise<ProviderPageData | null> {
    const resolvedProvider = await resolveProviderBySlug(providerSlug);
    if (!resolvedProvider) {
        return null;
    }

    const processedBundle = await fetchProcessedBundle(resolvedProvider.provider, null, days);
    if (!processedBundle) {
        return {
            provider: resolvedProvider.provider,
            providerSlug,
            displayName: resolvedProvider.displayName,
            summary: {
                tokensPerSecondMean: null,
                tokensPerSecondMin: null,
                tokensPerSecondMax: null,
                timeToFirstTokenMean: null,
                sampleCount: 0,
                runCount: 0,
                latestRunAt: resolvedProvider.latestRunAt,
            },
            models: [],
            fastestModels: [],
            latestRunAt: resolvedProvider.latestRunAt,
        };
    }

    const { filtered, rawSampleCount, runCount, latestRunAt } = processedBundle;
    const providerTable = (filtered.table ?? []) as TableRow[];
    const providerModels = providerTable
        .filter((row) => row.provider === resolvedProvider.provider)
        .map((row) => {
            const modelSlug = createSlug(row.model_name);
            return {
                provider: resolvedProvider.provider,
                providerSlug,
                model: row.model_name,
                modelSlug,
                displayName: row.model_name,
                latestRunAt,
                tokensPerSecondMean: row.tokens_per_second_mean,
                timeToFirstTokenMean: row.time_to_first_token_mean,
                tokensPerSecondMin: row.tokens_per_second_min,
                tokensPerSecondMax: row.tokens_per_second_max,
            };
        });

    const summary = buildSummaryFromTable(providerTable, rawSampleCount, runCount, latestRunAt);

    const fastestModels = [...providerModels]
        .sort((a, b) => {
            const aSpeed = a.tokensPerSecondMean ?? 0;
            const bSpeed = b.tokensPerSecondMean ?? 0;
            return bSpeed - aSpeed;
        })
        .slice(0, 6);

    return {
        provider: resolvedProvider.provider,
        providerSlug,
        displayName: resolvedProvider.displayName,
        summary,
        models: providerModels,
        fastestModels,
        latestRunAt,
    };
}
