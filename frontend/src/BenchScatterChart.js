// BenchScatterChart.js
import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const BenchScatterChart = ({ theme, data_tf, data_gguf }) => {
    const dataMin = 1;
    const dataMax = 25;

    const generateLogTicks = (min, max) => {
        let ticks = [];
        let power = Math.floor(Math.log10(min));

        while (Math.pow(10, power) < max) {
            let base = Math.pow(10, power);
            [1, 2, 5].forEach(multiplier => {
                let tick = base * multiplier;
                if (tick >= min && tick <= max && !ticks.includes(tick)) {
                    ticks.push(tick);
                }
            });
            power++;
        }
        return ticks.sort((a, b) => a - b);
    };

    const logTicks = generateLogTicks(dataMin, dataMax);

    return (
        <ScatterChart
            width={730}
            height={250}
            margin={{
                top: 20,
                right: 0,
                bottom: 30,
                left: 10,
            }}
        >
            {/* Scatter plots for each data type */}
            <Scatter name="Transformers" data={data_tf} fill="#4A90E2" />
            <Scatter name="GGUF" data={data_gguf} fill="#FF6B6B" />
            {/* Axes */}
            <XAxis
                dataKey="gpu_mem_usage"
                type="number"
                scale="log"
                domain={[dataMin, dataMax]} // use variables without quotes
                tickFormatter={(tick) => `${tick.toFixed(2)}`}
                dy={10}
                angle={0}
                ticks={logTicks} // Set the ticks array here
                stroke={theme.palette.text.primary}
            />
            <YAxis
                dataKey="tokens_per_second"
                type="number"
                stroke={theme.palette.text.primary}
            />
            <Tooltip />
            <Legend layout="vertical" verticalAlign="top" align="right" />
        </ScatterChart>
    );
};

export default BenchScatterChart;
