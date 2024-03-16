import { FC } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useTheme } from '@mui/material/styles';
import { Provider, providerColors } from '../../theme/theme';

interface DataItem {
    provider: string;
    model_name: string;
    tokens_per_second_mean: number;
}

interface Props {
    data: DataItem[];
}

interface CombinedDataItem {
    model_name: string;
    [key: string]: number | string;
}


// Declare providers and models to use
const providers: Provider[] = [Provider.Anyscale, Provider.Together, Provider.Fireworks];
const modelNames = ["llama-2-7b", "llama-2-13b", "llama-2-70b", "mistral-7b", "mistral-8x7b"];

const SpeedCompareChart: FC<Props> = ({ data }) => {
    const theme = useTheme();

    // Filter data more concisely using predefined constants
    const filteredData = data.filter(item =>
        providers.includes(item.provider as Provider) && modelNames.includes(item.model_name)
    );

    // Simplify data combination logic
    const combinedData: CombinedDataItem[] = Object.values(filteredData.reduce((acc, item) => {
        const { model_name, tokens_per_second_mean, provider } = item;
        acc[model_name] = acc[model_name] || { model_name };
        acc[model_name][provider] = parseFloat(tokens_per_second_mean.toFixed(2));
        return acc;
    }, {} as Record<string, CombinedDataItem>));

    // Use a predefined order array for sorting
    const order = ["mistral-7b", "mistral-8x7b", "llama-2-7b", "llama-2-13b", "llama-2-70b"];
    combinedData.sort((a, b) => order.indexOf(a.model_name) - order.indexOf(b.model_name));

    // Simplify renderLegendText by directly using the entry parameter's color
    const renderLegendText = (value: string, entry: any): JSX.Element => (
        <span style={{ color: entry.color }}>{value}</span>
    );

    return (
        <BarChart
            layout="vertical"
            width={700}
            height={600}
            data={combinedData}
            margin={{
                top: 20, right: 30, left: 50, bottom: 5,
            }}
        >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" stroke={theme.palette.common.white} />
            <YAxis dataKey="model_name" type="category" stroke={theme.palette.common.white} />
            <Tooltip />
            <Legend formatter={renderLegendText} />
            {providers.map(provider => (
                <Bar key={provider} dataKey={provider} fill={providerColors[provider]} />
            ))}
        </BarChart>
    );
};

export default SpeedCompareChart;