/**
 * Throughput over time, as small multiples.
 *
 * Replaces 22 stacked full-width Recharts line charts — the single biggest
 * contributor to a 22,000px page — with a grid of one cell per model on a
 * shared y-scale. A shared scale is the point: 22 charts each autoscaled to
 * their own range look identical to each other and support no comparison at
 * all, which is what the old layout produced.
 *
 * Cells are drawn as plain SVG rather than through a chart library. At 190×46
 * there is no axis, no legend and no tooltip layer to render, and Recharts'
 * ResponsiveContainer costs a layout pass per cell.
 *
 * The provider-visibility helpers below are unchanged and still exported —
 * `tests/timeSeriesChart.test.js` guards them, and `MIN_POINTS_TO_DRAW` is the
 * absolute count that replaced a coverage ratio which silently hid providers
 * that had only recently started being measured.
 */

import React, { useCallback, memo, useMemo, useState } from 'react';
import { styled } from '@mui/material/styles';
import Link from 'next/link';
import { colors, typography, spacing, breakpoints } from '../../design-system';
import { TimeSeriesData, TimeSeriesModel, TimeSeriesProvider } from '../../../types/ProcessedData';
import { TimeRangeSelector } from '../../TimeRangeSelector';
import { toPath, mean as meanOf, percentile, slugKey, type SlugLookup } from '../../../utils/chartMath';

interface TimeSeriesChartProps {
    onTimeRangeChange?: (days: number) => Promise<void>;
    data: TimeSeriesData;
    selectedDays: number;
    /** Cells drawn. The remainder is reported rather than silently dropped. */
    maxCells?: number;
    /** Rendered above the grid when the page owns its own rail control. */
    showTimeRangeSelector?: boolean;
    /** Slugs from the table, so a cell's model and provider are navigable. */
    slugs?: SlugLookup;
}

// Two points is a line segment; one is a dot. Deliberately an absolute count,
// not a share of the window.
//
// This was `coverage >= 10%`, which hid any provider that had not been measured
// for most of the selected range — so a provider whose measurements started
// recently was invisible for two weeks no matter how well it was being measured
// today. On 2026-08-05 llama-3.3-70b was being measured at four providers and
// the chart drew two: Together at 8.3% and DeepInfra at 7.6% were both dropped,
// having produced ~40 samples each over the two days since a scheduler fix
// started including them. The site said the model had two providers when it had
// four.
//
// A ratio over a fixed window is the wrong shape for this question for the same
// reason it is wrong for coverage alarms: it moves when the denominator moves,
// not when the thing being measured changes. Sparse series now render with
// visible breaks, which is honest — a gap in the line is what a gap in the data
// looks like.
const MIN_POINTS_TO_DRAW = 2;
const MAX_FILL_GAP = 2; // Fill gaps of 1-2 nulls, keep gaps of 3+ as breaks (real outages)

const CELL_WIDTH = 190;
const CELL_HEIGHT = 46;

/**
 * Fill small gaps in time series data to avoid splotchy charts from timing misalignment.
 * Gaps of 1-2 consecutive nulls are filled with the last known value.
 * Gaps of 3+ consecutive nulls are preserved (representing real outages).
 */
const fillSmallGaps = (values: (number | null)[]): (number | null)[] => {
    const result = [...values];
    let i = 0;

    while (i < result.length) {
        if (result[i] === null) {
            // Found a null, count consecutive nulls
            let gapStart = i;
            let gapEnd = i;
            while (gapEnd < result.length && result[gapEnd] === null) {
                gapEnd++;
            }
            const gapLength = gapEnd - gapStart;

            // Only fill small gaps (1-2 nulls)
            if (gapLength <= MAX_FILL_GAP) {
                // Find the last known value before the gap
                const lastValue = gapStart > 0 ? result[gapStart - 1] : null;
                if (lastValue !== null) {
                    for (let j = gapStart; j < gapEnd; j++) {
                        result[j] = lastValue;
                    }
                }
            }
            i = gapEnd;
        } else {
            i++;
        }
    }

    return result;
};

export const getProviderPointCount = (provider: TimeSeriesProvider): number =>
    (provider.values || []).filter((value) => value !== null && value !== undefined).length;

/** Share of the window a provider covers. Still reported for ordering and
 * display; no longer decides whether a provider exists. */
