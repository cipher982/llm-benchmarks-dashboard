export interface CloudBenchmark {
    provider: string;
    model_name: string;
    tokens_per_second: number[];
    tokens_per_second_mean: number;
    tokens_per_second_min: number;
    tokens_per_second_max: number;
    time_to_first_token_mean: number;
    run_ts?: Date;
}
