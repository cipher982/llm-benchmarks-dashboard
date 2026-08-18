/**
 * When an endpoint's number is allowed to be published, and when two of them
 * may be ordered against each other.
 *
 * An endpoint is measured on a 3h cadence, so a leaderboard built from whatever
 * has arrived so far ranks scheduling phase as much as speed. Three states
 * separate "we have a number" from "we will stand behind an ordering":
 *
 *   insufficient — fewer than 8 usable samples. Nothing published.
 *   preliminary  — enough to show a figure, not enough to rank. Roughly a day.
 *   official     — rankable. Roughly four days.
 *
 * Two rules do most of the work. Samples are deduplicated to one per 30-minute
 * bucket, so a scheduler that re-runs one endpoint in a tight loop cannot buy
 * itself significance -- which is not hypothetical: a single endpoint reached
 * 348 samples in one three-hour window on the night endpoint scheduling
 * shipped. And the interval is bootstrapped over whole UTC dates rather than
 * individual runs, because runs within a day share load, routing and time of
 * day, and treating them as independent would report a precision the sampling
 * design cannot support.
 */

/** The numerator, matching the runner's VisibleTokenClock. */
export const VISIBLE_TOKEN_MARK = 64;

/** One sample per endpoint per half hour. */
export const DEDUPE_BUCKET_SECONDS = 1800;

/** Six fixed 4-hour UTC blocks, so "spread across the day" is not a rolling guess. */
export const UTC_BLOCK_COUNT = 6;

/** Rolling window. Older runs describe an endpoint that may no longer exist. */
export const WINDOW_DAYS = 7;

export const PRELIMINARY = {
    minSamples: 8,
    minSpanHours: 24,
    minDates: 2,
    minBlocks: 4,
} as const;

export const OFFICIAL = {
    minSamples: 30,
    minSpanHours: 96,
    minDates: 5,
    minBlocks: UTC_BLOCK_COUNT,
} as const;

export const BOOTSTRAP_REPLICATES = 10_000;

export type PublicationState = 'insufficient' | 'preliminary' | 'official';

export interface T64Sample {
    /** Seconds from request start to the 64th visible answer token. */
    seconds: number;
    at: Date;
}

export interface PublicationVerdict {
    state: PublicationState;
    /** 64 / median(T64). Null when insufficient. */
    deliveredTps: number | null;
    /** 95% block-bootstrap interval. Official rows only. */
    interval: { low: number; high: number } | null;
    sampleCount: number;
    distinctDates: number;
    distinctBlocks: number;
    spanHours: number;
}

const utcDateKey = (at: Date): string => at.toISOString().slice(0, 10);

const utcBlock = (at: Date): number => Math.floor(at.getUTCHours() / (24 / UTC_BLOCK_COUNT));

export const median = (values: number[]): number => {
    if (values.length === 0) return NaN;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
};

/**
 * One sample per 30-minute bucket, keeping the earliest in each.
 *
 * Without this a tight scheduling loop inflates n without adding information:
 * thirty runs of one endpoint inside an hour are close to one observation of
 * that hour's conditions, not thirty independent draws.
 */
export const dedupeSamples = (samples: T64Sample[]): T64Sample[] => {
    const byBucket = new Map<number, T64Sample>();
    for (const sample of samples) {
        const bucket = Math.floor(sample.at.getTime() / (DEDUPE_BUCKET_SECONDS * 1000));
        const existing = byBucket.get(bucket);
        if (!existing || sample.at.getTime() < existing.at.getTime()) {
            byBucket.set(bucket, sample);
        }
    }
    return Array.from(byBucket.values()).sort((a, b) => a.at.getTime() - b.at.getTime());
};

/** Deterministic PRNG, so a leaderboard refresh does not reshuffle intervals. */
const makeRandom = (seed: string): (() => number) => {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < seed.length; i++) {
        h ^= seed.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
    }
    return () => {
        h ^= h << 13;
        h >>>= 0;
        h ^= h >>> 17;
        h ^= h << 5;
        h >>>= 0;
        return h / 4294967296;
    };
};

/**
 * 95% interval by resampling whole UTC dates with replacement.
 *
 * Resampling individual runs would treat two measurements ten minutes apart as
 * independent evidence. They are not: they share the same load, the same
 * routing and the same time of day. The day is the exchangeable unit here, so
 * the day is what gets resampled.
 */
export const blockBootstrapInterval = (
    samples: T64Sample[],
    seed: string,
    replicates: number = BOOTSTRAP_REPLICATES
): { low: number; high: number } | null => {
    const byDate = new Map<string, number[]>();
    for (const sample of samples) {
        const key = utcDateKey(sample.at);
        const bucket = byDate.get(key);
        if (bucket) bucket.push(sample.seconds);
        else byDate.set(key, [sample.seconds]);
    }
    const dates = Array.from(byDate.values());
    if (dates.length < 2) return null;

    const random = makeRandom(seed);
    const estimates: number[] = [];
    for (let r = 0; r < replicates; r++) {
        const pooled: number[] = [];
        for (let d = 0; d < dates.length; d++) {
            const picked = dates[Math.floor(random() * dates.length)];
            for (const value of picked) pooled.push(value);
        }
        const m = median(pooled);
        if (m > 0) estimates.push(VISIBLE_TOKEN_MARK / m);
    }
    if (estimates.length === 0) return null;
    estimates.sort((a, b) => a - b);
    const at = (q: number) =>
        estimates[Math.min(estimates.length - 1, Math.max(0, Math.floor(q * estimates.length)))];
    return { low: at(0.025), high: at(0.975) };
};

