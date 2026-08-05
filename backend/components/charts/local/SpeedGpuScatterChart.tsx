import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, Label, Legend, ResponsiveContainer, TooltipProps } from 'recharts';
import { colors, typography, seriesColor } from '../../design-system';

interface DataItem {
    tokens_per_second: number;
    gpu_mem_usage: number;
    framework?: string;
    model_name?: string;
}

interface SpeedGpuScatterChartProps {
    isMobile: boolean;
    data_tf: DataItem[];
    data_gguf: DataItem[];
    data_hftgi: DataItem[];
    data_vllm: DataItem[];
}

const SpeedGpuScatterChart: React.FC<SpeedGpuScatterChartProps> = ({ isMobile, data_tf, data_gguf, data_hftgi, data_vllm }) => {
    const dataMin = 1;
    const dataMax = 25;

    const filterData = (data: DataItem[]) => data.filter(item => item.tokens_per_second <= 450 && item.gpu_mem_usage <= 24);

    const data_tf_2 = filterData(data_tf);
    const data_gguf_2 = filterData(data_gguf);
    const data_hftgi_2 = filterData(data_hftgi);
    const data_vllm_2 = filterData(data_vllm);

    const generateLogTicks = (min: number, max: number): number[] => {
        let ticks: number[] = [];
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

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div
                    style={{
                        background: colors.raised,
                        border: `1px solid ${colors.rule}`,
                        padding: '8px 10px',
                        fontFamily: typography.monoFamily,
                        fontSize: typography.sizes.micro,
                        color: colors.text,
                        lineHeight: 1.6,
                    }}
                >
                    <div>{payload[0].payload.model_name}</div>
                    <div style={{ color: colors.textMute, textTransform: 'uppercase' }}>
                        {payload[0].payload.framework}
                    </div>
                    <div>{payload[0].value} GB · {payload[1].value} tok/s</div>
                </div>
            );
        }
        return null;
    };

    const axisStyle = {
        stroke: colors.rule,
        tick: { fill: colors.textMute, fontFamily: typography.monoFamily, fontSize: 9 },
    };

    return (
        <ResponsiveContainer width="100%" height={250}>
            <ScatterChart
                width={730}
                height={250}
                margin={{
                    top: 12,
                    right: 16,
                    bottom: 46,
                    left: 10,
                }}
            >
                {/* Series colour comes from the ordered categorical ramp, assigned
                    per view. The old flat-UI hexes were picked per chart and
                    matched nothing else on the site. */}
                <Scatter name="Transformers" data={data_tf_2} fill={seriesColor(0)} />
                <Scatter name="llama-cpp/GGUF" data={data_gguf_2} fill={seriesColor(1)} />
                <Scatter name="HF-TGI" data={data_hftgi_2} fill={seriesColor(2)} />
                <Scatter name="vLLM" data={data_vllm_2} fill={seriesColor(3)} />
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
                    {...axisStyle}
                >
                    <Label
                        value="GPU MEMORY (GB)"
                        offset={-20}
                        position="insideBottom"
                        fill={colors.textMute}
                        style={{ fontFamily: typography.monoFamily, fontSize: 9, letterSpacing: '0.08em' }}
                    />
                </XAxis>
                <YAxis
                    dataKey="tokens_per_second"
                    type="number"
                    domain={[0, 400]}
                    {...axisStyle}
                >
                    <Label
                        value="TOK/S"
                        offset={0}
                        dy={30}
                        position="insideLeft"
                        angle={-90}
                        fill={colors.textMute}
                        style={{ fontFamily: typography.monoFamily, fontSize: 9, letterSpacing: '0.08em' }}
                    />
                </YAxis>
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: colors.rule }} />
                {/* Horizontal and below the plot at every width. Docked
                    top-right it sat directly over the 20-24GB cluster, masking
                    exactly the high-memory runs the chart exists to compare. */}
                <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="left"
                    wrapperStyle={{
                        bottom: 0,
                        left: 10,
                        fontFamily: typography.monoFamily,
                        fontSize: '10px',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: colors.textDim,
                    }}
                />
            </ScatterChart>
        </ResponsiveContainer>
    );
};

export default SpeedGpuScatterChart;
