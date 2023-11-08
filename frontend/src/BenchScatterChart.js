// BenchScatterChart.js
import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const BenchScatterChart = ({ data_tf_4bit, data_tf_8bit, data_tf_f16, data_gguf_4bit, data_gguf_8bit, data_gguf_f16 }) => {
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

    // const renderSquareShape = (props) => {
    //     const { cx, cy, fill } = props;
    //     return <rect x={cx - 5} y={cy - 5} width={10} height={10} fill={fill} />;
    // };

    // const renderCircleShape = (props) => {
    //     const { cx, cy, fill } = props;
    //     return <circle cx={cx} cy={cy} r={5} fill={fill} />;
    // };

    return (
        <ScatterChart
            width={730}
            height={250}
            margin={{
                top: 20,
                right: 20,
                bottom: 30,
                left: 10,
            }}
        >
            {/* Scatter plots for each data type */}
            <Scatter name="TF 4-bit" data={data_tf_4bit} fill="#FF0000" />
            <Scatter name="TF 8-bit" data={data_tf_8bit} fill="#82ca9d" />
            <Scatter name="TF float16" data={data_tf_f16} fill="#8884d8" />
            <Scatter name="GGUF 4-bit" data={data_gguf_4bit} fill="#FF0000" />
            <Scatter name="GGUF 8-bit" data={data_gguf_8bit} fill="#82ca9d" />
            <Scatter name="GGUF float16" data={data_gguf_f16} fill="#8884d8" />

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
            />
            <YAxis dataKey="tokens_per_second" type="number" />
            <Tooltip />
            {/* <Legend layout="vertical" verticalAlign="top" align="right" /> */}
        </ScatterChart>
    );
};

export default BenchScatterChart;
