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
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import { Provider, getProviderColor } from '../../theme/theme';
import { TimeSeriesData, TimeSeriesModel, TimeSeriesProvider } from '../../../types/ProcessedData';
import { TimeRangeSelector } from '../../TimeRangeSelector';

interface TimeSeriesChartProps {
    onTimeRangeChange?: (days: number) => Promise<void>;
    data: TimeSeriesData;
    selectedDays: number;
}

interface ChartDataPoint {
    timestamp: string;
    [key: string]: string | number | null;
}

const COVERAGE_THRESHOLD = 10;

const getProviderCoverage = (provider: TimeSeriesProvider): number => {
    const values = provider.values || [];
    const nonNullCount = values.filter((value) => value !== null && value !== undefined).length;
    const totalCount = values.length;
    return totalCount > 0 ? (nonNullCount / totalCount) * 100 : 0;
};

const getVisibleProviders = (model: TimeSeriesModel): TimeSeriesProvider[] =>
    model.providers.filter((provider) => getProviderCoverage(provider) >= COVERAGE_THRESHOLD);

// Memoized individual chart component
const ModelChart = memo(({
    model,
    chartData,
    theme,
    selectedDays,
    isLoading,
    visibleProviders,
}: {
    model: TimeSeriesModel;
    chartData: ChartDataPoint[];
    theme: any;
    selectedDays: number;
    isLoading: boolean;
    visibleProviders: TimeSeriesProvider[];
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
                            tick={{ fontSize: 12, fill: theme.palette.text.primary }}
                            interval={getTickInterval()}
                        />
                        <YAxis 
                            tickFormatter={(value) => value.toFixed(1)}
                            domain={['auto', 'auto']}
                            stroke={theme.palette.text.secondary}
                            tick={{ fontSize: 12, fill: theme.palette.text.primary }}
                        />
                        <Tooltip 
                            labelFormatter={(timestamp: string) => {
                                const date = new Date(timestamp);
                                return date.toLocaleString();
                            }}
                            formatter={(value: number) => [value?.toFixed(2) || 'N/A', '']}
                        />
                        <Legend
                            formatter={(value: string) => {
                                // Find the provider for this legend entry
                                const provider = visibleProviders.find(p => p.provider === value);
                                if (provider?.deprecated) {
                                    return `${value} ⚠`;
                                }
                                return value;
                            }}
                        />
                        {!isLoading && visibleProviders.map((provider) => {
                            const isDeprecated = provider.deprecated;
                            const baseColor = getProviderColor(theme, provider.provider as Provider);
                            const strokeColor = isDeprecated ? '#999999' : baseColor;
                            const strokeDasharray = isDeprecated ? '5 5' : undefined;
                            const strokeOpacity = isDeprecated ? 0.6 : 1;

                            return (
                                <Line
                                    key={provider.provider}
                                    type="monotone"
                                    dataKey={`${model.model_name}-${provider.provider}`}
                                    name={provider.provider}
                                    stroke={strokeColor}
                                    strokeDasharray={strokeDasharray}
                                    strokeOpacity={strokeOpacity}
                                    strokeWidth={isDeprecated ? 1 : 2}
                                    dot={false}
                                    connectNulls
                                />
                            );
                        })}
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

    // Precompute visible providers for each model (applies the same coverage rule used during rendering)
    // Show ALL providers (active and deprecated) that meet coverage threshold
    const modelsWithVisibility = useMemo(() => {
        return data.models.map((model) => {
            const visibleProviders = getVisibleProviders(model);
            const totalProvidersWithValues = model.providers.filter(p => p.values && p.values.length > 0).length;

            return {
                model,
                visibleProviders,
                visibleCount: visibleProviders.length,
                totalProvidersWithValues,
            };
        });
    }, [data.models]);

    // Sort models by number of visible providers (lines), then fall back to total providers and name
    const sortedModelsWithVisibility = useMemo(() => {
        return [...modelsWithVisibility].sort((a, b) => {
            if (b.visibleCount !== a.visibleCount) {
                return b.visibleCount - a.visibleCount;
            }

            if (b.totalProvidersWithValues !== a.totalProvidersWithValues) {
                return b.totalProvidersWithValues - a.totalProvidersWithValues;
            }

            const aLabel = a.model.display_name || a.model.model_name;
            const bLabel = b.model.display_name || b.model.model_name;
            return aLabel.localeCompare(bLabel, undefined, { sensitivity: 'base' });
        });
    }, [modelsWithVisibility]);

    if (!data.timestamps.length || !sortedModelsWithVisibility.length) {
        return <div>No data available</div>;
    }

    return (
        <div>
            <TimeRangeSelector
                selectedDays={selectedDays}
                onChange={handleTimeRangeChange}
            />
            {sortedModelsWithVisibility.map(({ model, visibleProviders }) => (
                <ModelChart
                    key={model.model_name}
                    model={model}
                    chartData={chartData}
                    theme={theme}
                    selectedDays={selectedDays}
                    isLoading={isLoading}
                    visibleProviders={visibleProviders}
                />
            ))}
        </div>
    );
};

export default memo(TimeSeriesChart);
