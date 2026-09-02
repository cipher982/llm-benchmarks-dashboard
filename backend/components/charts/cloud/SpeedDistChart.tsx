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
 *
 * The plot is drawn in pixels, not in a scaled viewBox. The rail positions each
 * label at `row * 17px`, so the curve for that row has to sit at the same
 * pixel — and an SVG that scales with its container does not: at 1440px the
 * two happened to agree, and on a wider screen the curves stretched to 1.7x
 * the rail and the top label pointed at the wrong ridge. The plot now measures
 * its own width and lays the curves out in that many pixels, so a row is 17px
 * tall at every viewport.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { styled, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Link from 'next/link';
import { colors, typography, spacing, breakpoints } from '../../design-system';
import { SpeedDistributionPoint } from '../../../types/ProcessedData';
import {
    resampleDensity,
    densityDomainMax,
    support,
    axisTicks,
    toPath,
    rowsBeyondDomain,
    slugKey,
    type SlugLookup,
} from '../../../utils/chartMath';

interface SpeedDistChartProps {
    data: SpeedDistributionPoint[];
    /** Rows drawn. The remainder is reported rather than silently dropped. */
    maxRows?: number;
    /**
     * Slugs from the table, so a model or provider named in this chart is
     * navigable like the same name in the table. The chart's own payload does
     * not carry slugs.
     */
    slugs?: SlugLookup;
}

const OVERLAP = 2.4;
const AXIS_HEIGHT = 22;
const MIN_PLOT_WIDTH = 320;

/**
 * Row pitch in pixels. 17px at the 1440px layout the chart was drawn for; a
 * wider plot earns taller rows, otherwise a 1,300px-wide ridgeline is a
 * 400px-tall band and the curves read as flattened rather than as wide.
 */
const rowHeightFor = (plotWidth: number): number => Math.round(Math.min(22, Math.max(17, plotWidth / 60)));

/**
 * Lanes the collector no longer calls. Their samples are still inside the
 * window, so they are still drawn — the chart reports the window, not the
 * catalogue — but a reader choosing a provider today needs to know which
 * ridges they cannot buy.
 */
const OFF_STATUSES = new Set(['disabled', 'deprecated']);

const Frame = styled('div')({
    display: 'grid',
    gridTemplateColumns: 'clamp(260px, 18%, 320px) minmax(0, 1fr)',
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
        alignItems: 'baseline',
        gap: '8px',
        fontSize: typography.sizes.xs,
        whiteSpace: 'nowrap',
        cursor: 'default',
    },
    // Hovering a label or a ridge names the pair. Twenty overlapping curves
    // are legible as a stack but not attributable one by one without this.
    '& li[data-state="muted"]': { opacity: 0.4 },
    '& li[data-state="active"] .rail-model': { color: colors.text },
    '& li[data-state="active"] .rail-mean b': { color: colors.accent },
    '& li[data-off="true"] .rail-model': { color: colors.textMute },

    [`@media (max-width: ${breakpoints.sm}px)`]: {
        display: 'none',
    },
});

const RailModel = styled('span')({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    color: colors.textDim,
    fontFamily: typography.fontFamily,

    '& a': {
        color: 'inherit',
        textDecoration: 'none',
        borderBottom: `1px solid ${colors.rule}`,
    },
    '& a:hover': { color: colors.text, borderBottomColor: colors.accent },

    '& i': {
        fontStyle: 'normal',
        fontSize: typography.sizes.micro,
        color: colors.textMute,
        marginLeft: '4px',
        textTransform: 'uppercase',
        letterSpacing: typography.tracking.tag,
    },
});

/**
 * Marks a lane the collector has stopped calling. Same colour as the table's
 * `disabled` dot. A sibling of the name rather than part of it, so a long
 * model name ellipses and the tag survives.
 */
const OffTag = styled('em')({
    flex: '0 0 auto',
    fontStyle: 'normal',
    fontFamily: typography.monoFamily,
    fontSize: typography.sizes.micro,
    letterSpacing: typography.tracking.tag,
    textTransform: 'uppercase',
    color: colors.warn,
    marginLeft: '-2px',
});

