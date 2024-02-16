import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { scaleOrdinal, schemeCategory10 } from 'd3';

const SpeedCompareChart = ({ data, theme }) => {
    const colorScale = scaleOrdinal(schemeCategory10);

    // Filter out data not from 'anyscale' or 'together'
    const filteredData = data.filter(item =>
        ["anyscale", "together", "openrouter", "fireworks"].includes(item.provider) &&
        ["llama-2-7b", "llama-2-13b", "llama-2-70b", "mistral-7b", "mistral-8x7b"].includes(item.model_name)
    );
    // Group and calculate mean tokens_per_second
    const groupedData = filteredData.reduce((acc, item) => {
        const key = `${item.provider}-${item.model_name}`;
        if (!acc[key]) {
            acc[key] = { ...item, tokens_per_second: parseFloat(item.tokens_per_second) || 0, count: 1 };
        } else {
            acc[key].tokens_per_second += parseFloat(item.tokens_per_second) || 0;
            acc[key].count += 1;
        }
        return acc;
    }, {});

    // Calculate mean and prepare data for chart
    const transformedData = Object.values(groupedData).map(item => {
        const mean = item.count > 0 ? item.tokens_per_second / item.count : 0;
        return {
            ...item,
            tokens_per_second_mean: mean,
            name: item.model_name,
        };
    });


    // Combine the data from both providers
    const combinedData = Object.values(transformedData.reduce((acc, item) => {
        const { model_name, tokens_per_second_mean, provider } = item;
        const key = model_name;
        if (!acc[key]) {
            acc[key] = { model_name, [provider]: tokens_per_second_mean };
        } else {
            acc[key][provider] = tokens_per_second_mean;
        }
        return acc;
    }, {}));

    // Round tokens_per_second_mean to two decimal places
    const roundedData = combinedData.map(item => {
        const providers = ["anyscale", "together", "openrouter", "fireworks"];
        providers.forEach(provider => {
            if (item[provider]) {
                item[provider] = parseFloat(item[provider].toFixed(2));
            }
        });
        return item;
    });

    // Define the order
    const order = ["mistral-7b", "mistral-8x7b", "llama-2-7b", "llama-2-13b", "llama-2-70b"];

    // Sort the combinedData array
    roundedData.sort((a, b) => order.indexOf(a.model_name) - order.indexOf(b.model_name));

    const renderLegendText = (value, entry) => {
        return <span style={{ color: '#fff' }}>{value}</span>;
    };

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
            <XAxis
                type="number"
                stroke={theme.palette.text.primary}
            />
            <YAxis
                dataKey="model_name"
                type="category"
                stroke={theme.palette.text.primary}
            />
            <Tooltip />
            <Legend formatter={renderLegendText} />
            <Bar dataKey="anyscale" fill={colorScale("anyscale")} />
            <Bar dataKey="together" fill={colorScale("together")} />
            <Bar dataKey="openrouter" fill={colorScale("openrouter")} />
            <Bar dataKey="fireworks" fill={colorScale("fireworks")} />
        </BarChart>
    );
};

export default SpeedCompareChart;