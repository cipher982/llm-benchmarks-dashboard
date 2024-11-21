import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { useTheme } from '@mui/material/styles';
import { Provider, providerColors } from '../../theme/theme';
import { TimeSeriesData, TimeSeriesModel } from '../../types/ProcessedData';

interface TimeSeriesChartProps {
    data: TimeSeriesData;
}

interface ChartDataPoint {
    timestamp: string;
    [key: string]: string | number | null;
}

const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({ data }) => {
    const theme = useTheme();
    // console.log('TimeSeries received data:', data);

    // Ensure data is properly initialized
    const timestamps = data?.timestamps || [];
    const modelsArray: TimeSeriesModel[] = data?.models || [];
    // console.log('Processed timestamps:', timestamps);
    // console.log('Processed models:', modelsArray);

    // Transform data into chart format with null checks
    const chartData: ChartDataPoint[] = timestamps.map((timestamp) => {
        const point: ChartDataPoint = { timestamp };
        modelsArray.forEach((model: TimeSeriesModel) => {
            // Handle all providers for each model
            model.providers?.forEach(provider => {
                if (provider?.values) {
                    const key = `${model.model_name}-${provider.provider}`;
                    point[key] = provider.values[timestamps.indexOf(timestamp)] ?? null;
                }
            });
        });
        return point;
    });
    // console.log('Transformed chart data:', chartData);

    // Sort models by number of providers
    const sortedModels = modelsArray
        .filter((model: TimeSeriesModel) => model?.providers?.some(p => p?.values))
        .sort((a: TimeSeriesModel, b: TimeSeriesModel) => 
            (b.providers?.length || 0) - (a.providers?.length || 0)
        );
    // // console.log('Sorted models by provider count:', sortedModels.map(m => ({
    //     model: m.model_name,
    //     providerCount: m.providers?.length || 0
    // })));

    if (!timestamps.length || !sortedModels.length) {
        console.log('No data available - timestamps:', timestamps.length, 'sortedModels:', sortedModels.length);
        return <div>No data available</div>;
    }

    return (
        <div>
            {sortedModels.map((model: TimeSeriesModel) => (
                <div key={model.model_name}>
                    <h3>{model.model_name}</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart
                            data={chartData}
                            margin={{
                                top: 5,
                                right: 30,
                                left: 20,
                                bottom: 5,
                            }}
                        >
                            <CartesianGrid strokeDasharray="1 1" />
                            <XAxis
                                dataKey="timestamp"
                                tickFormatter={(timestamp: string) => {
                                    const date = new Date(timestamp);
                                    return date.toLocaleString('default', { 
                                        month: 'numeric', 
                                        day: 'numeric' 
                                    });
                                }}
                                tick={{ fontSize: 12, fill: theme.palette.common.white }}
                            />
                            <YAxis 
                                stroke={theme.palette.common.white} 
                                domain={['auto', 'auto']} 
                            />
                            <Tooltip />
                            <Legend />
                            {model.providers?.map(provider => (
                                <Line
                                    key={`${model.model_name}-${provider.provider}`}
                                    type="monotone"
                                    dataKey={`${model.model_name}-${provider.provider}`}
                                    name={`${provider.provider}`}
                                    stroke={providerColors[provider.provider as Provider]}
                                    strokeWidth={2}
                                    dot={{ 
                                        stroke: providerColors[provider.provider as Provider],
                                        strokeWidth: 0,
                                        fill: providerColors[provider.provider as Provider]
                                    }}
                                    isAnimationActive={false}
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
