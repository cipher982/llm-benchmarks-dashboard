export interface ProviderModelEntry {
    provider: string;
    providerSlug: string;
    model: string;
    modelSlug: string;
    displayName: string;
    latestRunAt?: string;
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
    values: (number | null)[];
}

export interface ModelTimeSeries {
    modelName: string;
    displayName: string;
    timestamps: string[];
    providers: TimeSeriesEntry[];
}

export interface ModelPageData {
    provider: string;
    providerSlug: string;
    model: string;
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
    }>;
    relatedModels: ProviderModelEntry[];
    alternatives: ProviderModelEntry[];
}

export interface ProviderPageData {
    provider: string;
    providerSlug: string;
    displayName: string;
    summary: SummaryMetrics;
    models: ProviderModelEntry[];
    fastestModels: ProviderModelEntry[];
    latestRunAt?: string;
}
