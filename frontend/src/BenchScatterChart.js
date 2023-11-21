// BenchScatterChart.js
import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, Label, Legend, ResponsiveContainer } from 'recharts';

const BenchScatterChart = ({ theme, data_tf, data_gguf, data_hftgi, data_vllm }) => {
    const dataMin = 1;
    const dataMax = 25;

    // Limit datasets for aesthetics
    const data_tf_1 = data_tf.filter(item => item.tokens_per_second <= 450);
    const data_gguf_1 = data_gguf.filter(item => item.tokens_per_second <= 450);
    const data_hftgi_1 = data_hftgi.filter(item => item.tokens_per_second <= 450);
    const data_vllm_1 = data_vllm.filter(item => item.tokens_per_second <= 450);

    const data_tf_2 = data_tf_1.filter(item => item.gpu_mem_usage <= 24);
    const data_gguf_2 = data_gguf_1.filter(item => item.gpu_mem_usage <= 24);
    const data_hftgi_2 = data_hftgi_1.filter(item => item.gpu_mem_usage <= 24);
    const data_vllm_2 = data_vllm_1.filter(item => item.gpu_mem_usage <= 24);


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
                <Scatter name="Transformers" data={data_tf_2} fill="#2980b9" />
                <Scatter name="llama-cpp/GGUF" data={data_gguf_2} fill="#e74c3c" />
                <Scatter name="HF-TGI" data={data_hftgi_2} fill="#f1c40f" />
                <Scatter name="vLLM" data={data_vllm_2} fill="#1abc9c" />
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
                    domain={[0, 400]}
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
