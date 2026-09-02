/**
 * Delivered TPS — the single-metric ranked list.
 *
 * Delivered TPS (docs/specs/delivered-tps-vision.md) is 64 visible answer
 * tokens / time to the 64th visible token. Reasoning tokens count as time,
 * never output, so one scalar ranks chat and reasoning models together.
 *
 * Quiet by design: rank, name, muted provenance, one strong numeric column,
 * thin proportional bars. It will not order two endpoints the measurement
 * cannot separate: ranks are tiers computed from interval overlap on the
 * server; endpoints sharing a tier share a rank and are listed alphabetically,
 * labelled "order unresolved". Sorting by value here would undo that.
 *
 * Three states, all shown rather than hidden:
 *   official     — ranked, with the 95% interval
 *   preliminary  — figure only, alphabetical, explicitly unranked
 *   nothing yet  — one line saying how far measurement has got and what the
 *                  gate is. A blank panel reads as breakage; this is the
 *                  expected state for days after the sampling policy changes.
 */

import React, { useMemo } from 'react';
import { styled } from '@mui/material/styles';
import Link from 'next/link';
import { colors, typography, spacing, breakpoints } from '../design-system';
import { fmt } from '../../utils/chartMath';

export interface DeliveredTpsLeaderboardRow {
    provider: string;
    providerCanonical: string;
    providerSlug: string;
    model: string;
    modelCanonical: string;
    modelSlug: string;
    displayName: string;
    transportProvider: string;
    deliveredTps: number | null;
    sampleCount: number;
    legacyTps: number | null;
    publicationState?: 'unpinned' | 'insufficient' | 'preliminary' | 'official';
    interval?: { low: number; high: number } | null;
    /** Shared by every endpoint whose interval could not be separated. */
    tier?: number | null;
    orderUnresolved?: boolean;
    quantization?: string;
    endpointTag?: string | null;
    qualifyingSamples?: number;
}

export interface DeliveredTpsCounts {
    official: number;
    preliminary: number;
    insufficient: number;
}

interface DeliveredTpsLeaderboardProps {
    rows: DeliveredTpsLeaderboardRow[];
    counts?: DeliveredTpsCounts;
}

const List = styled('ol')({
    listStyle: 'none',
    margin: 0,
    padding: `0 ${spacing.scale[4]}px`,
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    columnGap: `${spacing.scale[6]}px`,
    fontFamily: typography.monoFamily,

    [`@media (max-width: ${breakpoints.lg}px)`]: {
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    },
    [`@media (max-width: ${breakpoints.sm}px)`]: {
        gridTemplateColumns: 'minmax(0, 1fr)',
    },
});

const Row = styled('li')({
    display: 'grid',
    gridTemplateColumns: '2rem minmax(0, 1fr) auto',
    alignItems: 'center',
    gap: `${spacing.scale[2]}px`,
    padding: `${spacing.scale[2]}px 0`,
    borderBottom: `1px solid ${colors.ruleSoft}`,
});

const Rank = styled('span')({
    color: colors.textMute,
    textAlign: 'right',
    fontSize: typography.sizes.sm,
    fontVariantNumeric: 'tabular-nums',
});

const Identity = styled('span')({
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
});

const Name = styled('span')({
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.md,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',

    '& a': {
        color: 'inherit',
        textDecoration: 'none',
        borderBottom: `1px solid ${colors.rule}`,
    },
    '& a:hover': { borderBottomColor: colors.accent },
});

const Provenance = styled('span')({
    color: colors.textMute,
    fontSize: typography.sizes.micro,
    letterSpacing: typography.tracking.tag,
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
});

const Value = styled('span')<{ $fraction: number }>(({ $fraction }) => ({
    position: 'relative',
    textAlign: 'right',
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.medium,
    letterSpacing: typography.tracking.figure,
    fontVariantNumeric: 'tabular-nums',
    color: colors.text,
    paddingBottom: '4px',

    '& i': {
        fontStyle: 'normal',
        fontSize: typography.sizes.micro,
        color: colors.textMute,
        marginLeft: '3px',
    },
    // Thin proportional bar under the number, scaled to the fastest row.
    '&::after': {
        content: '""',
        position: 'absolute',
        right: 0,
        bottom: 0,
        height: '2px',
        width: `${Math.max(0, Math.min(1, $fraction)) * 100}%`,
        background: colors.accent,
        opacity: 0.5,
    },
}));

const Interval = styled('span')({
    display: 'block',
    color: colors.textMute,
    fontSize: typography.sizes.micro,
    fontWeight: typography.weights.normal,
    letterSpacing: 0,
    fontVariantNumeric: 'tabular-nums',
});

