/**
 * Small marks that live inside a table row or beside a figure.
 *
 * The ridgeline is the site's signature silhouette; these are the same shape at
 * small size, which is what makes a results row and the distribution chart read
 * as the same document rather than as two widgets.
 */

import React from 'react';
import { colors } from '../design-system';
import { toPath } from '../../utils/chartMath';

// =============================================================================
// SPARKLINE
// =============================================================================

interface SparklineProps {
    values: Array<number | null>;
    width?: number;
    height?: number;
    label?: string;
}

/**
 * Trend mark for a table row. Scaled to its own range, because the question a
 * row-level sparkline answers is "is this steady", not "is this fast" — the
 * mean column beside it already answers the second.
 */
export const Sparkline: React.FC<SparklineProps> = ({ values, width = 56, height = 14, label }) => {
    const clean = values.filter((v): v is number => v != null);
    if (clean.length < 2) return <span aria-hidden="true">—</span>;

    const max = Math.max(...clean);
    const min = Math.min(...clean);
    const span = max - min || 1;

    const pts: Array<[number, number]> = [];
    values.forEach((v, i) => {
        if (v == null) return;
        pts.push([(i / Math.max(values.length - 1, 1)) * width, height - ((v - min) / span) * height]);
    });

    return (
        <svg
            viewBox={`0 0 ${width} ${height}`}
            width={width}
            height={height}
            role={label ? 'img' : undefined}
            aria-label={label}
            aria-hidden={label ? undefined : true}
            style={{ display: 'block' }}
        >
            <path d={toPath(pts)} fill="none" stroke={colors.textMute} strokeWidth={1} />
        </svg>
    );
};

// =============================================================================
// RANGE STRIP
// =============================================================================

interface RangeStripProps {
    min: number;
    mean: number;
    max: number;
    /** Shared across every row, so strips are comparable down the column. */
    scaleMax: number;
    height?: number;
}

/**
 * Min · mean · max on a scale shared by the whole column. Puts the distribution
 * inside the row instead of in a separate chart, so a reader scanning the table
 * can see which numbers are trustworthy without leaving it.
 */
export const RangeStrip: React.FC<RangeStripProps> = ({ min, mean, max, scaleMax, height = 12 }) => {
    if (!(scaleMax > 0) || !Number.isFinite(mean)) return <span aria-hidden="true">—</span>;

    const width = 200;
    const x = (v: number) => Math.max(0, Math.min(1, v / scaleMax)) * width;
    const mid = height / 2;

    return (
        <svg
            viewBox={`0 0 ${width} ${height}`}
            width="100%"
            height={height}
            preserveAspectRatio="none"
            role="img"
            aria-label={`${Math.round(min)} to ${Math.round(max)} tokens per second, mean ${Math.round(mean)}`}
            style={{ display: 'block', minWidth: '70px' }}
        >
            <line x1={0} y1={mid} x2={width} y2={mid} stroke={colors.rule} />
            <line
                x1={x(min).toFixed(1)}
                y1={mid}
                x2={x(max).toFixed(1)}
                y2={mid}
                stroke={colors.textDim}
                strokeWidth={2}
            />
            <circle cx={x(mean).toFixed(1)} cy={mid} r={3} fill={colors.accent} />
        </svg>
    );
};

// =============================================================================
// STATE DOT
// =============================================================================

/** The 6px square that carries health state in a table cell. */
export const StateDot: React.FC<{ state: 'ok' | 'warn' | 'bad' }> = ({ state }) => (
    <span
        aria-hidden="true"
        style={{
            display: 'inline-block',
            width: '6px',
            height: '6px',
            marginRight: '6px',
            verticalAlign: 'baseline',
            background: state === 'ok' ? colors.ok : state === 'warn' ? colors.warn : colors.bad,
        }}
    />
);
