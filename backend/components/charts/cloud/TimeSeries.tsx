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
import { DeprecatedModelsPanel } from './DeprecatedModelsPanel';

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
    deprecatedProviders,
    selectedDeprecated,
    onToggleDeprecated,
}: {
    model: TimeSeriesModel;
    chartData: ChartDataPoint[];
    theme: any;
    selectedDays: number;
    isLoading: boolean;
    visibleProviders: TimeSeriesProvider[];
    deprecatedProviders: TimeSeriesProvider[];
    selectedDeprecated: Set<string>;
    onToggleDeprecated: (canonical: string) => void;
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

    // Combine visible providers with selected deprecated providers
    const allVisibleProviders = useMemo(() => {
        const selectedDeprecatedProviders = deprecatedProviders.filter(p =>
            selectedDeprecated.has(p.providerCanonical)
        );
        return [...visibleProviders, ...selectedDeprecatedProviders];
    }, [visibleProviders, deprecatedProviders, selectedDeprecated]);

    return (
        <div key={model.model_name} style={{ position: 'relative' }}>
            <h3>{model.display_name || model.model_name}</h3>
            <Box sx={{ display: 'flex', position: 'relative' }}>
                <Box sx={{ flex: 1, height: 250 }}>
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
                        <Legend />
                        {!isLoading && allVisibleProviders.map((provider) => (
                            <Line
                                key={provider.provider}
                                type="monotone"
                                dataKey={`${model.model_name}-${provider.provider}`}
                                name={provider.provider}
                                stroke={getProviderColor(theme, provider.provider as Provider)}
                                dot={false}
                                connectNulls
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
                </Box>

                {/* Deprecated models panel */}
                <DeprecatedModelsPanel
                    deprecatedProviders={deprecatedProviders}
                    selectedProviders={selectedDeprecated}
                    onToggle={onToggleDeprecated}
                />
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
    const [selectedDeprecated, setSelectedDeprecated] = useState<Set<string>>(new Set());

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

    const handleToggleDeprecated = useCallback((providerCanonical: string) => {
        setSelectedDeprecated(prev => {
            const next = new Set(prev);
            if (next.has(providerCanonical)) {
                next.delete(providerCanonical);
            } else {
                next.add(providerCanonical);
            }
            return next;
        });
    }, []);

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
    // Separate active and deprecated providers
    const modelsWithVisibility = useMemo(() => {
        return data.models.map((model) => {
            // Separate active and deprecated providers
            const activeProviders = model.providers.filter(p => !p.deprecated);
            const deprecatedProviders = model.providers.filter(p => p.deprecated);

            // Apply coverage filter only to active providers
            const visibleProviders = activeProviders.filter(p =>
                getProviderCoverage(p) >= COVERAGE_THRESHOLD
            );

            const totalProvidersWithValues = model.providers.filter(p => p.values && p.values.length > 0).length;

            return {
                model,
                visibleProviders,
                deprecatedProviders,
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
            {sortedModelsWithVisibility.map(({ model, visibleProviders, deprecatedProviders }) => (
                <ModelChart
                    key={model.model_name}
                    model={model}
                    chartData={chartData}
                    theme={theme}
                    selectedDays={selectedDays}
                    isLoading={isLoading}
                    visibleProviders={visibleProviders}
                    deprecatedProviders={deprecatedProviders}
                    selectedDeprecated={selectedDeprecated}
                    onToggleDeprecated={handleToggleDeprecated}
                />
            ))}
        </div>
    );
};

export default memo(TimeSeriesChart);