const Note = styled('p')({
    margin: 0,
    padding: `${spacing.scale[2]}px ${spacing.scale[4]}px ${spacing.scale[3]}px`,
    fontFamily: typography.monoFamily,
    fontSize: typography.sizes.micro,
    letterSpacing: typography.tracking.tag,
    textTransform: 'uppercase',
    color: colors.textMute,
    lineHeight: 1.7,

    '& b': { color: colors.textDim, fontWeight: typography.weights.medium },
});

// A leaderboard is a ranking, not a catalogue. Uncapped this rendered every
// measured endpoint and pushed the rest of the page below the fold.
const TOP_N = 24;

const provenanceOf = (row: DeliveredTpsLeaderboardRow): string => {
    const parts = [row.provider];
    if (row.quantization && row.quantization !== 'unknown') parts.push(row.quantization);
    if (row.transportProvider === 'openrouter') parts.push('via openrouter');
    return parts.join(' · ');
};

const DeliveredTpsLeaderboard: React.FC<DeliveredTpsLeaderboardProps> = ({ rows, counts }) => {
    const { ranked, preliminary } = useMemo(() => {
        // Only tiered rows are rankable, and the server assigned the tiers.
        // Order by tier, then alphabetically inside it — never by value.
        const rankable = rows
            .filter((r) => typeof r.tier === 'number' && typeof r.deliveredTps === 'number')
            .sort((a, b) => (a.tier as number) - (b.tier as number) || a.displayName.localeCompare(b.displayName))
            .slice(0, TOP_N);
        const max = rankable.reduce((best, r) => Math.max(best, r.deliveredTps as number), 0);

        // Preliminary rows carry a figure and no rank. Alphabetical, so the
        // list cannot be read as an ordering the gate has not yet earned.
        const prelim = rows
            .filter((r) => r.publicationState === 'preliminary' && typeof r.deliveredTps === 'number')
            .sort((a, b) => a.displayName.localeCompare(b.displayName))
            .slice(0, TOP_N);
        const prelimMax = prelim.reduce((best, r) => Math.max(best, r.deliveredTps as number), 0);

        return {
            ranked: rankable.map((row) => ({
                row,
                rank: (row.tier as number) + 1,
                fraction: max > 0 ? (row.deliveredTps as number) / max : 0,
            })),
            preliminary: prelim.map((row) => ({
                row,
                fraction: prelimMax > 0 ? (row.deliveredTps as number) / prelimMax : 0,
            })),
        };
    }, [rows]);

    const measuring = (counts?.insufficient ?? 0) + (counts?.preliminary ?? 0) + (counts?.official ?? 0);

    if (!ranked.length && !preliminary.length) {
        return (
            <Note>
                No endpoint has reached the preliminary gate yet · <b>{measuring.toLocaleString()}</b> endpoints being
                measured · a figure needs 8 samples spread over 24h, 2 UTC dates and 4 of 6 time-of-day blocks; a rank
                needs 30 over 4 days and all 6 blocks
            </Note>
        );
    }

    const entries = ranked.length ? ranked : preliminary.map((p) => ({ ...p, rank: null as number | null }));

    return (
        <>
            <List>
                {entries.map(({ row, rank, fraction }) => (
                    <Row key={`${row.providerCanonical}/${row.modelCanonical}/${row.transportProvider}/${row.endpointTag ?? ''}`}>
                        <Rank>{rank == null ? '·' : rank}</Rank>
                        <Identity>
                            <Name title={row.displayName}>
                                {row.providerSlug && row.modelSlug ? (
                                    <Link href={`/models/${row.providerSlug}/${row.modelSlug}`}>{row.displayName}</Link>
                                ) : row.displayName}
                            </Name>
                            <Provenance>
                                {provenanceOf(row)}
                                {row.orderUnresolved ? ' · order unresolved' : ''}
                                {rank == null ? ' · preliminary' : ''}
                            </Provenance>
                        </Identity>
                        <Value $fraction={fraction}>
                            {fmt.dec(row.deliveredTps, 1)}<i>tok/s</i>
                            {row.interval && (
                                <Interval>
                                    {fmt.dec(row.interval.low, 0)}–{fmt.dec(row.interval.high, 0)}
                                </Interval>
                            )}
                        </Value>
                    </Row>
                ))}
            </List>
            <Note>
                {ranked.length
                    ? `${ranked.length} ranked of ${counts?.official ?? ranked.length} official endpoints · ranks are tiers from 95% intervals; endpoints one tier cannot separate share a rank`
                    : `${preliminary.length} preliminary figures, unranked · an official rank needs 30 samples over 4 days across all 6 time-of-day blocks`}
                {counts?.insufficient ? ` · ${counts.insufficient.toLocaleString()} more endpoints still below the gate` : ''}
            </Note>
        </>
    );
};

export default React.memo(DeliveredTpsLeaderboard);
