/**
 * Throughput against consistency, one dot per model.
 *
 * Fast and steady sits bottom-right. The top of the plot is where a provider is
 * quick on average but not reliably so — which a ranked table cannot show at
 * all, because a mean of 300 with a 200% spread and a mean of 300 with a 20%
 * spread occupy the same row.
 *
 * This panel exists because the first Console draft filled the space below the
 * provider aggregates by reprinting peak throughput, best TTFT and tightest
 * spread, all three of which the meter strip already carried. A different cut
 * of the same window earns the space; a restatement does not.
 */

import React, { useMemo } from 'react';
import { styled } from '@mui/material/styles';
import { colors, typography, spacing } from '../../design-system';
import { niceTicks, stabilityOf } from '../../../utils/chartMath';

export interface ScatterPoint {
    model: string;
    provider: string;
    /** Mean tokens per second. */
    x: number;
    /** Spread, as a percentage of the mean. */
    y: number;
}

interface SpreadScatterProps {
    points: ScatterPoint[];
    width?: number;
    height?: number;
}

const Frame = styled('div')({
    padding: `${spacing.scale[3]}px ${spacing.scale[4]}px ${spacing.scale[3]}px`,

    '& .sc-grid': {
        stroke: colors.ruleSoft,
        strokeWidth: 1,
    },
    '& .sc-ax': {
        fill: colors.textMute,
        fontFamily: typography.monoFamily,
        fontSize: typography.sizes.micro,
    },
    '& .sc-dot[data-state="steady"]': { fill: colors.ok },
    '& .sc-dot[data-state="variable"]': { fill: colors.warn },
    '& .sc-dot[data-state="unstable"]': { fill: colors.bad },
    '& .sc-dot': { fillOpacity: 0.8 },
    '& .sc-dot:hover': { fill: colors.text, fillOpacity: 1 },
});

const AxisNote = styled('div')({
    display: 'flex',
    justifyContent: 'space-between',
    paddingTop: '2px',
    fontFamily: typography.monoFamily,
    fontSize: typography.sizes.micro,
    letterSpacing: typography.tracking.tag,
    textTransform: 'uppercase',
    color: colors.textMute,
});

const PAD = 30;

const SpreadScatter: React.FC<SpreadScatterProps> = ({ points, width = 368, height = 208 }) => {
    const geometry = useMemo(() => {
        const usable = points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && p.x > 0);
        if (!usable.length) return null;

        const xMax = Math.max(...usable.map((p) => p.x)) * 1.05;
        const yMax = Math.max(...usable.map((p) => p.y)) * 1.05;

        return {
            usable,
            xMax,
            yMax,
            px: (v: number) => PAD + (v / xMax) * (width - PAD - 8),
            py: (v: number) => height - PAD - (v / yMax) * (height - PAD - 10),
            xTicks: niceTicks(xMax, 4),
            yTicks: niceTicks(yMax, 3),
        };
    }, [points, width, height]);

    if (!geometry) return null;

    const { usable, px, py, xTicks, yTicks } = geometry;

    return (
        <Frame>
            <svg
                viewBox={`0 0 ${width} ${height}`}
                width="100%"
                role="img"
                aria-label={`Mean throughput against run-to-run spread, one point per model, ${usable.length} models`}
            >
                {xTicks.map((t) => (
                    <g key={`x${t}`}>
                        <line className="sc-grid" x1={px(t).toFixed(1)} y1={8} x2={px(t).toFixed(1)} y2={height - PAD} />
                        <text className="sc-ax" x={px(t).toFixed(1)} y={height - PAD + 13} textAnchor="middle">
                            {t}
                        </text>
                    </g>
                ))}
                {yTicks.map((t) => (
                    <g key={`y${t}`}>
                        <line className="sc-grid" x1={PAD} y1={py(t).toFixed(1)} x2={width - 8} y2={py(t).toFixed(1)} />
                        <text className="sc-ax" x={PAD - 5} y={(py(t) + 3).toFixed(1)} textAnchor="end">
                            {t}
                        </text>
                    </g>
                ))}
                {usable.map((p, i) => (
                    <circle
                        className="sc-dot"
                        key={`${p.provider}-${p.model}-${i}`}
                        data-state={stabilityOf(p.y)}
                        cx={px(p.x).toFixed(1)}
                        cy={py(p.y).toFixed(1)}
                        r={2.6}
                    >
                        <title>{`${p.model} · ${p.provider} · ${Math.round(p.x)} tok/s · ${Math.round(p.y)}% spread`}</title>
                    </circle>
                ))}
            </svg>
            <AxisNote>
                <span>mean tok/s →</span>
                <span>↑ spread %</span>
            </AxisNote>
        </Frame>
    );
};

export default React.memo(SpreadScatter);