export const getProviderCoverage = (provider: TimeSeriesProvider): number => {
    const values = provider.values || [];
    const totalCount = values.length;
    return totalCount > 0 ? (getProviderPointCount(provider) / totalCount) * 100 : 0;
};

export const getVisibleProviders = (model: TimeSeriesModel): TimeSeriesProvider[] =>
    model.providers.filter((provider) => getProviderPointCount(provider) >= MIN_POINTS_TO_DRAW);

export const getFreshnessLineStyle = (provider: TimeSeriesProvider, isOnlyVisibleProvider: boolean) => {
    if (provider.freshness_status === 'critical') {
        return {
            dash: isOnlyVisibleProvider ? undefined : '4 3',
            opacity: isOnlyVisibleProvider ? 1 : 0.9,
            width: isOnlyVisibleProvider ? 3.25 : 2.75
        };
    }
    if (provider.freshness_status === 'stale') {
        return {
            dash: isOnlyVisibleProvider ? undefined : '7 4',
            opacity: isOnlyVisibleProvider ? 1 : 0.95,
            width: isOnlyVisibleProvider ? 3 : 2.5
        };
    }
    return { dash: undefined, opacity: 1, width: 2 };
};

const getProviderFreshnessRank = (provider: TimeSeriesProvider): number => {
    if (provider.freshness_status === 'critical') return 0;
    if (provider.freshness_status === 'stale') return 1;
    return 2;
};

const getProviderLastValueIndex = (provider: TimeSeriesProvider): number => {
    const values = provider.values || [];
    for (let i = values.length - 1; i >= 0; i--) {
        if (values[i] !== null && values[i] !== undefined) {
            return i;
        }
    }
    return -1;
};

export interface ModelVisibility {
    model: TimeSeriesModel;
    visibleProviders: TimeSeriesProvider[];
    visibleCount: number;
    totalProvidersWithValues: number;
    freshnessRank: number;
    latestValueIndex: number;
    coverage: number;
}

export const buildModelVisibility = (model: TimeSeriesModel): ModelVisibility => {
    const visibleProviders = getVisibleProviders(model);
    const totalProvidersWithValues = model.providers.filter(p => p.values && p.values.length > 0).length;
    const freshnessRank = visibleProviders.length
        ? Math.max(...visibleProviders.map(getProviderFreshnessRank))
        : 0;
    const latestValueIndex = visibleProviders.length
        ? Math.max(...visibleProviders.map(getProviderLastValueIndex))
        : -1;
    const coverage = visibleProviders.reduce((sum, provider) => sum + getProviderCoverage(provider), 0);

    return {
        model,
        visibleProviders,
        visibleCount: visibleProviders.length,
        totalProvidersWithValues,
        freshnessRank,
        latestValueIndex,
        coverage,
    };
};

export const sortModelVisibilityRows = (rows: ModelVisibility[]): ModelVisibility[] => {
    return [...rows].sort((a, b) => {
        if (b.visibleCount !== a.visibleCount) {
            return b.visibleCount - a.visibleCount;
        }

        if (b.totalProvidersWithValues !== a.totalProvidersWithValues) {
            return b.totalProvidersWithValues - a.totalProvidersWithValues;
        }

        if (b.freshnessRank !== a.freshnessRank) {
            return b.freshnessRank - a.freshnessRank;
        }

        if (b.latestValueIndex !== a.latestValueIndex) {
            return b.latestValueIndex - a.latestValueIndex;
        }

        if (b.coverage !== a.coverage) {
            return b.coverage - a.coverage;
        }

        const aLabel = a.model.display_name || a.model.model_name;
        const bLabel = b.model.display_name || b.model.model_name;
        return aLabel.localeCompare(bLabel, undefined, { sensitivity: 'base' });
    });
};

// =============================================================================
// RENDERING
// =============================================================================

/**
 * Columns track the number of cells, so a model page rendering one series gets
 * a full-width chart rather than one sixth of a grid with five empty columns
 * beside it.
 */
const Grid = styled('div')<{ $columns: number }>(({ $columns }) => ({
    display: 'grid',
    gridTemplateColumns: `repeat(${$columns}, minmax(0, 1fr))`,
    gap: '1px',
    backgroundColor: colors.rule,
    borderTop: `1px solid ${colors.rule}`,

    [`@media (max-width: ${breakpoints.lg}px)`]: {
        gridTemplateColumns: `repeat(${Math.min($columns, 3)}, minmax(0, 1fr))`,
    },
    [`@media (max-width: ${breakpoints.sm}px)`]: {
        gridTemplateColumns: `repeat(${Math.min($columns, 2)}, minmax(0, 1fr))`,
    },
}));

