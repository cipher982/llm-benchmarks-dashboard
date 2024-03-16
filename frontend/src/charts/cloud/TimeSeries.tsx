import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CloudBenchmark } from '../../types/CloudData';
import { useTheme } from '@mui/material/styles';
import { Provider, providerColors } from '../../theme/theme';

const N_RUNS = 100;

type BenchmarkData = {
    provider: Provider;
    model_name: string;
    tokens_per_second: number[];
};

type CloudBenchmarkChartProps = {
    data: CloudBenchmark[];
};

const filterBenchmarks = (data: CloudBenchmark[]): BenchmarkData[] => {
    return data.map(({ provider, model_name, tokens_per_second }) => ({
        provider: provider as Provider,
        model_name,
        tokens_per_second: tokens_per_second.slice(-N_RUNS),
    }));
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
    return benchmarksByModel;
};

const TimeSeriesChart: React.FC<CloudBenchmarkChartProps> = ({ data }) => {
    const theme = useTheme();
    const filteredBenchmarks = filterBenchmarks(data);
    const benchmarksByModel = groupBenchmarksByModel(filteredBenchmarks);

    return (
        <div>
            {Object.entries(benchmarksByModel)
                .sort((a, b) => b[1].length - a[1].length)
                .map(([model_name, benchmarks]) => (
                    <div key={model_name}>
                        <h3>{model_name}</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart
                                data={Array.from({ length: N_RUNS }, (_, i) => ({ name: i + 1 }))}
                                margin={{ left: 20, right: 20 }}
                            >
                                <CartesianGrid strokeDasharray="1 1" />
                                <XAxis
                                    dataKey="name"
                                    interval={0}
                                    tick={{ fontSize: 12, fill: theme.palette.common.white }}
                                    tickFormatter={(value) => `Run ${N_RUNS - value + 1}`}
                                    ticks={[1, Math.ceil(N_RUNS / 4), Math.ceil(N_RUNS / 2), Math.ceil(3 * N_RUNS / 4), N_RUNS]}
                                />
                                <YAxis
                                    stroke={theme.palette.common.white}
                                    domain={['auto', 'auto']}
                                />
                                <Tooltip />
                                <Legend />
                                {benchmarks.map((benchmark) => (
                                    <Line
                                        key={benchmark.provider}
                                        type="monotone"
                                        dataKey={(entry) => {
                                            const index = entry.name - 1;
                                            return index < benchmark.tokens_per_second.length ? benchmark.tokens_per_second[index] : null;
                                        }}
                                        name={benchmark.provider}
                                        stroke={providerColors[benchmark.provider]}
                                        strokeWidth={2}
                                        dot={{ stroke: providerColors[benchmark.provider], strokeWidth: 0, fill: providerColors[benchmark.provider] }}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                ))}
        </div>
    );
};

export default TimeSeriesChart;