/**
 * The point estimate is 64 / median(T64), not the median of per-run rates.
 *
 * They are not the same statistic. Per-run rates are a ratio of a constant to a
 * right-skewed time, so their median exaggerates fast runs; taking the median
 * on the timing scale and converting once keeps the estimate on the scale the
 * measurement was actually made.
 */
export const evaluatePublication = (
    rawSamples: T64Sample[],
    seed: string,
    now: Date
): PublicationVerdict => {
    const windowStart = now.getTime() - WINDOW_DAYS * 24 * 3600 * 1000;
    const inWindow = rawSamples.filter(
        s => s.at.getTime() >= windowStart && Number.isFinite(s.seconds) && s.seconds > 0
    );
    const samples = dedupeSamples(inWindow);

    const dates = new Set(samples.map(s => utcDateKey(s.at)));
    const blocks = new Set(samples.map(s => utcBlock(s.at)));
    const times = samples.map(s => s.at.getTime());
    const spanHours =
        times.length > 1 ? (Math.max(...times) - Math.min(...times)) / 3_600_000 : 0;

    const base = {
        sampleCount: samples.length,
        distinctDates: dates.size,
        distinctBlocks: blocks.size,
        spanHours,
    };

    const meets = (rule: { minSamples: number; minSpanHours: number; minDates: number; minBlocks: number }) =>
        samples.length >= rule.minSamples &&
        spanHours >= rule.minSpanHours &&
        dates.size >= rule.minDates &&
        blocks.size >= rule.minBlocks;

    if (!meets(PRELIMINARY)) {
        return { state: 'insufficient', deliveredTps: null, interval: null, ...base };
    }

    const medianSeconds = median(samples.map(s => s.seconds));
    const deliveredTps = medianSeconds > 0 ? VISIBLE_TOKEN_MARK / medianSeconds : null;

    if (!meets(OFFICIAL)) {
        // A figure, deliberately without an interval: publishing one here would
        // dress a one-day sample as a claim the window cannot support.
        return { state: 'preliminary', deliveredTps, interval: null, ...base };
    }

    return {
        state: 'official',
        deliveredTps,
        interval: blockBootstrapInterval(samples, seed),
        ...base,
    };
};

export interface RankableEndpoint {
    key: string;
    quantization: string;
    deliveredTps: number;
    interval: { low: number; high: number } | null;
}

export interface RankedEndpoint extends RankableEndpoint {
    /** Shared by every endpoint whose interval could not be separated. */
    tier: number;
    /** True when this endpoint shares its tier with another. */
    orderUnresolved: boolean;
}

/**
 * Rank only where the measurement separates the candidates.
 *
 * A is faster than B only when A's whole interval sits above B's. Anything
 * connected by overlap -- directly or transitively -- forms one tier and is
 * listed alphabetically inside it, labelled "order unresolved" rather than
 * "equal": the claim is that this measurement cannot tell them apart, not that
 * they are the same speed.
 *
 * These are conservative tiers, not a proven global ordering. Individual 95%
 * intervals give no family-wise guarantee across hundreds of comparisons.
 *
 * `unknown` quantization is never ranked. It is missing metadata rather than a
 * coherent class, and it covers a third of the fleet including Groq, so
 * ranking it would silently compare an fp4 deployment against a bf16 one.
 */
export const rankEndpoints = (endpoints: RankableEndpoint[]): RankedEndpoint[] => {
    const ranked: RankedEndpoint[] = [];
    const byQuantization = new Map<string, RankableEndpoint[]>();
    for (const endpoint of endpoints) {
        if (endpoint.quantization === 'unknown') continue;
        const bucket = byQuantization.get(endpoint.quantization);
        if (bucket) bucket.push(endpoint);
        else byQuantization.set(endpoint.quantization, [endpoint]);
    }

    for (const group of byQuantization.values()) {
        const sorted = [...group].sort((a, b) => b.deliveredTps - a.deliveredTps);
        // Walk fastest to slowest, starting a new tier only where the current
        // endpoint is cleanly separated from every member of the open tier.
        let tier = 0;
        let openTier: RankableEndpoint[] = [];
        const emit = () => {
            const unresolved = openTier.length > 1;
            for (const member of [...openTier].sort((a, b) => a.key.localeCompare(b.key))) {
                ranked.push({ ...member, tier, orderUnresolved: unresolved });
            }
        };
        for (const endpoint of sorted) {
            const separated = openTier.every(
                member =>
                    member.interval != null &&
                    endpoint.interval != null &&
                    member.interval.low > endpoint.interval.high
            );
            if (openTier.length > 0 && separated) {
                emit();
                tier += 1;
                openTier = [];
            }
            openTier.push(endpoint);
        }
        if (openTier.length > 0) emit();
    }

    return ranked;
};
