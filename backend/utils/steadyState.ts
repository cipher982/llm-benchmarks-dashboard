/**
 * Steady-state throughput estimator.
 *
 * Every benchmark run obeys total_time ≈ a + tokens / r: `r` is the
 * steady-state generation speed (tok/s) and `a` is the floor latency the
 * provider charges before/around token generation (queueing, TTFT, transport).
 * A single 64-token run cannot separate the two — its tokens_per_second folds
 * the floor into the rate. Interleaving 512-token runs (`cloud-long-v1`)
 * alongside the 64-token runs (`cloud-default-v1`) gives the token spread
 * needed to fit the line.
 *
 * The fit is a Theil-Sen regression of generate_time on generated tokens:
 * the slope is the median of pairwise slopes over pairs with enough token
 * spread, which makes a single outlier run (a stall, a retry) a minority vote
 * instead of a lever arm. The 95% CI on generation speed comes from bootstrap
 * resampling of the sample set with a seedable RNG so tests are exact.
 *
 * Publication gate: an estimate is only "ok" when the bootstrap CI stays
 * within ±15% of the point estimate. Everything else is explicitly
 * "insufficient-data" (not enough runs yet — the expected state until
 * cloud-long-v1 rows exist) or "unstable" (enough runs, too noisy to publish).
 */

export interface SteadyStateSample {
    generatedTokens: number;
    generateTimeSeconds: number;
}

export interface SteadyStateOptions {
    /** Pairs with token spread below this do not vote on the slope. */
    minPairTokenSpread?: number;
    /** Samples at or above this many tokens count as long runs. */
    longRunTokenThreshold?: number;
    minLongRuns?: number;
    minSamples?: number;
    bootstrapResamples?: number;
    /** CI must stay within ±this fraction of the point estimate to publish. */
    maxCiFraction?: number;
    /** Bootstrap RNG seed; same seed + same samples = same CI. */
    seed?: number;
    /** Cap on samples entering the O(n^2) pairwise fit; extras are strided out. */
    maxSamples?: number;
}

const DEFAULTS: Required<SteadyStateOptions> = {
    minPairTokenSpread: 128,
    longRunTokenThreshold: 256,
    minLongRuns: 4,
    minSamples: 12,
    bootstrapResamples: 500,
    maxCiFraction: 0.15,
    seed: 42,
    maxSamples: 256,
};

export type SteadyStateFailureReason =
    | 'insufficient-long-runs'
    | 'insufficient-samples'
    | 'no-token-spread'
    | 'non-positive-slope'
    | 'bootstrap-degenerate'
    | 'ci-width';

export interface SteadyStateSuccess {
    status: 'ok';
    /** Steady-state generation speed, tok/s (1 / Theil-Sen slope). */
    generationSpeed: number;
    /** Median intercept: seconds of per-request overhead independent of length. */
    floorLatencySeconds: number;
    sampleCount: number;
    longRunCount: number;
    /** Bootstrap 95% CI on generationSpeed. */
    ci95: [number, number];
}

export interface SteadyStateFailure {
    status: 'insufficient-data' | 'unstable';
    reason: SteadyStateFailureReason;
    sampleCount: number;
    longRunCount: number;
    /** Present on 'unstable' when a point estimate existed but failed the gate. */
    generationSpeed?: number;
    ci95?: [number, number];
}

export type SteadyStateResult = SteadyStateSuccess | SteadyStateFailure;

