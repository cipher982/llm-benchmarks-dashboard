export interface CloudBenchmark {
    _id?: string;  // Optional MongoDB ID
    provider: string;  // Provider label presented to users (display-only)
    providerCanonical: string;  // Provider identifier used for routing and data lookups
    providerSlug: string;  // Slug derived from the canonical provider identifier
    model_name: string;  // Human-friendly model label after mapping
    modelCanonical: string;  // Canonical model identifier used for routing/lookups
    modelSlug: string;  // Slug derived from the canonical model identifier
    tokens_per_second: number[];
    tokens_per_second_timestamps: Date[];  // Parallel array to tokens_per_second
    time_to_first_token?: number[];  // Optional array for time to first token
    time_to_first_token_timestamps?: Date[];  // Parallel array to time_to_first_token
    tokens_per_second_mean: number;
    tokens_per_second_min: number;
    tokens_per_second_max: number;
    tokens_per_second_quartiles?: number[];  // Changed from tuple to array
    time_to_first_token_mean: number;
    time_to_first_token_min?: number;
    time_to_first_token_max?: number;
    time_to_first_token_quartiles?: number[];  // Added to match ProcessedData
    display_name?: string;  // Optional alternate display label retained for legacy consumers
    run_ts?: Date;

    // Deprecation metadata
    deprecated?: boolean;
    deprecation_date?: string;
    successor_model?: string;
    deprecation_reason?: string;
    last_benchmark_date?: string;

    // Lifecycle metadata
    lifecycle_status?: string;
    lifecycle_confidence?: string;
    lifecycle_reasons?: string[];
    lifecycle_recommended_actions?: string[];
    lifecycle_catalog_state?: string;
    lifecycle_computed_at?: string;
    lifecycle_metrics?: {
        last_success?: string;
        successes_7d?: number;
        successes_30d?: number;
        successes_120d?: number;
        errors_7d?: number;
        errors_30d?: number;
        hard_failures_7d?: number;
        hard_failures_30d?: number;
    };
}
