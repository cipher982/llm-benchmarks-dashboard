import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CloudBenchmark } from '../../types/CloudData';
import { useTheme } from '@mui/material/styles';


const N_RUNS = 10;

interface CloudBenchmarkChartProps {
    data: CloudBenchmark[];
}

interface TSData {
    provider: string;
    model_name: string;
    tokens_per_second: number[];
}

const TimeSeriesChart: React.FC<CloudBenchmarkChartProps> = ({ data }) => {
    const theme = useTheme();

    const filteredData: TSData[] = data.map(({ provider, model_name, tokens_per_second }) => ({
        provider,
        model_name,
        tokens_per_second: tokens_per_second.slice(-N_RUNS),
    }));

    const debug = false;

    // Group the data by provider
    const groupedData: { [provider: string]: TSData[] } = {};
    filteredData.forEach((benchmark) => {
        if (groupedData[benchmark.provider]) {
            groupedData[benchmark.provider].push(benchmark);
        } else {
            groupedData[benchmark.provider] = [benchmark];
        }
    });

    return (
        <div>
            {Object.entries(groupedData).map(([provider, benchmarks]) => (
                <div key={provider}>
                    <h3>{provider}</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart
                            data={Array.from({ length: N_RUNS }, (_, i) => ({ name: i + 1 }))}
                            margin={{ left: 20, right: 20 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="name"
                                interval={0}
                                tick={{ fontSize: 12, fill: theme.palette.common.white }}
                                tickFormatter={(value) => `Run ${value}`}
                            />
                            <YAxis stroke={theme.palette.common.white} />
                            <Tooltip />
                            <Legend />
                            {benchmarks.map((benchmark) => (
                                <Line
                                    key={benchmark.model_name}
                                    type="monotone"
                                    dataKey={(entry) =>
                                        benchmark.tokens_per_second[entry.name - 1]
                                    }
                                    name={benchmark.model_name}
                                    stroke={getRandomColor()}
                                    strokeWidth={2}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                    {debug && (
                        <div>
                            <h5>Debug Data:</h5>
                            <pre>{JSON.stringify(benchmarks, null, 2)}</pre>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

// Helper function to generate random colors for the lines
const getRandomColor = () => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
};

export default TimeSeriesChart;