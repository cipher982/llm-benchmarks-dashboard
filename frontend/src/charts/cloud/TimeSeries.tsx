import React, { useCallback, memo, useMemo } from 'react';
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
import { Virtuoso } from 'react-virtuoso';
import { TimeRangeSelector } from '../../components/TimeRangeSelector';

interface TimeSeriesChartProps {
    onTimeRangeChange?: (days: number) => Promise<void>;
    data: TimeSeriesData;
    selectedDays: number;
}

interface ChartDataPoint {
    timestamp: string;
    [key: string]: string | number | null;
}

// Memoized individual chart component
const ModelChart = memo(({ 
    model, 
    chartData, 
    theme 
}: { 
    model: TimeSeriesModel; 
    chartData: ChartDataPoint[]; 
    theme: any; 
}) => (
    <div key={model.model_name}>
        <h3>{model.display_name || model.model_name}</h3>
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
                        // For shorter time ranges (≤ 2 days), show hours
                        if (chartData.length <= 96) {  // 48 points per day
                            return date.getHours().toString().padStart(2, '0') + ':00';
                        }
                        // For longer ranges, show date
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                    interval={Math.max(Math.floor(chartData.length / 10), 1)}  // Show ~10 ticks
                />
                <YAxis 
                    tickFormatter={(value) => value.toFixed(1)}
                    domain={['auto', 'auto']}
                />
                <Tooltip 
                    labelFormatter={(timestamp: string) => {
                        const date = new Date(timestamp);
                        return date.toLocaleString();
                    }}
                    formatter={(value: number) => [value?.toFixed(2) || 'N/A', '']}
                />
                <Legend />
                {model.providers.map((provider) => (
                    <Line
                        key={provider.provider}
                        type="monotone"
                        dataKey={`${model.model_name}-${provider.provider}`}
                        name={provider.provider}
                        stroke={providerColors[provider.provider as Provider] || '#000000'}
                        dot={false}
                        connectNulls
                    />
                ))}
            </LineChart>
        </ResponsiveContainer>
    </div>
));

ModelChart.displayName = 'ModelChart';

const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({ 
    data, 
    onTimeRangeChange, 
    selectedDays
}) => {
    const theme = useTheme();

    const handleTimeRangeChange = useCallback(async (days: number) => {
        if (onTimeRangeChange) {
            await onTimeRangeChange(days);
        }
    }, [onTimeRangeChange]);

    // Transform the data for the chart
    const chartData = useMemo(() => {
        return data.timestamps.map((timestamp, index) => {
            const point: ChartDataPoint = { timestamp };
            data.models.forEach(model => {
                model.providers.forEach(provider => {
                    if (provider.values) {
                        const key = `${model.model_name}-${provider.provider}`;
                        point[key] = provider.values[index] ?? null;
                    }
                });
            });
            return point;
        });
    }, [data.timestamps, data.models]);

    // Sort models by number of providers
    const sortedModels = useMemo(() => {
        return [...data.models].sort((a, b) => {
            // Count providers with actual values
            const aProviderCount = a.providers.filter(p => p.values && p.values.length > 0).length;
            const bProviderCount = b.providers.filter(p => p.values && p.values.length > 0).length;
            return bProviderCount - aProviderCount;
        });
    }, [data.models]);

    if (!data.timestamps.length || !sortedModels.length) {
        return <div>No data available</div>;
    }

    return (
        <div>
            <TimeRangeSelector
                selectedDays={selectedDays}
                onChange={handleTimeRangeChange}
            />
            <Virtuoso
                style={{ height: '100vh' }}
                totalCount={sortedModels.length}
                itemContent={index => (
                    <ModelChart
                        key={sortedModels[index].model_name}
                        model={sortedModels[index]}
                        chartData={chartData}
                        theme={theme}
                    />
                )}
            />
        </div>
    );
};

export default memo(TimeSeriesChart);
