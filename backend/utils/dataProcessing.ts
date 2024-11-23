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

// Kernel density estimation functions
function gaussianKernel(u: number): number {
    return Math.exp(-(u * u) / 2) / Math.sqrt(2 * Math.PI);
}

function calculateKernelDensity(data: number[], points: number = 100, bandwidth: number = 7): Array<{ x: number; y: number }> {
    if (data.length === 0) return [];
    
    // Filter out any NaN or invalid values
    const validData = data.filter(x => !isNaN(x) && isFinite(x));
    if (validData.length === 0) return [];
    
    // Find the data range
    const min = Math.min(...validData);
    const max = Math.max(...validData);
    const range = max - min;
    
    // Extend the range by 3 bandwidths on each side to ensure curves complete
    const paddedMin = Math.max(0, min - bandwidth * 3);
    const paddedMax = max + bandwidth * 3;
    
    // Generate x values with extended range
    const step = (paddedMax - paddedMin) / (points - 1);
    const xValues = Array.from({ length: points }, (_, i) => paddedMin + i * step);
    
    // Calculate density for each x value
    return xValues.map(x => {
        const density = validData.reduce((sum, xi) => {
            const u = (x - xi) / bandwidth;
            return sum + gaussianKernel(u);
        }, 0) / (validData.length * bandwidth);
        
        return { x, y: density };
    });
}

export const processSpeedDistData = (data: CloudBenchmark[]) => {
    // Apply model mapping and filter data
    const processedData = mapModelNames(data)
        .filter(d => !d.model_name.includes('amazon'))
        .map(d => ({
            ...d,
            model_name: `${d.provider}-${d.model_name}`,
            display_name: d.model_name,
            tokens_per_second: d.tokens_per_second.filter(val => val <= 140)
        }))
        .filter(d => d.tokens_per_second.length > 0);
    
    return processedData.map(benchmark => {
        // Calculate density estimation
        const densityPoints = calculateKernelDensity(
            benchmark.tokens_per_second,
            100,  // Same number of points as original
            7     // Same bandwidth as original
        );
        
        return {
            provider: benchmark.provider,
            model_name: benchmark.model_name,
            display_name: benchmark.display_name,
            tokens_per_second: benchmark.tokens_per_second,
            density_points: densityPoints
        };
    });
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