const RailMean = styled('span')({
    flex: '0 0 auto',
    marginLeft: 'auto',
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
    minWidth: 0,

    '& svg': { display: 'block' },

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

    // A retired lane keeps its shape but loses its ink.
    '& g[data-off="true"] .ridge-line': { strokeDasharray: '3 2', strokeOpacity: 0.7 },
    '& g[data-off="true"] .ridge-area': { fillOpacity: 0.05 },
    '& g[data-off="true"] .ridge-mean': { fill: colors.textMute },

    // Hover state. The CSS opacity replaces the depth fade set inline, which
    // is what makes the active ridge come forward from the stack.
    '& g[data-state="muted"]': { opacity: 0.22 },
    '& g[data-state="active"]': { opacity: 1 },
    '& g[data-state="active"] .ridge-line': { strokeWidth: 1.5, strokeOpacity: 1, strokeDasharray: 'none' },
    '& g[data-state="active"] .ridge-area': { fillOpacity: 0.3 },
    '& g[data-state="active"] .ridge-mean': { fill: colors.accent, r: 3 },
    '& .ridge-guide': {
        stroke: colors.accent,
        strokeOpacity: 0.5,
        strokeDasharray: '2 3',
    },
});

/**
 * The 390px form.
 *
 * The desktop ridgeline drops its label rail below 600px, which left 22
 * anonymous curves — a reader could not identify a model, rank one, or connect
 * the plot to the table. That is decoration, not measurement. At this width the
 * same data becomes a short stack of labelled rows: fewer models, each one
 * identifiable, each still carrying its own density silhouette.
 */
