export interface CloudBenchmark {
    _id?: string;  // Optional MongoDB ID
    provider: string;
    providerSlug?: string;  // Added by model mapping
    model_name: string;
    modelSlug?: string;  // Added by model mapping
    tokens_per_second: number[];
    time_to_first_token?: number[];  // Optional array for time to first token
    tokens_per_second_mean: number;
    tokens_per_second_min: number;
    tokens_per_second_max: number;
    tokens_per_second_quartiles?: number[];  // Changed from tuple to array
    time_to_first_token_mean: number;
    time_to_first_token_min?: number;
    time_to_first_token_max?: number;
    time_to_first_token_quartiles?: number[];  // Added to match ProcessedData
    display_name?: string;  // Optional display name for the benchmark
    run_ts?: Date;
}
