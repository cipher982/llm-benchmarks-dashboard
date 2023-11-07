// BenchScatterChart.js
import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const BenchScatterChart = ({ data_f16, data_8bit, data_4bit }) => (
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
        {/* <Scatter name="All Frameworks" data={data} fill="#8884d8" /> */}
        {/* <Scatter name="Transformers" data={data_tf} fill="#8884d8" />
        <Scatter name="GGUF" data={data_gguf} fill="#82ca9d" /> */}
        <Scatter name="Float16" data={data_f16} fill="#8884d8" />
        <Scatter name="8-bit" data={data_8bit} fill="#82ca9d" />
        <Scatter name="4-bit" data={data_4bit} fill="#FF0000" />
        <XAxis
            dataKey="gpu_mem_usage"
            type="number"
            scale="log"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(tick) => ` ${tick.toFixed(2)}`}
            angle={45}
            dx={15}
            dy={20}
            minTickGap={-200}
        // axisLine={false}
        />
        <YAxis dataKey="tokens_per_second" type="number" />
        <Tooltip />
        <Legend layout="vertical" verticalAlign="top" align="right" />
    </ScatterChart>
);

export default BenchScatterChart;
