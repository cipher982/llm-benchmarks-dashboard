export interface CloudBenchmark {
    _id: string;
    provider: string;
    model_name: string;
    tokens_per_second: number[];
    time_to_first_token: number[];
    tokens_per_second_mean: number;
    tokens_per_second_min: number;
    tokens_per_second_max: number;
    tokens_per_second_quartiles: number[];
    time_to_first_token_mean: number;
    time_to_first_token_min: number;
    time_to_first_token_max: number;
    time_to_first_token_quartiles: number[];
}

export interface CloudBenchmarksProps { }