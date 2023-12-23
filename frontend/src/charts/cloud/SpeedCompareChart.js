import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const SpeedCompareChart = ({ data, theme }) => {
    const nameMapping = {
        // llama 7b
        "meta-llama/Llama-2-7b-chat-hf": "llama-2-7b",
        "togethercomputer/llama-2-7b-chat": "llama-2-7b",
        // llama 13b
        "meta-llama/Llama-2-13b-chat-hf": "llama-2-13b",
        "togethercomputer/llama-2-13b-chat": "llama-2-13b",
        // llama 70b
        "meta-llama/Llama-2-70b-chat-hf": "llama-2-70b",
        "togethercomputer/llama-2-70b-chat": "llama-2-70b",
        // Add more mappings as needed
    };

    // Filter out data not from 'anyscale' or 'together'
    const filteredData = data.filter(item => ['anyscale', 'together'].includes(item.provider));

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
            name: nameMapping[item.model_name] || item.model_name, // Use the mapped name without provider
        };
    });

    // Apply model name mapping and filter out unmapped models
    const mappedData = transformedData
        .filter(item => nameMapping[item.model_name]) // Ensure only mapped models are included
        .map(item => ({
            ...item,
            model_name: nameMapping[item.model_name],
        }));

    // Combine the data from both providers
    const combinedData = Object.values(mappedData.reduce((acc, item) => {
        const { model_name, tokens_per_second_mean, provider } = item;
        const key = model_name;
        if (!acc[key]) {
            acc[key] = { model_name, [provider]: tokens_per_second_mean };
        } else {
            acc[key][provider] = tokens_per_second_mean;
        }
        return acc;
    }, {}));

    // Define the order
    const order = ["llama-2-7b", "llama-2-13b", "llama-2-70b"];

    // Sort the combinedData array
    combinedData.sort((a, b) => order.indexOf(a.model_name) - order.indexOf(b.model_name));


    return (
        <BarChart
            layout="vertical"
            width={700}
            height={300}
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
            <Legend />
            <Bar dataKey="anyscale" fill="#993333" stackId="a" />
            <Bar dataKey="together" fill="#669933" stackId="b" />
        </BarChart>
    );
};

export default SpeedCompareChart;