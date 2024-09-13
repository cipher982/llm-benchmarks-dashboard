import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CloudBenchmark } from '../../types/CloudData';
import { useTheme } from '@mui/material/styles';
import { Provider, providerColors } from '../../theme/theme';

const N_RUNS = 144; // 3 days of 30 minute intervals
const debug = false;

type BenchmarkData = {
    provider: Provider;
    model_name: string;
    tokens_per_second: (number | null)[];
    timestamps: number[];
};

type CloudBenchmarkChartProps = {
    data: CloudBenchmark[];
};

interface BenchmarksByModel {
    [modelName: string]: BenchmarkData[];
}

const filterBenchmarks = (data: CloudBenchmark[]): BenchmarkData[] => {
    const latestTimestamps = generateTimestampRange();
    return data.map(({ provider, model_name, tokens_per_second }) => {
        const startIndex = Math.max(tokens_per_second.length - N_RUNS, 0);
        const slicedTokensPerSecond = tokens_per_second.slice(startIndex);
        const alignedTimestamps = latestTimestamps.slice(-slicedTokensPerSecond.length);
        return {
            provider: provider as Provider,
            model_name,
            tokens_per_second: slicedTokensPerSecond,
            timestamps: alignedTimestamps,
        };
    });
};

const groupBenchmarksByModel = (benchmarks: BenchmarkData[]): { [model_name: string]: BenchmarkData[] } => {
    return benchmarks.reduce((acc, benchmark) => {
        if (!acc[benchmark.model_name]) {
            acc[benchmark.model_name] = [];
        }
        acc[benchmark.model_name].push(benchmark);
        return acc;
    }, {} as { [model_name: string]: BenchmarkData[] });
};

const roundToNearest30Minutes = (timestamp: number): number => {
    const date = new Date(timestamp);
    const minutes = date.getMinutes();
    const roundedMinutes = Math.floor(minutes / 30) * 30;
    const roundedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), roundedMinutes, 0, 0);
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

const normalizeDataLengths = (
    benchmarks: BenchmarkData[],
    timestamps: number[]
): BenchmarkData[] => {
    return benchmarks.map(benchmark => {        
        // Ensure timestamps are rounded
        const roundedTimestamps = benchmark.timestamps.map(ts => roundToNearest30Minutes(ts));
                
        const timestampToTokenMap = new Map<number, number | null>(
            roundedTimestamps.map((t, i) => [t, benchmark.tokens_per_second[i]])
        );
        
        const normalizedTokensPerSecond = timestamps.map(timestamp => {
            const closest = findClosestTimestamp(timestamp, roundedTimestamps);
            if (closest !== null) {
                const value = timestampToTokenMap.get(closest);
                return value ?? null;
            } else {
                console.log(`No value within tolerance for timestamp ${timestamp}`);
                return null;
            }
        });
                
        return { 
            ...benchmark, 
            tokens_per_second: normalizedTokensPerSecond, 
            timestamps 
        };
    });
};

const formatDateTick = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('default', { month: 'numeric', day: 'numeric' });
};

const getMidnightTimestamps = (startTimestamp: number, endTimestamp: number): number[] => {
    const midnightTimestamps = [];
    let currentTimestamp = startTimestamp;
    while (currentTimestamp <= endTimestamp) {
        const date = new Date(currentTimestamp);
        const midnightTimestamp = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
        if (midnightTimestamp > startTimestamp && midnightTimestamp <= endTimestamp) {
            midnightTimestamps.push(midnightTimestamp);
        }
        currentTimestamp = midnightTimestamp + 24 * 60 * 60 * 1000;
    }
    return midnightTimestamps;
};

