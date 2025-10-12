import { calculateMean, calculateMin, calculateMax, calculateQuartiles, bytesToGB, shuffleArray } from './dataUtils';
import logger from './logger'; // Assuming logger is imported from a separate file

/**
 * Raw data from the cloud benchmarks
 */
export interface RawData {
    _id: string;
    run_ts: string;
    model_name: string;
    display_name?: string;
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
    providerCanonical: string;
    model_name: string;
    modelCanonical: string;
    display_name?: string;
    tokens_per_second: number[];
    time_to_first_token: number[];
}

/**
 * Processed data after cleaning and transforming the cloud benchmarks
 */
export interface ProcessedData {
    _id: string;
    provider: string;
    providerCanonical: string;
    model_name: string;
    modelCanonical: string;
    display_name?: string;
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

/**
 * Fields of the RawData interface
 */
type Fields = keyof RawData;

const fields: Fields[] = ["tokens_per_second", "time_to_first_token"];

// Clean up and transform the cloud benchmarks data
export const cleanTransformCloud = (data: RawData[]): ProcessedData[] => {
    // Use Map instead of object for better performance with larger datasets
    const benchmarkMap = new Map<string, AggregatedData>();
    
    // Single pass through data
    for (const benchmark of data) {
        // Skip invalid entries
        if (!benchmark.provider || !benchmark.model_name) {
            logger.warn(`Skipping benchmark ${benchmark._id} due to missing provider or model_name`);
            continue;
        }
        if (benchmark.tokens_per_second < 1) continue;
        
        const key = `${benchmark.model_name}-${benchmark.provider}`;
        
        if (!benchmarkMap.has(key)) {
            benchmarkMap.set(key, {
                _id: benchmark._id,
                provider: benchmark.provider,
                providerCanonical: benchmark.provider,
                model_name: benchmark.model_name,
                modelCanonical: benchmark.model_name,
                display_name: benchmark.display_name,
                tokens_per_second: [],
                time_to_first_token: []
            });
        }
        
        const entry = benchmarkMap.get(key)!;
        entry.tokens_per_second.push(benchmark.tokens_per_second);
        entry.time_to_first_token.push(benchmark.time_to_first_token);
    }
    
    // Process each benchmark group
    return Array.from(benchmarkMap.values()).map(benchmark => {
        // Calculate statistics
        const tps_mean = calculateMean(benchmark.tokens_per_second);
        const tps_min = calculateMin(benchmark.tokens_per_second);
        const tps_max = calculateMax(benchmark.tokens_per_second);
        const tps_quartiles = calculateQuartiles(benchmark.tokens_per_second);
        
        const ttft_mean = calculateMean(benchmark.time_to_first_token);
        const ttft_min = calculateMin(benchmark.time_to_first_token);
        const ttft_max = calculateMax(benchmark.time_to_first_token);
        const ttft_quartiles = calculateQuartiles(benchmark.time_to_first_token);
        
        // Return processed data with calculated statistics
        return {
            _id: benchmark._id,
            provider: benchmark.provider,
            providerCanonical: benchmark.providerCanonical,
            model_name: benchmark.model_name,
            modelCanonical: benchmark.modelCanonical,
            display_name: benchmark.display_name,
            tokens_per_second: benchmark.tokens_per_second,
            time_to_first_token: benchmark.time_to_first_token,
            tokens_per_second_mean: tps_mean,
            tokens_per_second_min: tps_min,
            tokens_per_second_max: tps_max,
            tokens_per_second_quartiles: tps_quartiles,
            time_to_first_token_mean: ttft_mean,
            time_to_first_token_min: ttft_min,
            time_to_first_token_max: ttft_max,
            time_to_first_token_quartiles: ttft_quartiles
        };
    });
};