const Cell = styled('figure')({
    margin: 0,
    minWidth: 0,
    backgroundColor: colors.ground,
    padding: `9px 12px 7px`,

    '& figcaption': {
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) auto',
        gap: '0 6px',
        marginBottom: '6px',
    },
});

const CellModel = styled('span')({
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.text,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',

    '& a': {
        color: 'inherit',
        textDecoration: 'none',
        borderBottom: `1px solid ${colors.rule}`,
    },
    '& a:hover': { borderBottomColor: colors.accent },
});

const CellProvider = styled('span')({
    gridRow: 2,
    fontFamily: typography.monoFamily,
    fontSize: typography.sizes.micro,
    color: colors.textMute,
    textTransform: 'uppercase',
    letterSpacing: typography.tracking.tag,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',

    '& a': {
        color: 'inherit',
        textDecoration: 'none',
        borderBottom: `1px solid ${colors.rule}`,
    },
    '& a:hover': { color: colors.textDim },
});

const CellValue = styled('span')({
    gridRow: '1 / span 2',
    alignSelf: 'center',
    fontFamily: typography.monoFamily,
    fontVariantNumeric: 'tabular-nums',
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    letterSpacing: typography.tracking.figure,
    color: colors.text,

    '& i': {
        fontStyle: 'normal',
        fontSize: typography.sizes.micro,
        color: colors.textMute,
        marginLeft: '2px',
    },
});

const Spark = styled('svg')({
    height: `${CELL_HEIGHT}px`,
    display: 'block',

    '& .sm-area': {
        fill: colors.accent,
        fillOpacity: 0.08,
    },
    '& .sm-line': {
        fill: 'none',
        stroke: colors.accent,
        strokeWidth: 1,
        vectorEffect: 'non-scaling-stroke',
    },
    '& .sm-mean': {
        stroke: colors.rule,
        strokeDasharray: '2 3',
        vectorEffect: 'non-scaling-stroke',
    },
});

const Note = styled('p')({
    margin: 0,
    padding: `${spacing.scale[2]}px ${spacing.scale[4]}px ${spacing.scale[3]}px`,
    fontFamily: typography.monoFamily,
    fontSize: typography.sizes.micro,
    letterSpacing: typography.tracking.tag,
    textTransform: 'uppercase',
    color: colors.textMute,
});

interface CellDatum {
    key: string;
    model: string;
    provider: string;
    values: (number | null)[];
    mean: number;
}

/**
 * One cell. Segments are drawn separately so a gap of three or more missing
 * samples stays a gap — connecting across it would draw a straight line through
 * an outage and call it data.
 */
const SmallMultiple = memo(({ datum, yMax, slugs }: { datum: CellDatum; yMax: number; slugs?: SlugLookup }) => {
    const { segments, meanY } = useMemo(() => {
        const pts: Array<Array<[number, number]>> = [];
        let run: Array<[number, number]> = [];

        datum.values.forEach((v, i) => {
            if (v == null) {
                if (run.length) pts.push(run);
                run = [];
                return;
            }
            const x = (i / Math.max(datum.values.length - 1, 1)) * CELL_WIDTH;
            // Clamped, so a sample above the shared ceiling draws along the top
            // of its cell rather than escaping the viewBox.
            const y = CELL_HEIGHT - Math.min(v / yMax, 1) * CELL_HEIGHT;
            run.push([x, y]);
        });
        if (run.length) pts.push(run);

        return {
            segments: pts.filter((s) => s.length > 1),
            meanY: CELL_HEIGHT - (datum.mean / yMax) * CELL_HEIGHT,
        };
    }, [datum, yMax]);

    const link = slugs?.get(slugKey(datum.provider, datum.model));

    // The area fill only makes sense under a continuous run; with breaks it
    // would imply throughput the collector never observed.
    const areaPath =
        segments.length === 1
            ? `${toPath(segments[0])}L${segments[0][segments[0].length - 1][0].toFixed(1)} ${CELL_HEIGHT}L${segments[0][0][0].toFixed(1)} ${CELL_HEIGHT}Z`
            : null;

    return (
        <Cell>
            <figcaption>
                <CellModel title={datum.model}>
                    {link ? (
                        <Link href={`/models/${link.providerSlug}/${link.modelSlug}`}>{datum.model}</Link>
                    ) : datum.model}
                </CellModel>
                <CellProvider>
                    {link ? (
                        <Link href={`/providers/${link.providerSlug}`}>{datum.provider}</Link>
                    ) : datum.provider}
                </CellProvider>
                <CellValue>
                    {Math.round(datum.mean)}
                    <i>tok/s</i>
                </CellValue>
            </figcaption>
            <Spark
                viewBox={`0 0 ${CELL_WIDTH} ${CELL_HEIGHT}`}
                width="100%"
                preserveAspectRatio="none"
                role="img"
                aria-label={`${datum.model} on ${datum.provider}, mean ${Math.round(datum.mean)} tokens per second over the window`}
            >
                <line className="sm-mean" x1={0} y1={meanY.toFixed(1)} x2={CELL_WIDTH} y2={meanY.toFixed(1)} />
                {areaPath && <path className="sm-area" d={areaPath} />}
                {segments.map((segment, i) => (
                    <path className="sm-line" key={i} d={toPath(segment)} />
                ))}
            </Spark>
        </Cell>
    );
});