export const median = (values: number[]): number => {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/** Linear-interpolated quantile of an already-sorted array. */
const sortedQuantile = (sorted: number[], q: number): number => {
    const pos = (sorted.length - 1) * q;
    const lower = Math.floor(pos);
    const upper = Math.ceil(pos);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (pos - lower);
};

/** Deterministic PRNG (mulberry32) so bootstrap CIs are reproducible in tests. */
const mulberry32 = (seed: number): (() => number) => {
    let state = seed | 0;
    return () => {
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

/**
 * Theil-Sen slope: median of pairwise slopes (seconds per token) over pairs
 * whose token spread is at least `minPairTokenSpread`. Returns null when no
 * pair has enough spread to vote.
 */
const theilSenSlope = (samples: SteadyStateSample[], minPairTokenSpread: number): number | null => {
    const slopes: number[] = [];
    for (let i = 0; i < samples.length; i++) {
        for (let j = i + 1; j < samples.length; j++) {
            const tokenSpread = samples[j].generatedTokens - samples[i].generatedTokens;
            if (Math.abs(tokenSpread) < minPairTokenSpread) continue;
            slopes.push((samples[j].generateTimeSeconds - samples[i].generateTimeSeconds) / tokenSpread);
        }
    }
    if (slopes.length === 0) return null;
    return median(slopes);
};

const isValidSample = (sample: SteadyStateSample): boolean =>
    Number.isFinite(sample.generatedTokens) &&
    Number.isFinite(sample.generateTimeSeconds) &&
    sample.generatedTokens > 0 &&
    sample.generateTimeSeconds > 0;

export const estimateSteadyState = (
    rawSamples: SteadyStateSample[],
    options: SteadyStateOptions = {}
): SteadyStateResult => {
    const opts = { ...DEFAULTS, ...options };

    let samples = rawSamples.filter(isValidSample);
    // The pairwise fit is O(n^2); a runaway sample count should degrade to a
    // deterministic stride subsample, not a slow endpoint.
    if (samples.length > opts.maxSamples) {
        const stride = samples.length / opts.maxSamples;
        samples = Array.from({ length: opts.maxSamples }, (_, i) => samples[Math.floor(i * stride)]);
    }

    const sampleCount = samples.length;
    const longRunCount = samples.filter(s => s.generatedTokens >= opts.longRunTokenThreshold).length;
    const counts = { sampleCount, longRunCount };

    if (longRunCount < opts.minLongRuns) {
        return { status: 'insufficient-data', reason: 'insufficient-long-runs', ...counts };
    }
    if (sampleCount < opts.minSamples) {
        return { status: 'insufficient-data', reason: 'insufficient-samples', ...counts };
    }

    const slope = theilSenSlope(samples, opts.minPairTokenSpread);
    if (slope === null) {
        return { status: 'insufficient-data', reason: 'no-token-spread', ...counts };
    }
    if (slope <= 0) {
        return { status: 'unstable', reason: 'non-positive-slope', ...counts };
    }

    const generationSpeed = 1 / slope;
    const floorLatencySeconds = median(
        samples.map(s => s.generateTimeSeconds - slope * s.generatedTokens)
    );

    // Bootstrap the sample set; each resample refits the Theil-Sen slope.
    const rng = mulberry32(opts.seed);
    const resampledSpeeds: number[] = [];
    for (let i = 0; i < opts.bootstrapResamples; i++) {
        const resample = Array.from(
            { length: sampleCount },
            () => samples[Math.floor(rng() * sampleCount)]
        );
        const resampleSlope = theilSenSlope(resample, opts.minPairTokenSpread);
        if (resampleSlope !== null && resampleSlope > 0) {
            resampledSpeeds.push(1 / resampleSlope);
        }
    }
    if (resampledSpeeds.length < opts.bootstrapResamples / 2) {
        return { status: 'unstable', reason: 'bootstrap-degenerate', ...counts, generationSpeed };
    }

    resampledSpeeds.sort((a, b) => a - b);
    const ci95: [number, number] = [
        sortedQuantile(resampledSpeeds, 0.025),
        sortedQuantile(resampledSpeeds, 0.975),
    ];

    // Publication gate: both CI bounds must sit within ±15% of the estimate.
    if (ci95[0] < generationSpeed * (1 - opts.maxCiFraction) ||
        ci95[1] > generationSpeed * (1 + opts.maxCiFraction)) {
        return { status: 'unstable', reason: 'ci-width', ...counts, generationSpeed, ci95 };
    }

    return {
        status: 'ok',
        generationSpeed,
        floorLatencySeconds,
        ...counts,
        ci95,
    };
};
