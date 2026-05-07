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
    generated_tokens_per_second?: number | null;
    visible_tokens_per_second?: number | null;
    provider: string;
    streaming: boolean;
    time_to_first_token: number | null;
}

interface AggregatedData {
    _id: string;
    provider: string;
    providerCanonical: string;
    model_name: string;
    modelCanonical: string;
    display_name?: string;
    tokens_per_second: number[];
    generated_tokens_per_second: number[];
    time_to_first_token: number[];
    run_timestamps: Date[];
    ttft_timestamps: Date[];
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
    tokens_per_second_timestamps: Date[];  // Parallel array to tokens_per_second
    generated_tokens_per_second?: number[];
    generated_tokens_per_second_mean?: number;
    time_to_first_token: number[];
    time_to_first_token_timestamps: Date[];  // Parallel array to time_to_first_token
    tokens_per_second_mean: number;
    tokens_per_second_min: number;
    tokens_per_second_max: number;
    tokens_per_second_quartiles: number[];
    time_to_first_token_mean: number;
    time_to_first_token_min: number;
    time_to_first_token_max: number;
    time_to_first_token_quartiles: number[];
    last_run_ts?: Date;
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

        const visibleTps = typeof benchmark.visible_tokens_per_second === 'number' && benchmark.visible_tokens_per_second > 0
            ? benchmark.visible_tokens_per_second
            : null;
        const generatedTps = typeof benchmark.generated_tokens_per_second === 'number' && benchmark.generated_tokens_per_second > 0
            ? benchmark.generated_tokens_per_second
            : benchmark.tokens_per_second;
        const leaderboardTps = visibleTps ?? benchmark.tokens_per_second;
        
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
                generated_tokens_per_second: [],
                time_to_first_token: [],
                run_timestamps: [],
                ttft_timestamps: []
            });
        }

        const entry = benchmarkMap.get(key)!;
        entry.tokens_per_second.push(leaderboardTps);
        entry.generated_tokens_per_second.push(generatedTps);
        // Collect timestamps for computing last benchmark date
        if (benchmark.run_ts) {
            const runTimestamp = new Date(benchmark.run_ts);
            entry.run_timestamps.push(runTimestamp);
            if (typeof benchmark.time_to_first_token === 'number' && Number.isFinite(benchmark.time_to_first_token)) {
                entry.time_to_first_token.push(benchmark.time_to_first_token);
                entry.ttft_timestamps.push(runTimestamp);
            }
        }
    }
    
    // Process each benchmark group
    return Array.from(benchmarkMap.values()).map(benchmark => {
        // Calculate statistics
        const tps_mean = calculateMean(benchmark.tokens_per_second);
        const tps_min = calculateMin(benchmark.tokens_per_second);
        const tps_max = calculateMax(benchmark.tokens_per_second);
        const tps_quartiles = calculateQuartiles(benchmark.tokens_per_second);
        const generatedTpsMean = calculateMean(benchmark.generated_tokens_per_second);
        
        const hasTtft = benchmark.time_to_first_token.length > 0;
        const ttft_mean = hasTtft ? calculateMean(benchmark.time_to_first_token) : 0;
        const ttft_min = hasTtft ? calculateMin(benchmark.time_to_first_token) : 0;
        const ttft_max = hasTtft ? calculateMax(benchmark.time_to_first_token) : 0;
        const ttft_quartiles = hasTtft ? calculateQuartiles(benchmark.time_to_first_token) : [0, 0, 0];

        // Compute last benchmark timestamp (undefined if no data exists)
        const lastRunTs = benchmark.run_timestamps.length > 0
            ? new Date(Math.max(...benchmark.run_timestamps.map(ts => ts.getTime())))
            : undefined;

        // Return processed data with calculated statistics
        return {
            _id: benchmark._id,
            provider: benchmark.provider,
            providerCanonical: benchmark.providerCanonical,
            model_name: benchmark.model_name,
            modelCanonical: benchmark.modelCanonical,
            display_name: benchmark.display_name,
            tokens_per_second: benchmark.tokens_per_second,
            tokens_per_second_timestamps: benchmark.run_timestamps,  // Preserve timestamps!
            generated_tokens_per_second: benchmark.generated_tokens_per_second,
            generated_tokens_per_second_mean: generatedTpsMean,
            time_to_first_token: benchmark.time_to_first_token,
            time_to_first_token_timestamps: benchmark.ttft_timestamps,
            tokens_per_second_mean: tps_mean,
            tokens_per_second_min: tps_min,
            tokens_per_second_max: tps_max,
            tokens_per_second_quartiles: tps_quartiles,
            time_to_first_token_mean: ttft_mean,
            time_to_first_token_min: ttft_min,
            time_to_first_token_max: ttft_max,
            time_to_first_token_quartiles: ttft_quartiles,
            last_run_ts: lastRunTs
        };
    });
};