const TimeSeriesChart: React.FC<CloudBenchmarkChartProps> = ({ data }) => {
    console.log("TimeSeriesChart received data. Total items:", data.length, "Missing data:", data.filter(item => !item.tokens_per_second).length);
    const theme = useTheme();

    console.log("Filtering benchmarks...");
    const filteredBenchmarks = filterBenchmarks(data);
    console.log("Filtered benchmarks:", filteredBenchmarks.length);

    console.log("Grouping benchmarks by model...");
    const benchmarksByModel = groupBenchmarksByModel(filteredBenchmarks);
    console.log("Models found:", Object.keys(benchmarksByModel).length);

    const timestampRange = generateTimestampRange();
    const startTimestamp = timestampRange[0];
    const endTimestamp = timestampRange[timestampRange.length - 1];
    const midnightTimestamps = getMidnightTimestamps(startTimestamp, endTimestamp);

    console.log("Normalizing benchmark data...");
    const normalizedBenchmarksByModel = Object.entries(benchmarksByModel).reduce<BenchmarksByModel>((acc, [modelName, benchmarks]) => {
        const normalizedBenchmarks = normalizeDataLengths(benchmarks, timestampRange);
        acc[modelName] = normalizedBenchmarks;
        return acc;
    }, {});
    console.log("Normalized benchmarks:", Object.keys(normalizedBenchmarksByModel).length);

    console.log("Preparing line chart data...");
    const lineChartData = timestampRange.map((timestamp) => {
        const dataPoint: { [key: string]: number | null } = { timestamp };
        Object.entries(normalizedBenchmarksByModel).forEach(([modelName, benchmarks]) => {
            benchmarks.forEach((benchmark) => {
                const index = benchmark.timestamps.indexOf(timestamp);
                if (index !== -1) {
                    const key = `${modelName}-${benchmark.provider}`;
                    dataPoint[key] = benchmark.tokens_per_second[index];
                }
            });
        });
        return dataPoint;
    });
    console.log("Line chart data points:", lineChartData.length);

    // Add this new logging section
    console.log("Checking data integrity:");
    Object.entries(normalizedBenchmarksByModel).forEach(([modelName, benchmarks]) => {
        benchmarks.forEach((benchmark) => {
            const key = `${modelName}-${benchmark.provider}`;
            const nonNullCount = lineChartData.filter(d => d[key] !== null).length;
            // console.log(`${key}: ${nonNullCount} non-null data points`);
            if (nonNullCount === 0) {
                console.warn(`No data for ${key}. First few timestamps:`, benchmark.timestamps.slice(0, 5));
                console.warn(`First few tokens_per_second:`, benchmark.tokens_per_second.slice(0, 5));
            }
        });
    });

    // Log the first and last data points for each model-provider combination
    Object.entries(normalizedBenchmarksByModel).forEach(([modelName, benchmarks]) => {
        benchmarks.forEach((benchmark) => {
            const key = `${modelName}-${benchmark.provider}`;
            // console.log(`${key} first data point:`, lineChartData[0][key]);
            // console.log(`${key} last data point:`, lineChartData[lineChartData.length - 1][key]);
        });
    });

    return (
        <div>
            {Object.entries(benchmarksByModel)
                .sort((a, b) => b[1].length - a[1].length)
                .map(([model_name, benchmarks]) => {
                    // console.log(`Rendering chart for model: ${model_name}, benchmarks: ${benchmarks.length}`);
                    return (
                        <div key={model_name}>
                            <h3>{model_name}</h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <LineChart 
                                    data={lineChartData} 
                                    margin={{ left: 20, right: 20 }}
                                    onMouseEnter={() => console.log(`Chart for ${model_name} is interactive`)}
                                >
                                    <CartesianGrid strokeDasharray="1 1" />
                                    <XAxis
                                        dataKey="timestamp"
                                        type="number"
                                        domain={[startTimestamp, endTimestamp]}
                                        ticks={midnightTimestamps}
                                        tickFormatter={formatDateTick}
                                        tick={{ fontSize: 12, fill: theme.palette.common.white }}
                                    />
                                    <YAxis stroke={theme.palette.common.white} domain={['auto', 'auto']} />
                                    <Tooltip />
                                    <Legend />
                                    {benchmarks.map((benchmark) => {
                                        const dataKey = `${model_name}-${benchmark.provider}`;
                                        const dataPoints = lineChartData.filter(d => d[dataKey] !== null);
                                        // console.log(`Rendering line for ${dataKey}, non-null data points: ${dataPoints.length}`);
                                        return (
                                            <Line
                                                key={dataKey}
                                                type="monotone"
                                                dataKey={dataKey}
                                                name={`${benchmark.provider}`}
                                                stroke={providerColors[benchmark.provider]}
                                                strokeWidth={2}
                                                dot={{ stroke: providerColors[benchmark.provider], strokeWidth: 0, fill: providerColors[benchmark.provider] }}
                                                isAnimationActive={false} // Disable animation to see if it affects rendering
                                            />
                                        );
                                    })}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    );
                })}
            {debug && (
                <div>
                    <h4>Debug Information</h4>
                    <pre>{JSON.stringify({ lineChartData, timestampRange }, null, 2)}</pre>
                </div>
            )}
        </div>
    );
};

export default TimeSeriesChart;
