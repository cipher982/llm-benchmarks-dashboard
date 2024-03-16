import { calculateMean, calculateMin, calculateMax, calculateQuartiles, bytesToGB, shuffleArray } from './dataUtils';


export interface RawData {
    _id: string;
    run_ts: string;
    model_name: string;
    temperature: number;
    gen_ts: string;
    requested_tokens: number;
    output_tokens: number;
    generate_time: number;
    tokens_per_second: number;
    provider: string;
    streaming: boolean;
    time_to_first_token: number;
}

interface AggregatedData {
    _id: string;
    provider: string;
    model_name: string;
    tokens_per_second: number[];
    time_to_first_token: number[];
}

export interface ProcessedData {
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


type Fields = keyof RawData;

const fields: Fields[] = ["tokens_per_second", "time_to_first_token"];

// Clean up and transform the cloud benchmarks data
export const cleanTransformCloud = (data: RawData[]): ProcessedData[] => {
    const aggregatedBenchmarks = data.reduce<Record<string, AggregatedData>>((acc, benchmark, index) => {
        // First, filter out samples where tokens_per_second is less than 1
        if (benchmark.tokens_per_second < 1) {
            return acc;
        }

        // Create the key by concatenating model_name and provider
        const key = `${benchmark.model_name}-${benchmark.provider}`;

        // Initialize the key if it doesn't exist
        if (!acc[key]) {
            acc[key] = {
                _id: `${index}`,
                provider: benchmark.provider,
                model_name: benchmark.model_name,
                tokens_per_second: [],
                time_to_first_token: []
            };
        }

        // Push the values directly since we've initialized them as arrays
        acc[key].tokens_per_second.push(benchmark.tokens_per_second);
        acc[key].time_to_first_token.push(benchmark.time_to_first_token);

        return acc;
    }, {});

    const processedData = Object.values(aggregatedBenchmarks).map(benchmark => {
        // Initialize processedData with all required properties
        const processedData: ProcessedData = {
            _id: benchmark._id,
            provider: benchmark.provider,
            model_name: benchmark.model_name,
            tokens_per_second: benchmark.tokens_per_second,
            tokens_per_second_mean: 0,
            tokens_per_second_min: 0,
            tokens_per_second_max: 0,
            tokens_per_second_quartiles: [],
            time_to_first_token: benchmark.time_to_first_token,
            time_to_first_token_mean: 0,
            time_to_first_token_min: 0,
            time_to_first_token_max: 0,
            time_to_first_token_quartiles: []
        };

        // Process tokens_per_second
        const tokensPerSecondValues = [...benchmark.tokens_per_second];
        processedData.tokens_per_second_mean = parseFloat(calculateMean(tokensPerSecondValues).toFixed(2));
        processedData.tokens_per_second_min = parseFloat(calculateMin(tokensPerSecondValues).toFixed(2));
        processedData.tokens_per_second_max = parseFloat(calculateMax(tokensPerSecondValues).toFixed(2));
        processedData.tokens_per_second_quartiles = calculateQuartiles(tokensPerSecondValues).map(val => val !== null ? parseFloat(val.toFixed(2)) : 0);

        // Process time_to_first_token
        const timeToFirstTokenValues = [...benchmark.time_to_first_token];
        processedData.time_to_first_token_mean = parseFloat(calculateMean(timeToFirstTokenValues).toFixed(2));
        processedData.time_to_first_token_min = parseFloat(calculateMin(timeToFirstTokenValues).toFixed(2));
        processedData.time_to_first_token_max = parseFloat(calculateMax(timeToFirstTokenValues).toFixed(2));
        processedData.time_to_first_token_quartiles = calculateQuartiles(timeToFirstTokenValues).map(val => val !== null ? parseFloat(val.toFixed(2)) : 0);

        return processedData;
    });

    return processedData;
};