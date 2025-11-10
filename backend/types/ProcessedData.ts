export interface SpeedDistributionPoint {
    provider: string;
    model_name: string;
    display_name: string;
    density_points: Array<{ x: number; y: number }>;
    mean_tokens_per_second: number;
    min_tokens_per_second: number;
    max_tokens_per_second: number;
    deprecated?: boolean;
    deprecation_date?: string;
}

export interface TimeSeriesProvider {
    provider: string;
    providerCanonical: string;
    values: (number | null)[];
    deprecated?: boolean;
    deprecation_date?: string;
    last_benchmark_date?: string;
    successor_model?: string;
    is_snapshot?: boolean;
    segment?: 'real' | 'snapshot';
    snapshot_metadata?: {
        p10: number;
        p50: number;
        p90: number;
        period: string;
        sample_size: number;
    };
}

export interface TimeSeriesModel {
    model_name: string;
    display_name: string;
    providers: TimeSeriesProvider[];
}

export interface TimeSeriesData {
    timestamps: string[];
    models: TimeSeriesModel[];
}

export interface TableRow {
    provider: string;               // Provider label shown in UI
    providerCanonical: string;      // Canonical provider identifier
    providerSlug: string;           // Slug for provider routes
    model_name: string;             // Model label shown in UI
    modelCanonical: string;         // Canonical model identifier
    modelSlug: string;              // Slug for model routes
    tokens_per_second_mean: number;
    tokens_per_second_min: number;
    tokens_per_second_max: number;
    time_to_first_token_mean: number;
    deprecated?: boolean;
    deprecation_date?: string;
    last_benchmark_date?: string;
}

export interface ProcessedData {
    speedDistribution: SpeedDistributionPoint[];
    timeSeries: TimeSeriesData;
    table: TableRow[];
}
