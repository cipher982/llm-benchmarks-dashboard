/**
 * The row of global aggregates that opens the page.
 *
 * Eight cells, each a distinct statistic. A value that appears here appears
 * nowhere else on the page — the first Console draft printed peak throughput,
 * best TTFT and tightest spread here and then again in a leaders panel
 * immediately below, which is the specific failure the raw-data constraint was
 * written to prevent.
 */

import React, { useMemo } from 'react';
import { TableRow } from '../../types/ProcessedData';
import { MeterStrip } from '../design-system/components';
import { percentile, spreadPercent, fmt } from '../../utils/chartMath';

interface GlobalMetersProps {
    rows: TableRow[];
}

const GlobalMeters: React.FC<GlobalMetersProps> = ({ rows }) => {
    const stats = useMemo(() => {
        const usable = rows.filter((r) => r.tokens_per_second_mean > 0);
        const means = usable.map((r) => r.tokens_per_second_mean);
        const spreads = usable
            .map((r) => spreadPercent(r.tokens_per_second_min, r.tokens_per_second_mean, r.tokens_per_second_max))
            .filter((v): v is number => v != null);
        const ttfts = usable.map((r) => r.time_to_first_token_mean).filter((v) => v > 0);

        return {
            models: usable.length,
            providers: new Set(usable.map((r) => r.providerCanonical || r.provider)).size,
            // Rows written before `samples` existed do not carry it. Summing
            // them to zero would print a confident, wrong total, so a window
            // where nothing reports a count reads as unknown instead.
            samples: usable.some((r) => r.samples != null)
                ? usable.reduce((total, r) => total + (r.samples ?? 0), 0)
                : null,
            median: percentile(means, 50),
            p90: percentile(means, 90),
            max: means.length ? Math.max(...means) : 0,
            medianSpread: percentile(spreads, 50),
            medianTtft: ttfts.length ? percentile(ttfts, 50) : null,
        };
    }, [rows]);

    return (
        <MeterStrip columns={8}>
            <div>
                <dt>Models</dt>
                <dd>{fmt.int(stats.models)}</dd>
            </div>
            <div>
                <dt>Providers</dt>
                <dd>{fmt.int(stats.providers)}</dd>
            </div>
            <div>
                <dt>Samples</dt>
                <dd>{stats.samples == null ? '—' : fmt.int(stats.samples)}</dd>
            </div>
            <div>
                <dt>Median tok/s</dt>
                <dd>{fmt.int(stats.median)}</dd>
            </div>
            <div>
                <dt>p90 tok/s</dt>
                <dd>{fmt.int(stats.p90)}</dd>
            </div>
            <div>
                <dt>Max tok/s</dt>
                <dd>{fmt.int(stats.max)}</dd>
            </div>
            <div>
                <dt>Median spread</dt>
                <dd>{fmt.pct(stats.medianSpread)}</dd>
            </div>
            <div>
                <dt>Median TTFT</dt>
                <dd>
                    {stats.medianTtft == null ? '—' : fmt.dec(stats.medianTtft, 2)}
                    <small>s</small>
                </dd>
            </div>
        </MeterStrip>
    );
};

export default React.memo(GlobalMeters);
