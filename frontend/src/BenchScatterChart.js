// BenchScatterChart.js
import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, Label, Legend, ResponsiveContainer } from 'recharts';

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

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="custom-tooltip">
                    <p className="label">{`Framework : ${payload[0].payload.framework}`}</p>
                    <p className="label">{`Model Name : ${payload[0].payload.model_name}`}</p>
                    <p className="label">{`GPU Memory Usage : ${payload[0].value}`}</p>
                    <p className="label">{`Tokens/Second : ${payload[1].value}`}</p>
                </div>
            );
        }

        return null;
    };

    return (
        <ResponsiveContainer width="100%" height={250}>
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
                    domain={[dataMin, dataMax]}
                    tickFormatter={(tick) => `${tick.toFixed(2)}`}
                    dy={10}
                    angle={0}
                    ticks={logTicks}
                    stroke={theme.palette.text.primary}
                >
                    <Label
                        value="GPU Memory Usage (GB)"
                        offset={-20}
                        position="insideBottom"
                        style={{ fill: theme.palette.text.primary }}
                    />
                </XAxis>
                <YAxis
                    dataKey="tokens_per_second"
                    type="number"
                    stroke={theme.palette.text.primary}
                >
                    <Label
                        value="Tokens/Second"
                        offset={0}
                        dy={50} // Increase this value to move the label lower
                        position="insideLeft"
                        angle={-90} style={{ fill: theme.palette.text.primary }}
                    />
                </YAxis>
                <Tooltip content={<CustomTooltip />} />
                <Legend layout="vertical" verticalAlign="top" align="right" />
            </ScatterChart>
        </ResponsiveContainer>

    );
};

export default BenchScatterChart;
