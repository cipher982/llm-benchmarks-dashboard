import React, { useEffect, useMemo, memo } from 'react';
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

interface TimeSeriesChartProps {
    data: TimeSeriesData;
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
                    provider?.values && (
                        <Line
                            key={`${model.model_name}-${provider.provider}`}
                            type="monotone"
                            dataKey={`${model.model_name}-${provider.provider}`}
                            stroke={providerColors[provider.provider as Provider]}
                            dot={false}
                            name={provider.provider}
                        />
                    )
                ))}
            </LineChart>
        </ResponsiveContainer>
    </div>
));

ModelChart.displayName = 'ModelChart';

const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({ data }) => {
    const theme = useTheme();
    
    useEffect(() => {
        performance.mark('chart-start');
        return () => {
            performance.measure('chart-total-time', 'chart-start');
        };
    }, []);

    // Memoize synthetic timestamps
    const syntheticTimestamps = useMemo(() => {
        console.time('synthetic-timestamps');
        const numDataPoints = data?.timestamps?.length || 0;
        const now = new Date();
        const timestamps = Array.from({ length: numDataPoints }, (_, i) => {
            const timestamp = new Date(now.getTime() - (numDataPoints - 1 - i) * 30 * 60 * 1000);
            return timestamp.toISOString();
        });
        console.timeEnd('synthetic-timestamps');
        return timestamps;
    }, [data?.timestamps?.length]);

    // Memoize chart data transformation
    const chartData = useMemo(() => {
        console.time('chart-data-transform');
        if (!data?.models) return [];
        
        const result = syntheticTimestamps.map((timestamp, index) => {
            const point: ChartDataPoint = { timestamp };
            data.models.forEach((model: TimeSeriesModel) => {
                model.providers?.forEach(provider => {
                    if (provider?.values) {
                        const key = `${model.model_name}-${provider.provider}`;
                        point[key] = provider.values[index] ?? null;
                    }
                });
            });
            return point;
        });
        console.timeEnd('chart-data-transform');
        return result;
    }, [data?.models, syntheticTimestamps]);

    // Memoize sorted models
    const sortedModels = useMemo(() => {
        console.time('model-sorting');
        const result = (data?.models || [])
            .filter((model: TimeSeriesModel) => model?.providers?.some(p => p?.values))
            .sort((a: TimeSeriesModel, b: TimeSeriesModel) => 
                (b.providers?.length || 0) - (a.providers?.length || 0)
            );
        console.timeEnd('model-sorting');
        return result;
    }, [data?.models]);

    if (!data?.timestamps?.length || !sortedModels.length) {
        console.log('No data available - numDataPoints:', data?.timestamps?.length, 'sortedModels:', sortedModels.length);
        return <div>No data available</div>;
    }

    return (
        <Virtuoso
            useWindowScroll
            totalCount={sortedModels.length}
            itemContent={index => (
                <ModelChart
                    key={sortedModels[index].model_name}
                    model={sortedModels[index]}
                    chartData={chartData}
                    theme={theme}
                />
            )}
            overscan={3}
        />
    );
};

export default memo(TimeSeriesChart);
