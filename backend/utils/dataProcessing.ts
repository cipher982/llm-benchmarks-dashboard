import { CloudBenchmark } from '../types/CloudData';
import { Provider } from '../types/common';
import { mapModelNames } from './modelMapping';

const N_RUNS = 144; // 3 days of 30 minute intervals
const SAMPLE_SIZE = 100; // Number of points to sample for speed distribution
const PRECISION = 2; // Number of decimal places to keep

// Time Series Processing
const roundToNearest30Minutes = (timestamp: number): number => {
    const date = new Date(timestamp);
    const minutes = date.getMinutes();
    const roundedMinutes = Math.round(minutes / 30) * 30;
    const roundedDate = new Date(date.setMinutes(roundedMinutes, 0, 0));
    return roundedDate.getTime();
};

const generateTimestampRange = () => {
    const now = new Date();
    const roundedNow = roundToNearest30Minutes(now.getTime());
    const endTimestamp = roundedNow;
    const startTimestamp = endTimestamp - (N_RUNS - 1) * 30 * 60 * 1000;
    return Array.from({ length: N_RUNS }, (_, i) => startTimestamp + i * 30 * 60 * 1000);
};

const findClosestTimestamp = (
    target: number,
    timestamps: number[],
    tolerance: number = 5 * 60 * 1000 // 5 minutes in milliseconds
): number | null => {
    let closest: number | null = null;
    let minDiff = Number.MAX_VALUE;
    timestamps.forEach(ts => {
        const diff = Math.abs(ts - target);
        if (diff < minDiff && diff <= tolerance) {
            minDiff = diff;
            closest = ts;
        }
    });
    return closest;
};

export const processTimeSeriesData = (data: CloudBenchmark[]) => {
    const latestTimestamps = generateTimestampRange();
    
    // First, apply model mapping
    const mappedData = mapModelNames(data);

    // Group by mapped model name
    const modelGroups = mappedData.reduce((groups, benchmark) => {
        const { model_name } = benchmark;
        if (!groups[model_name]) {
            groups[model_name] = [];
        }
        groups[model_name].push(benchmark);
        return groups;
    }, {} as { [key: string]: CloudBenchmark[] });

    // Process each model group
    const processedModels = Object.entries(modelGroups).map(([model_name, benchmarks]) => {
        const providers = benchmarks.map(benchmark => {
            const startIndex = Math.max(benchmark.tokens_per_second.length - N_RUNS, 0);
            const slicedTokensPerSecond = benchmark.tokens_per_second
                .slice(startIndex)
                .map(val => Number(val.toFixed(PRECISION)));

            return {
                provider: benchmark.provider as Provider,
                values: slicedTokensPerSecond
            };
        });

        return {
            model_name,
            providers
        };
    });

    return {
        timestamps: latestTimestamps,
        models: processedModels
    };
};

export const processSpeedDistData = (data: CloudBenchmark[]) => {
    // Apply model mapping and sample the tokens_per_second arrays
    const mappedData = mapModelNames(data);
    return mappedData.map(benchmark => ({
        provider: benchmark.provider,
        model_name: benchmark.model_name,
        tokens_per_second: sampleArray(benchmark.tokens_per_second, SAMPLE_SIZE)
            .map(val => Number(val.toFixed(PRECISION))),
        display_name: benchmark.model_name,
    }));
};

export const processRawTableData = (data: CloudBenchmark[]) => {
    // Apply model mapping and return summary statistics
    const mappedData = mapModelNames(data);
    return mappedData.map(benchmark => ({
        provider: benchmark.provider,
        model_name: benchmark.model_name,
        tokens_per_second_mean: Number(calculateMean(benchmark.tokens_per_second).toFixed(PRECISION)),
        tokens_per_second_min: Number(Math.min(...benchmark.tokens_per_second).toFixed(PRECISION)),
        tokens_per_second_max: Number(Math.max(...benchmark.tokens_per_second).toFixed(PRECISION)),
        time_to_first_token_mean: Number(benchmark.time_to_first_token_mean.toFixed(PRECISION)),
    }));
};

// Helper functions
function calculateMean(arr: number[]): number {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function sampleArray(arr: number[], sampleSize: number): number[] {
    if (arr.length <= sampleSize) return arr;
    
    const step = Math.floor(arr.length / sampleSize);
    return Array.from({ length: sampleSize }, (_, i) => arr[i * step]);
}
