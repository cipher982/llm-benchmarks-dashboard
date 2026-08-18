/**
 * The legacy series is retained, labelled, and must never order anything.
 *
 * `tokens_per_second` is timed from batched SSE deltas -- 4440 batched against
 * 413 resolved on pinned rows -- so it cannot support the claim "A is faster
 * than B" for most of the fleet. It stays visible because it is the real
 * published history, but every ranking surface belongs to Delivered TPS.
 */

const fs = require('fs');
const path = require('path');

const {
    LEGACY_METRIC_VERSION,
    LEGACY_RANK_ELIGIBLE,
    legacyMetricMeta,
} = require('../utils/legacyMetric');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

describe('legacy metric metadata', () => {
    test('is versioned for audit and never rank eligible', () => {
        expect(LEGACY_METRIC_VERSION).toBe('legacy_sse_window');
        expect(LEGACY_RANK_ELIGIBLE).toBe(false);
        expect(legacyMetricMeta()).toEqual({
            metricVersion: 'legacy_sse_window',
            rankEligible: false,
        });
    });
});

describe('no surface orders providers by the legacy series', () => {
    test('ProviderAggregates sorts by name, not by throughput', () => {
        const source = read('components/cloud/ProviderAggregates.tsx');
        // The exact regression: `.sort((a, b) => b.median - a.median)` put
        // providers in speed order on a non-comparable metric.
        expect(source).not.toMatch(/\.sort\(\s*\(a,\s*b\)\s*=>\s*b\.median\s*-\s*a\.median\s*\)/);
        expect(source).toMatch(/a\.name\.localeCompare\(b\.name\)/);
    });

    test('the leaderboard orders by server-assigned tier, never by value', () => {
        const source = read('components/cloud/DeliveredTpsLeaderboard.tsx');
        // Sorting by deliveredTps would reimpose an ordering between endpoints
        // whose intervals overlap.
        expect(source).not.toMatch(/b\.deliveredTps as number\)\s*-\s*\(a\.deliveredTps as number\)/);
        expect(source).toMatch(/a\.tier as number\)\s*-\s*\(b\.tier as number/s);
    });
});

describe('legacy sections are disclosed where they are still shown', () => {
    test('cloud page labels the legacy charts', () => {
        const source = read('pages/cloud.tsx');
        expect(source).toMatch(/LEGACY_LABEL/);
        expect(source).toMatch(/LEGACY_DISCLOSURE/);
        // Distribution, provider table, full results and time series.
        const occurrences = source.match(/LEGACY_DISCLOSURE/g) || [];
        expect(occurrences.length).toBeGreaterThanOrEqual(4);
    });

    test('the headline names the metric and its workload', () => {
        expect(read('pages/cloud.tsx')).toMatch(/Delivered TPS · 64-token, end-to-end/);
    });
});

describe('availability is kept separate from speed', () => {
    test('the availability endpoint does not serve OpenRouter throughput', () => {
        const source = read('pages/api/endpoint-availability.ts');
        // uptime and status are fine; percentiles are not, because mixing an
        // uncontrolled-traffic aggregate with a controlled measurement gives a
        // number that means neither.
        expect(source).toMatch(/or_uptime_1d/);
        expect(source).not.toMatch(/or_throughput_p50['"]?\s*[:,]/);
    });

    test('an endpoint nobody called has no success rate', () => {
        // Reporting 1.0 for zero attempts would read as health.
        expect(read('pages/api/endpoint-availability.ts')).toMatch(
            /attempts > 0 \? successes \/ attempts : null/
        );
    });
});
