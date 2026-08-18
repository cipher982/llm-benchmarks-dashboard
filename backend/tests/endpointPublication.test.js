/**
 * The publication gate is the thing standing between a 3h scheduling cadence
 * and a leaderboard that ranks scheduling phase as speed. These tests pin the
 * cases that would let a number through too early, or order two endpoints the
 * measurement cannot separate.
 */

const {
    dedupeSamples,
    evaluatePublication,
    blockBootstrapInterval,
    rankEndpoints,
    median,
    VISIBLE_TOKEN_MARK,
} = require('../utils/endpointPublication');

const NOW = new Date('2026-08-25T12:00:00Z');

/** `count` samples spread over `days`, stepping through the UTC blocks. */
const spread = (count, days, seconds = 1) => {
    const samples = [];
    for (let i = 0; i < count; i++) {
        const day = i % days;
        const hour = (i * 4) % 24;
        const at = new Date(Date.UTC(2026, 7, 20 + day, hour, (i * 7) % 60));
        samples.push({ seconds, at });
    }
    return samples;
};

describe('dedupeSamples', () => {
    test('collapses a tight loop to one sample per half hour', () => {
        // The real shape: one endpoint measured every ~32 seconds for hours.
        const samples = [];
        for (let i = 0; i < 120; i++) {
            samples.push({ seconds: 1, at: new Date(Date.UTC(2026, 7, 20, 0, 0, i * 32)) });
        }
        // 120 samples * 32s spans ~64 minutes, so at most three buckets.
        expect(dedupeSamples(samples).length).toBeLessThanOrEqual(3);
    });

    test('keeps genuinely separated samples', () => {
        const samples = [
            { seconds: 1, at: new Date('2026-08-20T00:00:00Z') },
            { seconds: 1, at: new Date('2026-08-20T01:00:00Z') },
            { seconds: 1, at: new Date('2026-08-20T02:00:00Z') },
        ];
        expect(dedupeSamples(samples)).toHaveLength(3);
    });
});

describe('evaluatePublication', () => {
    test('a burst of samples in one window is insufficient however large', () => {
        const samples = [];
        for (let i = 0; i < 348; i++) {
            samples.push({ seconds: 1, at: new Date(Date.UTC(2026, 7, 24, 0, 0, i * 32)) });
        }
        const verdict = evaluatePublication(samples, 'seed', NOW);
        expect(verdict.state).toBe('insufficient');
        expect(verdict.deliveredTps).toBeNull();
    });

    test('a day of spread samples is preliminary but carries no interval', () => {
        const verdict = evaluatePublication(spread(10, 2), 'seed', NOW);
        expect(verdict.state).toBe('preliminary');
        expect(verdict.deliveredTps).toBeGreaterThan(0);
        expect(verdict.interval).toBeNull();
    });

    test('a full week of spread samples is official and gets an interval', () => {
        const verdict = evaluatePublication(spread(36, 5, 2), 'seed', NOW);
        expect(verdict.state).toBe('official');
        expect(verdict.interval).not.toBeNull();
        expect(verdict.interval.low).toBeLessThanOrEqual(verdict.deliveredTps);
        expect(verdict.interval.high).toBeGreaterThanOrEqual(verdict.deliveredTps);
    });

    test('samples older than the rolling window are excluded', () => {
        const stale = spread(36, 5).map(s => ({
            ...s,
            at: new Date(s.at.getTime() - 30 * 24 * 3600 * 1000),
        }));
        expect(evaluatePublication(stale, 'seed', NOW).state).toBe('insufficient');
    });

    test('the estimate is 64 / median(T64), not the median of per-run rates', () => {
        // Right-skewed timings: the two statistics genuinely differ. Enough
        // samples and spread to clear the preliminary gate.
        const seconds = [1, 1, 1, 1, 2, 4, 8, 16, 32, 64];
        const samples = spread(seconds.length, 5).map((s, i) => ({ ...s, seconds: seconds[i] }));
        const verdict = evaluatePublication(samples, 'seed', NOW);
        const medianOfRates = median(seconds.map(s => VISIBLE_TOKEN_MARK / s));
        expect(verdict.deliveredTps).toBeCloseTo(VISIBLE_TOKEN_MARK / median(seconds), 6);
        expect(verdict.deliveredTps).not.toBeCloseTo(medianOfRates, 6);
    });
});

describe('blockBootstrapInterval', () => {
    test('is deterministic for one seed, so a refresh does not reshuffle it', () => {
        const samples = spread(40, 5, 2).map((s, i) => ({ ...s, seconds: 1 + (i % 5) * 0.3 }));
        const a = blockBootstrapInterval(samples, 'endpoint-a', 500);
        const b = blockBootstrapInterval(samples, 'endpoint-a', 500);
        expect(a).toEqual(b);
        expect(a.low).toBeLessThanOrEqual(a.high);
    });

    test('a single day cannot support an interval', () => {
        const oneDay = spread(30, 1);
        expect(blockBootstrapInterval(oneDay, 'seed', 100)).toBeNull();
    });
});

describe('rankEndpoints', () => {
    const endpoint = (key, tps, low, high, quantization = 'fp8') => ({
        key,
        quantization,
        deliveredTps: tps,
        interval: low == null ? null : { low, high },
    });

    test('separated endpoints get distinct tiers', () => {
        const ranked = rankEndpoints([
            endpoint('fast', 600, 580, 620),
            endpoint('slow', 100, 90, 110),
        ]);
        expect(ranked.find(r => r.key === 'fast').tier).toBe(0);
        expect(ranked.find(r => r.key === 'slow').tier).toBe(1);
        expect(ranked.every(r => !r.orderUnresolved)).toBe(true);
    });

    test('overlapping endpoints share a tier and are marked unresolved', () => {
        const ranked = rankEndpoints([
            endpoint('a', 500, 400, 600),
            endpoint('b', 480, 390, 590),
        ]);
        expect(ranked[0].tier).toBe(ranked[1].tier);
        expect(ranked.every(r => r.orderUnresolved)).toBe(true);
    });

    test('overlap is transitive: a-b and b-c overlap puts all three in one tier', () => {
        const ranked = rankEndpoints([
            endpoint('a', 500, 450, 550),
            endpoint('b', 480, 430, 530),
            endpoint('c', 460, 410, 510),
        ]);
        expect(new Set(ranked.map(r => r.tier)).size).toBe(1);
    });

    test('quantization classes are ranked separately', () => {
        const ranked = rankEndpoints([
            endpoint('fp4-fast', 900, 880, 920, 'fp4'),
            endpoint('bf16-slow', 100, 90, 110, 'bf16'),
        ]);
        // Each is alone in its class, so each is tier 0 of its own ranking.
        expect(ranked.every(r => r.tier === 0)).toBe(true);
    });

    test('unknown quantization is never ranked', () => {
        const ranked = rankEndpoints([
            endpoint('mystery', 700, 690, 710, 'unknown'),
            endpoint('known', 100, 90, 110, 'fp8'),
        ]);
        expect(ranked.map(r => r.key)).toEqual(['known']);
    });

    test('an endpoint with no interval cannot be separated from anything', () => {
        const ranked = rankEndpoints([
            endpoint('fast', 600, null, null),
            endpoint('slow', 100, 90, 110),
        ]);
        expect(new Set(ranked.map(r => r.tier)).size).toBe(1);
    });
});
