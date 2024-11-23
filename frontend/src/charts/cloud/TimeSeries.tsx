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
    console.log('TimeSeries received data:', data);

    // Ensure data is properly initialized
    const timestamps = data?.timestamps || [];
    const modelsArray: TimeSeriesModel[] = data?.models || [];
    // console.log('Raw timestamps array:', timestamps);
    // console.log('First few timestamps:', timestamps.slice(0, 5));
    // console.log('Number of unique timestamps:', new Set(timestamps).size);
    // console.log('Sample provider values length:', modelsArray[0]?.providers[0]?.values?.length);
    // console.log('Raw models:', modelsArray);

    // Create synthetic timestamps (one every 30 minutes)
    const numDataPoints = data?.timestamps?.length || 0;
    const now = new Date();
    const syntheticTimestamps = Array.from({ length: numDataPoints }, (_, i) => {
        const timestamp = new Date(now.getTime() - (numDataPoints - 1 - i) * 30 * 60 * 1000);
        return timestamp.toISOString();
    });

    // Transform data into chart format with synthetic timestamps
    const chartData: ChartDataPoint[] = syntheticTimestamps.map((timestamp, index) => {
        const point: ChartDataPoint = { timestamp };
        modelsArray.forEach((model: TimeSeriesModel) => {
            model.providers?.forEach(provider => {
                if (provider?.values) {
                    const key = `${model.model_name}-${provider.provider}`;
                    point[key] = provider.values[index] ?? null;
                }
            });
        });
        return point;
    });

    console.log('Chart data with synthetic timestamps:', chartData.slice(0, 5));

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

    if (!numDataPoints || !sortedModels.length) {
        console.log('No data available - numDataPoints:', numDataPoints, 'sortedModels:', sortedModels.length);
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
                                tickFormatter={(value) => value.toFixed(1)}
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
                                        strokeWidth: 1,
                                        r: 2,
                                        fill: providerColors[provider.provider as Provider]
                                    }}
                                    connectNulls={false}
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
