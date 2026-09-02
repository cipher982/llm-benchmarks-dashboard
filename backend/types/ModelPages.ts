export interface ProviderModelEntry {
    provider: string;
    providerCanonical: string;
    providerSlug: string;
    model: string;
    modelCanonical: string;
    modelSlug: string;
    displayName: string;
    displayGroupKey?: string;
    canonicalGroup?: string[];
    representativeModelCanonical?: string;
    representativeModelSlug?: string;
    latestRunAt?: string;
    firstRunAt?: string;
    dataSpanDays?: number;
    lifecycleStatus?: string;
    tokensPerSecondMean?: number;
    timeToFirstTokenMean?: number;
    tokensPerSecondMin?: number;
    tokensPerSecondMax?: number;
}

export interface SummaryMetrics {
    tokensPerSecondMean: number | null;
    tokensPerSecondMin: number | null;
    tokensPerSecondMax: number | null;
    timeToFirstTokenMean: number | null;
    /** Floor-free generation speed (median over transports); null when no run qualified. */
    decodeTokensPerSecond?: number | null;
    decodeSamples?: number;
    sampleCount: number;
    runCount: number;
    latestRunAt?: string;
}

export interface PageSpeedDistributionPoint {
    x: number;
    y: number;
}

export interface ModelSpeedDistribution {
    provider: string;
    modelName: string;
    displayName: string;
    meanTokensPerSecond: number;
    minTokensPerSecond: number;
    maxTokensPerSecond: number;
    densityPoints: PageSpeedDistributionPoint[];
}

export interface TimeSeriesEntry {
    provider: string;
    providerCanonical?: string;
    transportProvider?: string;
    values: (number | null)[];
    deprecated?: boolean;
    deprecation_date?: string;
    last_benchmark_date?: string;
    successor_model?: string;
}

export interface ModelTimeSeries {
    modelName: string;
    displayName: string;
    timestamps: string[];
    providers: TimeSeriesEntry[];
}

export interface ModelPageData {
    provider: string;
    providerCanonical: string;
    providerSlug: string;
    model: string;
    modelCanonical: string;
    modelSlug: string;
    displayName: string;
    summary: SummaryMetrics;
    speedDistribution?: ModelSpeedDistribution;
    timeSeries?: ModelTimeSeries;
    tableRows: Array<{
        provider: string;
        modelName: string;
        tokensPerSecondMean: number;
        tokensPerSecondMin: number;
        tokensPerSecondMax: number;
        timeToFirstTokenMean: number;
        /** Lane identity: which catalogue id, over which transport, and whether it is still collected. */
        modelCanonical?: string;
        transportProvider?: string;
        lifecycleStatus?: string;
        samples?: number;
        lastBenchmarkDate?: string;
    }>;
    relatedModels: ProviderModelEntry[];
    alternatives: ProviderModelEntry[];
    // SEO/Lifecycle fields
    lifecycleStatus?: string;
    dataSpanDays?: number;
    isDeprecated?: boolean;
    shouldNoIndex?: boolean;
    successorModel?: string;
}

export interface ProviderPageData {
    provider: string;
    providerCanonical: string;
    providerSlug: string;
    displayName: string;
    summary: SummaryMetrics;
    /** Live lanes, one per model (utils/laneView.ts). */
    models: ProviderModelEntry[];
    fastestModels: ProviderModelEntry[];
    /** Lanes in the window not listed: flagged (retired, failing, stale) or folded behind a current lane. */
    retiredLanes?: number;
    foldedLanes?: number;
    latestRunAt?: string;
}
