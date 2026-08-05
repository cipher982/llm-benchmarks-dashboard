/**
 * Throughput distribution, as a ridgeline.
 *
 * Replaces ~120 density curves stacked in one frame with one normalised curve
 * per model, sorted fastest first, drawn small and overlapping. The old chart
 * also broke its x-axis at 140 and squeezed everything above into a narrow
 * right-hand panel, which made the fastest models — the reason anyone reads the
 * chart — the hardest part of it to compare. This one is a single linear axis
 * whose domain comes from where the data stops carrying mass.
 *
 * Labels are HTML rather than SVG text so they stay selectable and can ellipse
 * cleanly; they sit in a rail beside the plot rather than on top of the curves,
 * which is what made the old direct labels illegible once models overlapped.
 */

import React, { useMemo } from 'react';
import { styled } from '@mui/material/styles';
import { colors, typography, spacing, breakpoints } from '../../design-system';
import { SpeedDistributionPoint } from '../../../types/ProcessedData';
import {
    resampleDensity,
    densityDomainMax,
    support,
    axisTicks,
    toPath,
} from '../../../utils/chartMath';

interface SpeedDistChartProps {
    data: SpeedDistributionPoint[];
    /** Rows drawn. The remainder is reported rather than silently dropped. */
    maxRows?: number;
}

const RIDGE_POINTS = 72;
const ROW_HEIGHT = 17;
const OVERLAP = 2.4;
const PLOT_WIDTH = 700;

const Frame = styled('div')({
    display: 'grid',
    gridTemplateColumns: '260px minmax(0, 1fr)',
    padding: `${spacing.scale[3]}px ${spacing.scale[4]}px ${spacing.scale[1]}px`,

    [`@media (max-width: ${breakpoints.sm}px)`]: {
        gridTemplateColumns: 'minmax(0, 1fr)',
    },
});

const LabelRail = styled('ul')({
    position: 'relative',
    margin: 0,
    padding: `8px 0 24px`,
    listStyle: 'none',

    '& li': {
        position: 'absolute',
        left: 0,
        right: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: '8px',
        fontSize: typography.sizes.xs,
        whiteSpace: 'nowrap',
    },

    [`@media (max-width: ${breakpoints.sm}px)`]: {
        display: 'none',
    },
});

const RailModel = styled('span')({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    color: colors.textDim,
    fontFamily: typography.fontFamily,

    '& i': {
        fontStyle: 'normal',
        fontSize: typography.sizes.micro,
        color: colors.textMute,
        marginLeft: '4px',
        textTransform: 'uppercase',
        letterSpacing: typography.tracking.tag,
    },
});

const RailMean = styled('span')({
    fontFamily: typography.monoFamily,
    fontVariantNumeric: 'tabular-nums',
    fontSize: typography.sizes.micro,
    color: colors.textMute,

    '& b': {
        color: colors.text,
        fontWeight: typography.weights.medium,
    },
});

const Plot = styled('div')({
    paddingTop: '8px',

    '& .ridge-area': {
        fill: colors.accent,
        fillOpacity: 0.1,
    },
    '& .ridge-line': {
        fill: 'none',
        stroke: colors.accent,
        strokeWidth: 1,
    },
    '& .ridge-mean': {
        fill: colors.text,
    },
    '& .ridge-tick line': {
        stroke: colors.ruleSoft,
    },
    '& .ridge-tick text': {
        fill: colors.textMute,
        fontFamily: typography.monoFamily,
        fontSize: typography.sizes.micro,
        textAnchor: 'middle',
    },
});

const Note = styled('p')({
    margin: 0,
    padding: `0 ${spacing.scale[4]}px ${spacing.scale[3]}px`,
    fontFamily: typography.monoFamily,
    fontSize: typography.sizes.micro,
    letterSpacing: typography.tracking.tag,
    textTransform: 'uppercase',
    color: colors.textMute,
});

interface RidgeRow {
    key: string;
    model: string;
    provider: string;
    mean: number;
    curve: number[];
}

