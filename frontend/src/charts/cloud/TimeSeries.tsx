import React, { useCallback, memo, useMemo, useState } from 'react';
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
import { CircularProgress, Box } from '@mui/material';
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
    theme,
    selectedDays,
    isLoading 
}: { 
    model: TimeSeriesModel; 
    chartData: ChartDataPoint[]; 
    theme: any;
    selectedDays: number;
    isLoading: boolean;
}) => {
    // Calculate tick interval based on selected days
    const getTickInterval = () => {
        if (selectedDays === 1) {
            // For 1 day, show ticks every 4 hours (6 ticks)
            return Math.floor(chartData.length / 6);
        }
        // For other ranges, show one tick per day
        return Math.floor(chartData.length / selectedDays);
    };

    return (
        <div key={model.model_name} style={{ position: 'relative' }}>
            <h3>{model.display_name || model.model_name}</h3>
            <Box sx={{ position: 'relative', width: '100%', height: 250 }}>
                {isLoading && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'rgba(0, 0, 0, 0.1)',
                            zIndex: 1,
                        }}
                    >
                        <CircularProgress sx={{ color: theme.palette.common.white }} />
                    </Box>
                )}
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
                                if (selectedDays === 1) {
                                    // For 1 day view, show HH:MM
                                    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                }
                                // For longer ranges, show MM/DD
                                return `${date.getMonth() + 1}/${date.getDate()}`;
                            }}
                            tick={{ fontSize: 12, fill: theme.palette.common.white }}
                            interval={getTickInterval()}
                        />
                        <YAxis 
                            tickFormatter={(value) => value.toFixed(1)}
                            domain={['auto', 'auto']}
                            stroke={theme.palette.common.white}
                            tick={{ fontSize: 12, fill: theme.palette.common.white }}
                        />
                        <Tooltip 
                            labelFormatter={(timestamp: string) => {
                                const date = new Date(timestamp);
                                return date.toLocaleString();
                            }}
                            formatter={(value: number) => [value?.toFixed(2) || 'N/A', '']}
                        />
                        <Legend />
                        {!isLoading && model.providers.map((provider) => (
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
            </Box>
        </div>
    );
});

ModelChart.displayName = 'ModelChart';

const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({ 
    data, 
    onTimeRangeChange, 
    selectedDays
}) => {
    const theme = useTheme();
    const [isLoading, setIsLoading] = useState(false);

    const handleTimeRangeChange = useCallback(async (days: number) => {
        if (onTimeRangeChange) {
            setIsLoading(true);
            try {
                await onTimeRangeChange(days);
            } finally {
                setIsLoading(false);
            }
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
                useWindowScroll
                totalCount={sortedModels.length}
                itemContent={index => (
                    <ModelChart
                        key={sortedModels[index].model_name}
                        model={sortedModels[index]}
                        chartData={chartData}
                        theme={theme}
                        selectedDays={selectedDays}
                        isLoading={isLoading}
                    />
                )}
            />
        </div>
    );
};

export default memo(TimeSeriesChart);
