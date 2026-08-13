/**
 * Delivered TPS leaderboard — the single-metric ranked list.
 *
 * Delivered TPS (docs/specs/delivered-tps-vision.md) is 64 visible answer
 * tokens / time to the 64th visible token. Reasoning tokens count as time,
 * never output, so one scalar ranks chat and reasoning models together.
 *
 * This is the keystone headline behind a reversible flag. It is deliberately
 * quiet: rank, name, muted provenance, one strong numeric column, one accent
 * color for speed, thin proportional bars. No badges, no visible/total split,
 * no confidence interval — a ranked list, not an observability dashboard.
 */

import React, { useMemo } from 'react';
import { styled } from '@mui/material/styles';
import { colors, typography, spacing } from '../design-system';
import { fmt } from '../../utils/chartMath';

export interface DeliveredTpsLeaderboardRow {
    provider: string;         // display label, includes "via OpenRouter" for routed lanes
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
}

interface DeliveredTpsLeaderboardProps {
    rows: DeliveredTpsLeaderboardRow[];
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

const DeliveredTpsLeaderboard: React.FC<DeliveredTpsLeaderboardProps> = ({ rows }) => {
    const ranked = useMemo(() => {
        const withValue = rows
            .filter(r => typeof r.deliveredTps === 'number' && r.deliveredTps > 0)
            .sort((a, b) => (b.deliveredTps as number) - (a.deliveredTps as number));
        const max = withValue.length > 0 ? (withValue[0].deliveredTps as number) : 0;
        return withValue.map((row, i) => ({
            row,
            rank: i + 1,
            fraction: max > 0 ? (row.deliveredTps as number) / max : 0,
        }));
    }, [rows]);

    if (ranked.length === 0) {
        return null;
    }

    return (
        <List>
            {ranked.map(({ row, rank, fraction }) => (
                <Row key={`${row.providerCanonical}/${row.modelCanonical}/${row.transportProvider}`}>
                    <Rank>{rank}</Rank>
                    <Identity>
                        <Name title={row.displayName}>{row.displayName}</Name>
                        <Provenance>{row.provider}</Provenance>
                    </Identity>
                    <Value $fraction={fraction}>
                        {fmt.dec(row.deliveredTps, 1)}{' '}
                        <span style={{ fontSize: typography.sizes.sm, color: colors.textMute }}>tok/s</span>
                    </Value>
                </Row>
            ))}
        </List>
    );
};

export default React.memo(DeliveredTpsLeaderboard);
