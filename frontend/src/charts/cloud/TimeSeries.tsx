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
    const filteredData = data.map(({ provider, model_name, tokens_per_second }) => {
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

    // const claudeOpusData = filteredData.filter(benchmark => benchmark.model_name === 'claude-3-opus');
    // if (claudeOpusData.length > 0) {
    //     console.log('Filtered = claude-3-opus:', claudeOpusData);
    // }

    // const claudetwoData = filteredData.filter(benchmark => benchmark.model_name === 'claude-2');
    // if (claudetwoData.length > 0) {
    //     console.log('Filtered = claude-2:', claudetwoData);
    // }
    return filteredData;
};

const groupBenchmarksByModel = (benchmarks: BenchmarkData[]): { [model_name: string]: BenchmarkData[] } => {
    const benchmarksByModel: { [model_name: string]: BenchmarkData[] } = {};
    benchmarks.forEach((benchmark) => {
        if (benchmarksByModel[benchmark.model_name]) {
            benchmarksByModel[benchmark.model_name].push(benchmark);
        } else {
            benchmarksByModel[benchmark.model_name] = [benchmark];
        }
    });

    // if (benchmarksByModel['claude-3-opus']) {
    //     console.log('Grouped = claude-3-opus:', benchmarksByModel['claude-3-opus']);
    // }

    // if (benchmarksByModel['claude-2']) {
    //     console.log('Grouped = claude-2:', benchmarksByModel['claude-2']);
    // }

    return benchmarksByModel;
};

const generateTimestampRange = () => {
    const now = new Date();
    const endTimestamp = now.getTime();
    const startTimestamp = endTimestamp - (N_RUNS - 1) * 30 * 60 * 1000;
    const timestamps = [];
    for (let i = 0; i < N_RUNS; i++) {
        const timestamp = startTimestamp + i * 30 * 60 * 1000;
        timestamps.push(timestamp);
    }
    return timestamps;
};

const normalizeDataLengths = (benchmarks: BenchmarkData[], timestamps: number[]): BenchmarkData[] => {
    return benchmarks.map(benchmark => {
        const timestampToTokenMap = new Map(benchmark.timestamps.map((t, i) => [t, benchmark.tokens_per_second[i]]));
        const normalizedTokensPerSecond = timestamps.map(timestamp => timestampToTokenMap.get(timestamp) ?? null);
        return { ...benchmark, tokens_per_second: normalizedTokensPerSecond, timestamps };
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
    const theme = useTheme();
    const filteredBenchmarks = filterBenchmarks(data);
    const benchmarksByModel = groupBenchmarksByModel(filteredBenchmarks);
    const timestampRange = generateTimestampRange();
    const startTimestamp = timestampRange[0];
    const endTimestamp = timestampRange[timestampRange.length - 1];
    const midnightTimestamps = getMidnightTimestamps(startTimestamp, endTimestamp);

    const normalizedBenchmarksByModel = Object.entries(benchmarksByModel).reduce<BenchmarksByModel>((acc, [modelName, benchmarks]) => {
        const normalizedBenchmarks = normalizeDataLengths(benchmarks, timestampRange);
        acc[modelName] = normalizedBenchmarks;
        return acc;
    }, {});

    const lineChartData = timestampRange.map((timestamp) => {
        const dataPoint: { [key: string]: number | null } = { timestamp };
        Object.entries(normalizedBenchmarksByModel).forEach(([modelName, benchmarks]) => {
            benchmarks.forEach((benchmark) => {
                const index = benchmark.timestamps.indexOf(timestamp);
                if (index !== -1) {
                    const key = `${benchmark.provider}`;
                    dataPoint[key] = benchmark.tokens_per_second[index];
                }
            });
        });
        return dataPoint;
    });

    return (
        <div>
            {Object.entries(benchmarksByModel)
                .sort((a, b) => b[1].length - a[1].length)
                .map(([model_name, benchmarks]) => (
                    <div key={model_name}>
                        <h3>{model_name}</h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={lineChartData} margin={{ left: 20, right: 20 }}>
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
                                {benchmarks.map((benchmark) => (
                                    <Line
                                        key={`${benchmark.provider}`}
                                        type="monotone"
                                        dataKey={`${benchmark.provider}`}
                                        name={`${benchmark.provider}`}
                                        stroke={providerColors[benchmark.provider]}
                                        strokeWidth={2}
                                        dot={{ stroke: providerColors[benchmark.provider], strokeWidth: 0, fill: providerColors[benchmark.provider] }}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                ))}
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