/**
 * Delivered TPS leaderboard — the single-metric ranked list.
 *
 * Delivered TPS (docs/specs/delivered-tps-vision.md) is 64 visible answer
 * tokens / time to the 64th visible token. Reasoning tokens count as time,
 * never output, so one scalar ranks chat and reasoning models together.
 *
 * This is the keystone headline. It is deliberately quiet: rank, name, muted
 * provenance, one strong numeric column, one accent color for speed, thin
 * proportional bars.
 *
 * What it will NOT do is order two endpoints the measurement cannot separate.
 * Ranks are tiers computed from interval overlap on the server; endpoints
 * sharing a tier share a rank and are listed alphabetically, labelled "order
 * unresolved" rather than "equal" — the claim is that this measurement cannot
 * tell them apart, not that they run at the same speed. Sorting this list by
 * value in the renderer would quietly undo that.
 *
 * Endpoints that have not earned publication are never silently omitted: an
 * empty board says why it is empty, because a blank panel reads as breakage.
 */

import React, { useMemo } from 'react';
import { styled } from '@mui/material/styles';
import { colors, typography, spacing } from '../design-system';
import { fmt } from '../../utils/chartMath';

export interface DeliveredTpsLeaderboardRow {
    provider: string;         // display label for whoever served the request
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
    publicationState?: 'insufficient' | 'preliminary' | 'official';
    interval?: { low: number; high: number } | null;
    /** Shared by every endpoint whose interval could not be separated. */
    tier?: number | null;
    orderUnresolved?: boolean;
    quantization?: string;
    qualifyingSamples?: number;
}

interface Counts {
    official: number;
    preliminary: number;
    insufficient: number;
}

interface DeliveredTpsLeaderboardProps {
    rows: DeliveredTpsLeaderboardRow[];
    counts?: Counts;
}

const List = styled('ol')({
    listStyle: 'none',
    margin: 0,
    padding: 0,
    fontFamily: typography.monoFamily,
});

const Row = styled('li')({
    display: 'grid',
    gridTemplateColumns: '2.5rem minmax(0, 1fr) 7.5rem',
    alignItems: 'center',
    gap: spacing.scale[2],
    paddingTop: spacing.scale[1],
    paddingBottom: spacing.scale[1],
    borderBottom: `1px solid ${colors.ruleSoft}`,
});

const Rank = styled('span')({
    color: colors.textMute,
    textAlign: 'right',
    fontSize: typography.sizes.sm,
});

const Identity = styled('span')({
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
});

const Name = styled('span')({
    color: colors.text,
    fontSize: typography.sizes.md,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
});

const Provenance = styled('span')({
    color: colors.textMute,
    fontSize: typography.sizes.sm,
});

const Value = styled('span')<{ $fraction: number }>(({ $fraction }) => ({
    position: 'relative',
    textAlign: 'right',
    fontSize: typography.sizes.lg,
    fontVariantNumeric: 'tabular-nums',
    color: colors.accent,
    paddingRight: spacing.scale[1],
    // Thin proportional bar behind the number, scaled to the fastest row.
    '&::before': {
        content: '""',
        position: 'absolute',
        top: '50%',
        right: 0,
        transform: 'translateY(-50%)',
        height: '1px',
        width: `${Math.max(0, Math.min(1, $fraction)) * 100}%`,
        background: colors.accent,
        opacity: 0.35,
    },
}));

// A leaderboard is a ranking, not a catalogue. Uncapped this rendered all 236
// measured models and pushed every other section of the page below the fold.
const TOP_N = 15;

const Note = styled('p')({
    color: colors.textMute,
    fontSize: typography.sizes.sm,
    fontFamily: typography.monoFamily,
    margin: 0,
    paddingTop: spacing.scale[1],
    paddingBottom: spacing.scale[1],
    lineHeight: 1.5,
});

const Interval = styled('span')({
    color: colors.textMute,
    fontSize: typography.sizes.sm,
    fontVariantNumeric: 'tabular-nums',
});

const DeliveredTpsLeaderboard: React.FC<DeliveredTpsLeaderboardProps> = ({ rows, counts }) => {
    const ranked = useMemo(() => {
        // Only tiered rows are rankable, and the server assigned the tiers.
        // Order by tier, then alphabetically inside it -- never by value,
        // which would reimpose an ordering the intervals do not support.
        const rankable = rows
            .filter(r => typeof r.tier === 'number' && typeof r.deliveredTps === 'number')
            .sort(
                (a, b) =>
                    (a.tier as number) - (b.tier as number) ||
                    a.displayName.localeCompare(b.displayName)
            )
            .slice(0, TOP_N);
        const max = rankable.reduce((best, r) => Math.max(best, r.deliveredTps as number), 0);
        return rankable.map(row => ({
            row,
            // Competition rank: every endpoint in a tier shows the same number.
            rank: (row.tier as number) + 1,
            fraction: max > 0 ? (row.deliveredTps as number) / max : 0,
        }));
    }, [rows]);

    if (ranked.length === 0) {
        // Deliberately not null. A blank panel reads as a broken deploy; the
        // real state is that measurement is under way and no endpoint has
        // earned a published number yet.
        const preliminary = counts?.preliminary ?? 0;
        const measuring = (counts?.insufficient ?? 0) + preliminary;
        return (
            <Note>
                No endpoint has enough evidence to rank yet.{' '}
                {measuring > 0
                    ? `${measuring} being measured; a number needs samples spread across at least 5 days and all six 4-hour UTC blocks before it is ranked.`
                    : 'Measurement is starting up.'}
            </Note>
        );
    }

    return (
        <List>
            {ranked.map(({ row, rank, fraction }) => (
                <Row key={`${row.providerCanonical}/${row.modelCanonical}/${row.transportProvider}`}>
                    <Rank>{rank}</Rank>
                    <Identity>
                        <Name title={row.displayName}>{row.displayName}</Name>
                        <Provenance>
                            {row.provider}
                            {row.quantization && row.quantization !== 'unknown' ? ` · ${row.quantization}` : ''}
                            {row.orderUnresolved ? ' · order unresolved' : ''}
                        </Provenance>
                    </Identity>
                    <Value $fraction={fraction}>
                        {fmt.dec(row.deliveredTps, 1)}{' '}
                        <span style={{ fontSize: typography.sizes.sm, color: colors.textMute }}>tok/s</span>
                        {row.interval && (
                            <>
                                <br />
                                <Interval>
                                    {fmt.dec(row.interval.low, 0)}–{fmt.dec(row.interval.high, 0)}
                                </Interval>
                            </>
                        )}
                    </Value>
                </Row>
            ))}
        </List>
    );
};

export default React.memo(DeliveredTpsLeaderboard);