SmallMultiple.displayName = 'SmallMultiple';

const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
    data,
    onTimeRangeChange,
    selectedDays,
    maxCells = 12,
    showTimeRangeSelector = false,
    slugs,
}) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleTimeRangeChange = useCallback(async (days: number) => {
        if (onTimeRangeChange) {
            setIsLoading(true);
            try {
                await onTimeRangeChange(days);
            } finally {
                setIsLoading(false);
            }
        }
    }, [onTimeRangeChange]);

    // One cell per model, using whichever provider carries the most samples for
    // it. Drawing every provider of every model is what produced the wall.
    const { cells, hidden } = useMemo(() => {
        const ranked = sortModelVisibilityRows(data.models.map(buildModelVisibility))
            .filter((row) => row.visibleCount > 0);

        const built: CellDatum[] = ranked.map(({ model, visibleProviders }) => {
            const best = [...visibleProviders].sort(
                (a, b) => getProviderPointCount(b) - getProviderPointCount(a),
            )[0];
            const values = fillSmallGaps(best.values || []);
            return {
                key: `${model.model_name}-${best.providerCanonical}`,
                model: model.display_name || model.model_name,
                provider: best.provider,
                values,
                mean: meanOf(values),
            };
        }).filter((c) => c.mean > 0);

        const sorted = built.sort((a, b) => b.mean - a.mean);
        return { cells: sorted.slice(0, maxCells), hidden: Math.max(sorted.length - maxCells, 0) };
    }, [data.models, maxCells]);

    /**
     * A shared ceiling across every cell. This is the whole reason the grid
     * supports comparison and 22 autoscaled charts did not.
     *
     * The ceiling is the 99th percentile rather than the maximum. Throughput
     * spikes: one sample at five times a model's mean would set the scale for
     * every cell and press all twelve series flat against their own baselines,
     * so the shared scale would cost legibility without buying comparison. The
     * few samples above the ceiling are clipped to it, and the note under the
     * grid says so.
     */
    const yMax = useMemo(() => {
        const all = cells.flatMap((c) => c.values).filter((v): v is number => v != null);
        return all.length ? Math.max(percentile(all, 99) * 1.05, 1) : 1;
    }, [cells]);

    const clipped = useMemo(
        () => cells.flatMap((c) => c.values).filter((v): v is number => v != null && v > yMax).length,
        [cells, yMax],
    );

    if (!data.timestamps.length || !cells.length) {
        return <Note>No time series data available.</Note>;
    }

    return (
        <div style={{ opacity: isLoading ? 0.5 : 1 }}>
            {showTimeRangeSelector && (
                <TimeRangeSelector selectedDays={selectedDays} onChange={handleTimeRangeChange} />
            )}
            <Grid $columns={Math.min(cells.length, 6)}>
                {cells.map((datum) => (
                    <SmallMultiple key={datum.key} datum={datum} yMax={yMax} slugs={slugs} />
                ))}
            </Grid>
            <Note>
                Shared vertical scale, 0 to {Math.round(yMax)} tok/s (99th percentile) · dashed rule is the
                model&apos;s own mean
                {clipped > 0 ? ` · ${clipped} samples above the ceiling drawn at it` : ''}
                {hidden > 0 ? ` · ${hidden} slower models not drawn` : ''}
            </Note>
        </div>
    );
};

export default memo(TimeSeriesChart);
