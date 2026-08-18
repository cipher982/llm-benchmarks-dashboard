/**
 * The legacy throughput series, frozen.
 *
 * `tokens_per_second` is completion_tokens / (elapsed - time_to_first_token).
 * That denominator is timed from SSE deltas, and deltas arrive batched: on
 * pinned rows the fleet measures 4440 batched against 413 resolved, with
 * chunks up to 42 tokens. Cerebras once returned 256 tokens in 13 chunks and
 * so reported 3730 tok/s off a 0.069s window -- the socket, not the decoder.
 * Groq sent 256 chunks for identical work. The two numbers are not on the same
 * scale, which makes the series non-comparable across providers rather than
 * merely noisy.
 *
 * It is retained, never deleted: it is years of real history and the only
 * record of what the site published. What it must not do is order anything.
 * A ranking is a claim that A is faster than B, and this series cannot support
 * that claim for ~91% of the fleet.
 *
 * Delivered TPS (utils/endpointPublication.ts) replaces it as the sole speed
 * ranking. The two are never blended, averaged, or plotted on one axis.
 */

/** Stamped on anything derived from the legacy series, for audit. */
export const LEGACY_METRIC_VERSION = 'legacy_sse_window';

/** Nothing computed from the legacy series may be ranked. */
export const LEGACY_RANK_ELIGIBLE = false;

/** Shown wherever the legacy series is still displayed. */
export const LEGACY_DISCLOSURE =
    'Legacy series: timed from batched SSE deltas, so it is not comparable across providers. Retained for history; not used for ranking.';

/** Short form, for a chart rail or column header. */
export const LEGACY_LABEL = 'legacy · not comparable';

export interface LegacyMetricMeta {
    metricVersion: typeof LEGACY_METRIC_VERSION;
    rankEligible: false;
}

export const legacyMetricMeta = (): LegacyMetricMeta => ({
    metricVersion: LEGACY_METRIC_VERSION,
    rankEligible: LEGACY_RANK_ELIGIBLE,
});
