import { CloudBenchmark } from '../types/CloudData';
import { Provider } from '../types/common';
import { mapModelNames } from './modelMappingDB';

const SAMPLE_SIZE = 100; // Number of points to sample for speed distribution
const PRECISION = 2; // Number of decimal places to keep
const MINUTES_INTERVAL = 30; // Data points are 30 minutes apart
const TARGET_DATA_POINTS = 144; // Target number of data points for time series (3 days worth at 30min intervals)

// Time Series Processing
const roundToNearest30Minutes = (timestamp: number): number => {
    const date = new Date(timestamp);
    const minutes = date.getMinutes();
    const roundedMinutes = Math.round(minutes / MINUTES_INTERVAL) * MINUTES_INTERVAL;
    const roundedDate = new Date(date.setMinutes(roundedMinutes, 0, 0));
    return roundedDate.getTime();
};

const generateTimestampRange = (days: number) => {
    const intervalsPerDay = (24 * 60) / MINUTES_INTERVAL;
    const totalIntervals = Math.ceil(days * intervalsPerDay);
    
    // Calculate sampling interval to achieve target data points
    const samplingInterval = Math.max(1, Math.floor(totalIntervals / TARGET_DATA_POINTS));
    const nRuns = Math.min(totalIntervals, TARGET_DATA_POINTS);
    
    const now = new Date();
    const roundedNow = roundToNearest30Minutes(now.getTime());
    const endTimestamp = roundedNow;
    const startTimestamp = endTimestamp - (totalIntervals - 1) * MINUTES_INTERVAL * 60 * 1000;
    
    // Generate timestamps with appropriate sampling interval
    return Array.from({ length: nRuns }, (_, i) => 
        startTimestamp + (i * samplingInterval * MINUTES_INTERVAL * 60 * 1000)
    );
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

export const processTimeSeriesData = async (data: CloudBenchmark[], days: number = 14) => {
    const latestTimestamps = generateTimestampRange(days);
    const nRuns = latestTimestamps.length;
    
    // First, apply model mapping with feature flag
    const useDbModels = process.env.USE_DATABASE_MODELS === 'true';
    const mappedData = await mapModelNames(data, useDbModels);

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
            const values = benchmark.tokens_per_second;
            let processedValues: number[] = [];

            if (values.length > nRuns) {
                // If we have more values than needed, sample evenly
                const step = values.length / nRuns;
                processedValues = Array.from({ length: nRuns }, (_, i) => {
                    const index = Math.min(Math.floor(i * step), values.length - 1);
                    return Number(values[index].toFixed(PRECISION));
                });
            } else if (values.length < nRuns) {
                // If we have fewer values than needed, pad with nulls
                processedValues = Array(nRuns).fill(null);
                // Copy available values to the end of the array
                const startIndex = nRuns - values.length;
                values.forEach((val, i) => {
                    processedValues[startIndex + i] = Number(val.toFixed(PRECISION));
                });
            } else {
                // If we have exactly the right number of values
                processedValues = values.map(val => Number(val.toFixed(PRECISION)));
            }

            return {
                provider: benchmark.provider as Provider,
                values: processedValues
            };
        });

        return {
            model_name,
            display_name: benchmarks[0]?.display_name || model_name,
            providers
        };
    });

    return {
        timestamps: latestTimestamps.map(ts => new Date(ts).toISOString()),
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

export const processSpeedDistData = async (data: CloudBenchmark[]) => {
    // Apply model mapping and filter data with feature flag
    const useDbModels = process.env.USE_DATABASE_MODELS === 'true';
    const processedData = (await mapModelNames(data, useDbModels))
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
        ).map(point => ({
            x: Number(point.x.toFixed(2)),
            y: Number(point.y.toFixed(6))
        }));
        
        // Calculate summary statistics
        const mean = Number(calculateMean(benchmark.tokens_per_second).toFixed(2));
        const min = Number(Math.min(...benchmark.tokens_per_second).toFixed(2));
        const max = Number(Math.max(...benchmark.tokens_per_second).toFixed(2));
        
        return {
            provider: benchmark.provider,
            model_name: benchmark.model_name,
            display_name: benchmark.display_name,
            mean_tokens_per_second: mean,
            min_tokens_per_second: min,
            max_tokens_per_second: max,
            density_points: densityPoints
        };
    });
};

export const processRawTableData = async (data: CloudBenchmark[]) => {
    // Apply model mapping and return summary statistics with feature flag
    const useDbModels = process.env.USE_DATABASE_MODELS === 'true';
    const mappedData = await mapModelNames(data, useDbModels);
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
