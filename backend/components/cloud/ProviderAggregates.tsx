/**
 * Per-provider aggregates over the selected window.
 *
 * This panel replaced a leaders list that reprinted peak throughput, best TTFT
 * and tightest spread — all three of which the meter strip directly above it
 * already carried. Rolling the same rows up by provider is a different cut of
 * the window rather than a restatement of it, and it answers a question the
 * per-model table cannot: whether a provider is fast in general or fast once.
 */

import React, { useMemo } from 'react';
import { styled } from '@mui/material/styles';
import Link from 'next/link';
import { TableRow } from '../../types/ProcessedData';
import { colors, typography, spacing } from '../design-system';
import { percentile, spreadPercent, fmt } from '../../utils/chartMath';

interface ProviderAggregatesProps {
    rows: TableRow[];
}

const Table = styled('table')({
    width: '100%',
    borderCollapse: 'collapse',
    fontFamily: typography.monoFamily,

    '& thead th': {
        textAlign: 'right',
        fontSize: typography.sizes.micro,
        fontWeight: typography.weights.medium,
        letterSpacing: typography.tracking.label,
        textTransform: 'uppercase',
        color: colors.textMute,
        padding: `${spacing.scale[2]}px ${spacing.scale[3]}px`,
        backgroundColor: colors.surface,
        borderBottom: `1px solid ${colors.rule}`,
        whiteSpace: 'nowrap',
    },
    '& thead th.l': { textAlign: 'left' },

    '& tbody td': {
        padding: `${spacing.scale[2]}px ${spacing.scale[3]}px`,
        borderBottom: `1px solid ${colors.ruleSoft}`,
        textAlign: 'right',
        fontSize: typography.sizes.sm,
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
        color: colors.text,
    },
    '& tbody tr:nth-of-type(even) td': { backgroundColor: colors.zebra },
    '& tbody tr:hover td': { backgroundColor: colors.raised },
    '& tbody td.dim': { color: colors.textMute },
    // The label column reads left; every measured column reads right so the
    // digits line up down the table.
    '& tbody td:first-of-type': { textAlign: 'left' },
});

const ProviderCell = styled('td')({
    '& a': {
        color: colors.textDim,
        textDecoration: 'none',
        fontSize: typography.sizes.micro,
        letterSpacing: typography.tracking.tag,
        textTransform: 'uppercase',
        borderBottom: `1px solid ${colors.rule}`,
    },
    '& a:hover': { color: colors.text },
});

/**
 * Median throughput with a bar behind it, scaled to the largest value in the
 * table. The bar encodes magnitude for scanning; it is not a rank, and the
 * rows are not in speed order -- see the sort comment below.
 */
const MedianCell = styled('td')<{ $fraction: number }>(({ $fraction }) => ({
    position: 'relative',

    '&::after': {
        content: '""',
        position: 'absolute',
        left: `${spacing.scale[3]}px`,
        bottom: '3px',
        height: '2px',
        width: `calc((100% - ${spacing.scale[3] * 2}px) * ${$fraction})`,
        background: colors.accent,
        opacity: 0.5,
    },
}));

interface Aggregate {
    name: string;
    slug?: string;
    models: number;
    median: number;
    p90: number;
    best: number;
    spread: number;
    ttft: number | null;
}

const ProviderAggregates: React.FC<ProviderAggregatesProps> = ({ rows }) => {
    const aggregates = useMemo<Aggregate[]>(() => {
        const usable = rows.filter((r) => r.tokens_per_second_mean > 0);
        const byProvider = new Map<string, TableRow[]>();

        for (const row of usable) {
            const key = row.provider || row.providerCanonical;
            const bucket = byProvider.get(key);
            if (bucket) bucket.push(row);
            else byProvider.set(key, [row]);
        }

        return [...byProvider.entries()]
            .map(([name, group]) => {
                const means = group.map((r) => r.tokens_per_second_mean);
                const spreads = group
                    .map((r) => spreadPercent(r.tokens_per_second_min, r.tokens_per_second_mean, r.tokens_per_second_max))
                    .filter((v): v is number => v != null);
                const ttfts = group.map((r) => r.time_to_first_token_mean).filter((v) => v > 0);

                return {
                    name,
                    slug: group[0].providerSlug,
                    models: group.length,
                    median: percentile(means, 50),
                    p90: percentile(means, 90),
                    best: Math.max(...means),
                    spread: percentile(spreads, 50),
                    ttft: ttfts.length ? percentile(ttfts, 50) : null,
                };
            })
            // Alphabetical, deliberately. Ordering this table by median put
            // providers in speed order on a series timed from batched SSE
            // deltas, which cannot support the comparison for ~91% of the
            // fleet. Speed ranking belongs to Delivered TPS alone; this table
            // reports each provider's own history without ordering them
            // against each other.
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [rows]);

    if (!aggregates.length) return null;

    const medianMax = Math.max(...aggregates.map((a) => a.median), 1);

    return (
        <Table>
            <thead>
                <tr>
                    <th className="l">Provider</th>
                    <th>Models</th>
                    <th>Median</th>
                    <th>p90</th>
                    <th>Best</th>
                    <th>Spread</th>
                    <th>TTFT</th>
                </tr>
            </thead>
            <tbody>
                {aggregates.map((provider) => (
                    <tr key={provider.name}>
                        <ProviderCell>
                            {provider.slug ? (
                                <Link href={`/providers/${provider.slug}`}>{provider.name}</Link>
                            ) : (
                                provider.name
                            )}
                        </ProviderCell>
                        <td className="dim">{provider.models}</td>
                        <MedianCell $fraction={provider.median / medianMax}>
                            {fmt.int(provider.median)}
                        </MedianCell>
                        <td>{fmt.int(provider.p90)}</td>
                        <td>{fmt.int(provider.best)}</td>
                        <td className="dim">{fmt.pct(provider.spread)}</td>
                        <td className="dim">{provider.ttft == null ? '—' : fmt.dec(provider.ttft, 2)}</td>
                    </tr>
                ))}
            </tbody>
        </Table>
    );
};

export default React.memo(ProviderAggregates);