const MobileRows = styled('ol')({
    listStyle: 'none',
    margin: 0,
    padding: `${spacing.scale[2]}px ${spacing.scale[4]}px ${spacing.scale[3]}px`,

    '& li': {
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) auto',
        alignItems: 'baseline',
        gap: '0 8px',
        padding: `${spacing.scale[2]}px 0`,
        borderBottom: `1px solid ${colors.ruleSoft}`,
    },
    '& li:last-child': { borderBottom: 0 },

    '& .m-name': {
        fontFamily: typography.fontFamily,
        fontSize: typography.sizes.md,
        color: colors.text,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    '& li[data-off="true"] .m-name': { color: colors.textMute },
    // Inline here, after the provider tag, rather than a flex sibling.
    '& .m-name em': { marginLeft: '6px' },
    '& a': {
        color: 'inherit',
        textDecoration: 'none',
        borderBottom: `1px solid ${colors.rule}`,
    },
    '& .m-provider': {
        fontFamily: typography.monoFamily,
        fontSize: typography.sizes.micro,
        letterSpacing: typography.tracking.tag,
        textTransform: 'uppercase',
        color: colors.textMute,
    },
    '& .m-mean': {
        fontFamily: typography.monoFamily,
        fontVariantNumeric: 'tabular-nums',
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.medium,
        letterSpacing: typography.tracking.figure,
        color: colors.text,
    },
    '& .m-mean i': {
        fontStyle: 'normal',
        fontSize: typography.sizes.micro,
        color: colors.textMute,
        marginLeft: '3px',
    },
    '& .m-curve': {
        gridColumn: '1 / -1',
        display: 'block',
        marginTop: '4px',
    },
    '& .m-curve path': {
        fill: colors.accent,
        fillOpacity: 0.12,
        stroke: colors.accent,
        strokeWidth: 1,
        vectorEffect: 'non-scaling-stroke',
    },
    '& li[data-off="true"] .m-curve path': {
        fillOpacity: 0.05,
        strokeOpacity: 0.7,
        strokeDasharray: '3 2',
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
    off: boolean;
    curve: number[];
}

/**
 * Axis ticks for a plot of the given pixel width. `axisTicks` picks a step by
 * domain alone; on a wide plot that leaves 200px between ticks, so the step is
 * halved when it stays a round number.
 */
function tickValues(max: number, width: number): number[] {
    const base = axisTicks(max);
    if (base.length < 2 || width <= 0) return base;
    const step = base[1] - base[0];
    if (step % 50 !== 0 || (step / max) * width < 200) return base;
    const out: number[] = [];
    for (let t = 0; t <= max; t += step / 2) out.push(t);
    return out;
}

const SpeedDistChart: React.FC<SpeedDistChartProps> = ({ data, maxRows = 22, slugs }) => {
    const theme = useTheme();
    const isNarrow = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true });
    // The ridgeline and the mobile list are different layouts; server HTML can
    // only render the desktop form (no viewport), so on a phone the desktop
    // ridgeline would paint and then snap to the list after hydration. Render
    // nothing until the first client frame, so the breakpoint is already known.
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    const [active, setActive] = useState<string | null>(null);

    // Pixel width of the plot column, so curves and labels share a y-scale.
    const plotRef = useRef<HTMLDivElement>(null);
    const [plotWidth, setPlotWidth] = useState(0);

    const { rows, xMax, hidden, beyond, off } = useMemo(() => {
        const usable = (data ?? []).filter(
            (d) => d.density_points?.length && d.mean_tokens_per_second > 0,
        );
        const sorted = [...usable].sort((a, b) => b.mean_tokens_per_second - a.mean_tokens_per_second);
        const shown = sorted.slice(0, maxRows);

        const forDomain = shown.map((d) => ({
            density_points: d.density_points,
            max: d.max_tokens_per_second,
            mean: d.mean_tokens_per_second,
        }));
        const domainMax = densityDomainMax(forDomain);
        const beyond = rowsBeyondDomain(forDomain, domainMax);

        // Enough samples that a segment is a few pixels long; the source
        // density is piecewise linear, so more samples only smooth the render.
        const points = Math.max(72, Math.round(plotWidth / 5));

        const built: RidgeRow[] = shown.map((d, i) => ({
            key: `${d.provider}-${d.model_name}-${i}`,
            model: d.display_name || d.model_name,
            provider: d.provider,
            mean: d.mean_tokens_per_second,
            off: OFF_STATUSES.has(d.lifecycle_status ?? ''),
            curve: resampleDensity(d.density_points, domainMax, points),
        }));

        return {
            rows: built,
            xMax: domainMax,
            hidden: sorted.length - shown.length,
            beyond,
            off: built.filter((r) => r.off).length,
        };
    }, [data, maxRows, plotWidth]);

    useEffect(() => {
        if (!mounted || isNarrow) return;
        const node = plotRef.current;
        if (!node) return;

        const measure = () => {
            const width = Math.max(Math.floor(node.getBoundingClientRect().width), MIN_PLOT_WIDTH);
            setPlotWidth((current) => (current === width ? current : width));
        };
        measure();

        if (typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(measure);
        observer.observe(node);
        return () => observer.disconnect();
    }, [mounted, isNarrow, rows.length]);

    if (!mounted) {
        return null;
    }

    if (!rows.length) {
        return null;
    }

    if (isNarrow) {
        const shown = rows.slice(0, 8);
        const notDrawn = rows.length - shown.length + hidden;

        return (
            <>
                <MobileRows>
                    {shown.map((row) => {
                        const [lo, hi] = support(row.curve);
                        const slice = row.curve.slice(lo, hi + 1);
                        const width = 100;
                        const height = 18;
                        const pts: Array<[number, number]> = slice.map((y, i) => [
                            // Positioned across the shared domain, so a faster
                            // model's silhouette still sits further right than a
                            // slower one's — the ranking survives the format.
                            ((lo + i) / (row.curve.length - 1)) * width,
                            height - y * height,
                        ]);
                        const d = pts.length > 1
                            ? `${toPath(pts)}L${pts[pts.length - 1][0].toFixed(1)} ${height}L${pts[0][0].toFixed(1)} ${height}Z`
                            : '';

                        const link = slugs?.get(slugKey(row.provider, row.model));

                        return (
                            <li key={row.key} data-off={row.off || undefined}>
                                <span className="m-name">
                                    {link ? (
                                        <Link href={`/models/${link.providerSlug}/${link.modelSlug}`}>{row.model}</Link>
                                    ) : row.model}{' '}
                                    <span className="m-provider">
                                        {link ? (
                                            <Link href={`/providers/${link.providerSlug}`}>{row.provider}</Link>
                                        ) : row.provider}
                                    </span>
                                    {row.off && <OffTag>off</OffTag>}
                                </span>
                                <span className="m-mean">
                                    {Math.round(row.mean)}<i>tok/s</i>
                                </span>
                                {d && (
                                    <svg
                                        className="m-curve"
                                        viewBox={`0 0 ${width} ${height}`}
                                        width="100%"
                                        height={height}
                                        preserveAspectRatio="none"
                                        role="img"
                                        aria-label={`${row.model} throughput distribution, mean ${Math.round(row.mean)} tokens per second`}
                                    >
                                        <path d={d} />
                                    </svg>
                                )}
                            </li>
                        );
                    })}
                </MobileRows>
                <Note>
                    Visible-token throughput · 0–{xMax} tok/s across every row
                    {notDrawn > 0 && ` · ${notDrawn} slower models in the table below`}
                </Note>
            </>
        );
    }

    const width = plotWidth;
    const rowHeight = rowHeightFor(width);
    const amp = rowHeight * OVERLAP;
    const plotHeight = rowHeight * rows.length + amp;
    const ticks = tickValues(xMax, width);
    const stateOf = (key: string) => (active == null ? undefined : active === key ? 'active' : 'muted');

    // Slowest first so the faster rows — the ones being compared — sit in front;
    // the hovered row last of all, so it is never under a neighbour.
    const bodies = width > 0
        ? rows
            .map((row, i) => {
                const baseY = amp + i * rowHeight;
                const [lo, hi] = support(row.curve);
                const pts: Array<[number, number]> = row.curve
                    .slice(lo, hi + 1)
                    .map((y, j) => [((lo + j) / (row.curve.length - 1)) * width, baseY - y * amp]);

                if (pts.length < 2) return null;

                const line = toPath(pts);
                const x0 = pts[0][0];
                const x1 = pts[pts.length - 1][0];
                const area = `${line}L${x1.toFixed(1)} ${baseY}L${x0.toFixed(1)} ${baseY}Z`;
                const meanX = Math.min(row.mean / xMax, 1) * width;

                // Fade with depth so twenty overlapping rows still read as a stack.
                const opacity = 0.4 + (0.6 * (rows.length - i)) / rows.length;
                const state = stateOf(row.key);

                return (
                    <g
                        key={row.key}
                        opacity={opacity}
                        data-state={state}
                        data-off={row.off || undefined}
                        onMouseEnter={() => setActive(row.key)}
                        onMouseLeave={() => setActive(null)}
                    >
                        <path className="ridge-area" d={area} />
                        <path className="ridge-line" d={line} />
                        {state === 'active' && (
                            <line className="ridge-guide" x1={meanX.toFixed(1)} y1={baseY} x2={meanX.toFixed(1)} y2={plotHeight} />
                        )}
                        <circle className="ridge-mean" cx={meanX.toFixed(1)} cy={baseY.toFixed(1)} r={2} />
                    </g>
                );
            })
            .filter((el): el is React.ReactElement => el != null)
            .reverse()
            .sort((a, b) => (a.key === active ? 1 : b.key === active ? -1 : 0))
        : [];

    return (
        <>
            <Frame>
                <LabelRail>
                    {rows.map((row, i) => {
                        const link = slugs?.get(slugKey(row.provider, row.model));
                        return (
                            <li
                                key={row.key}
                                style={{ top: `${amp + i * rowHeight - 7}px` }}
                                data-state={stateOf(row.key)}
                                data-off={row.off || undefined}
                                onMouseEnter={() => setActive(row.key)}
                                onMouseLeave={() => setActive(null)}
                                onFocus={() => setActive(row.key)}
                                onBlur={() => setActive(null)}
                            >
                                <RailModel className="rail-model">
                                    {link ? (
                                        <Link href={`/models/${link.providerSlug}/${link.modelSlug}`}>{row.model}</Link>
                                    ) : row.model}{' '}
                                    <i>
                                        {link ? (
                                            <Link href={`/providers/${link.providerSlug}`}>{row.provider}</Link>
                                        ) : row.provider}
                                    </i>
                                </RailModel>
                                {row.off && <OffTag>off</OffTag>}
                                <RailMean className="rail-mean">
                                    <b>{Math.round(row.mean)}</b> tok/s
                                </RailMean>
                            </li>
                        );
                    })}
                </LabelRail>
                <Plot ref={plotRef}>
                    {width > 0 && (
                        <svg
                            width={width}
                            height={plotHeight + AXIS_HEIGHT}
                            viewBox={`0 0 ${width} ${plotHeight + AXIS_HEIGHT}`}
                            role="img"
                            aria-label={`Throughput distribution for ${rows.length} models, fastest at top, ${Math.round(rows[0].mean)} to ${Math.round(rows[rows.length - 1].mean)} tokens per second`}
                        >
                            <g>
                                {ticks.map((t) => {
                                    const x = (t / xMax) * width;
                                    const anchor = t === 0 ? 'start' : x > width - 12 ? 'end' : 'middle';
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
                    )}
                </Plot>
            </Frame>
            <Note>
                Visible-token throughput, same basis as the table · curves normalised per model
                {off > 0 && ` · ${off} of the ${rows.length} drawn are disabled lanes still inside the window`}
                {beyond > 0 && ` · ${beyond} model${beyond === 1 ? "'s tail runs" : "s' tails run"} past the axis`}
                {hidden > 0 && ` · ${hidden} slower models not drawn, all ${rows.length + hidden} are in the table below`}
            </Note>
        </>
    );
};

export default React.memo(SpeedDistChart);