const SpeedDistChart: React.FC<SpeedDistChartProps> = ({ data, maxRows = 22 }) => {
    const { rows, xMax, hidden } = useMemo(() => {
        const usable = (data ?? []).filter(
            (d) => d.density_points?.length && d.mean_tokens_per_second > 0,
        );
        const sorted = [...usable].sort((a, b) => b.mean_tokens_per_second - a.mean_tokens_per_second);
        const shown = sorted.slice(0, maxRows);

        const domainMax = densityDomainMax(
            shown.map((d) => ({ density_points: d.density_points, max: d.max_tokens_per_second })),
        );

        const built: RidgeRow[] = shown.map((d, i) => ({
            key: `${d.provider}-${d.model_name}-${i}`,
            model: d.display_name || d.model_name,
            provider: d.provider,
            mean: d.mean_tokens_per_second,
            curve: resampleDensity(d.density_points, domainMax, RIDGE_POINTS),
        }));

        return { rows: built, xMax: domainMax, hidden: sorted.length - shown.length };
    }, [data, maxRows]);

    if (!rows.length) {
        return null;
    }

    const amp = ROW_HEIGHT * OVERLAP;
    const plotHeight = ROW_HEIGHT * rows.length + amp;
    const ticks = axisTicks(xMax);

    // Slowest first so the faster rows — the ones being compared — sit in front.
    const bodies = rows
        .map((row, i) => {
            const baseY = amp + i * ROW_HEIGHT;
            const [lo, hi] = support(row.curve);
            const pts: Array<[number, number]> = row.curve
                .slice(lo, hi + 1)
                .map((y, j) => [((lo + j) / (row.curve.length - 1)) * PLOT_WIDTH, baseY - y * amp]);

            if (pts.length < 2) return null;

            const line = toPath(pts);
            const x0 = pts[0][0];
            const x1 = pts[pts.length - 1][0];
            const area = `${line}L${x1.toFixed(1)} ${baseY}L${x0.toFixed(1)} ${baseY}Z`;
            const meanX = Math.min(row.mean / xMax, 1) * PLOT_WIDTH;

            // Fade with depth so twenty overlapping rows still read as a stack.
            const opacity = 0.4 + (0.6 * (rows.length - i)) / rows.length;

            return (
                <g key={row.key} opacity={opacity}>
                    <path className="ridge-area" d={area} />
                    <path className="ridge-line" d={line} />
                    <circle className="ridge-mean" cx={meanX.toFixed(1)} cy={baseY.toFixed(1)} r={2} />
                </g>
            );
        })
        .filter(Boolean)
        .reverse();

    return (
        <>
            <Frame>
                <LabelRail aria-hidden="true">
                    {rows.map((row, i) => (
                        <li key={row.key} style={{ top: `${amp + i * ROW_HEIGHT - 7}px` }}>
                            <RailModel>
                                {row.model} <i>{row.provider}</i>
                            </RailModel>
                            <RailMean>
                                <b>{Math.round(row.mean)}</b> tok/s
                            </RailMean>
                        </li>
                    ))}
                </LabelRail>
                <Plot>
                    <svg
                        viewBox={`0 0 ${PLOT_WIDTH} ${plotHeight + 22}`}
                        width="100%"
                        role="img"
                        aria-label={`Throughput distribution for ${rows.length} models, fastest at top, ${Math.round(rows[0].mean)} to ${Math.round(rows[rows.length - 1].mean)} tokens per second`}
                    >
                        <g>
                            {ticks.map((t) => {
                                const x = (t / xMax) * PLOT_WIDTH;
                                const anchor = t === 0 ? 'start' : x > PLOT_WIDTH - 12 ? 'end' : 'middle';
                                return (
                                    <g className="ridge-tick" key={t}>
                                        <line x1={x.toFixed(1)} y1={0} x2={x.toFixed(1)} y2={plotHeight} />
                                        <text x={x.toFixed(1)} y={plotHeight + 14} style={{ textAnchor: anchor }}>
                                            {t}
                                        </text>
                                    </g>
                                );
                            })}
                        </g>
                        {bodies}
                    </svg>
                </Plot>
            </Frame>
            {/* The distribution is computed over generated throughput, while
                the table's Mean column prefers visible-token throughput where a
                provider reports it. The two therefore rank models differently,
                and saying so is cheaper than the reader finding out by noticing
                the top row here is not the top row down there. */}
            <Note>
                Generated throughput · curves normalised per model
                {hidden > 0 && ` · ${hidden} slower models not drawn, all ${rows.length + hidden} are in the table below`}
            </Note>
        </>
    );
};

export default React.memo(SpeedDistChart);
