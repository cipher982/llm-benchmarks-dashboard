/**
 * Decode rate: the model's steady generation speed, read from one ordinary
 * 64-token run at no extra spend.
 *
 * Every run obeys `wall ≈ a + tokens / λ` (docs/throughput-calibration-findings
 * in the runner repo). The published `tokens_per_second` folds the floor `a`
 * — queueing, prefill, reasoning, transport — into the rate, so at a 64-token
 * budget it reports 36–77% of λ and the faster the model the worse the
 * understatement. Recovering λ used to need interleaved 512-token runs for a
 * Theil-Sen fit (`utils/steadyState.ts`); that lane stopped on 2026-08-16.
 *
 * The runner already records the wall-clock gap between consecutive visible
 * stream chunks (`times_between_tokens`). Once tokens are flowing, those gaps
 * are the decoder: their sum is `generate_time − TTFT` to within 0.1%, and
 * the first visible chunk — the one that carries the floor — is not in them.
 * So `tokens after the first chunk / Σ gaps` is λ from a single run.
 *
 * Validated 2026-09-02 against the steady-state estimator on the 22
 * identities where it publishes: median ratio 1.05, interquartile 0.99–1.19,
 * and 0.99 on single-provider lanes (OpenAI direct). The routed lanes that
 * disagree by >1.5x are ones whose 512-token reference runs predate
 * provider pinning and may have hit a different upstream.
 *
 * Four things make a run unusable, and each is refused rather than guessed:
 *
 * - **Too few gaps.** Under eight chunks there is nothing to average.
 * - **Batched stream.** A chunk carrying many tokens times the socket, not
 *   the decoder (Cerebras: 256 tokens in 13 chunks). The runner labels
 *   streams `resolved` when no chunk exceeds 4 tokens; rows written before
 *   that label existed are inferred from the mean tokens per chunk, with a
 *   stricter bound because a mean hides a maximum.
 * - **Buffer flush.** Some upstreams hold the whole answer and release it in
 *   one burst: 64 one-token chunks inside 40ms after a 6s wait. The chunks
 *   are fine-grained and the timing is meaningless. A median gap under 1ms
 *   is a flush, not a 1,600 tok/s decoder.
 * - **Stall.** A single gap of tens of seconds inside a 64-token stream is a
 *   reasoning phase that leaked past the first visible chunk, or an outage —
 *   not generation. Gaps beyond max(2s, 50× the median) are dropped with
 *   their share of tokens. Ordinary jitter (bursts of a few tokens then a
 *   100ms pause, which OpenAI's stream does constantly) stays in, because λ
 *   includes it too.
 *
 * Batched streams, revisited 2026-11-11. Half of a week's paid runs (691 of
 * 1,418) were refused as batched: Azure, Google AI Studio and claude-on-aws
 * send a few tokens per chunk on every run. The refusal assumed every chunk
 * carries the same number of tokens, which is false for those streams. Rows
 * from 2026-11-11 carry the exact visible tokens after the first chunk and the
 * time from the first to the last chunk, so a batched stream can be read as
 * `window tokens / window seconds` without that assumption. It is refused when:
 *
 * - the window is shorter than `MIN_WINDOW_SECONDS`. That is the flush test
 *   for this path: a held answer released in one burst spans tens of ms. The
 *   median-gap test is not used here, because in a chunked stream a sub-ms
 *   median is chunk cadence, not buffering (it refused ~300 real windows);
 * - any chunk carries more than `MAX_BATCHED_TOKENS_PER_CHUNK` tokens or more
 *   than `MAX_CHUNK_SHARE` of the window, so a finish-flush tail cannot be
 *   published as decoder speed;
 * - any single gap is more than `MAX_GAP_SHARE` of the window, because a
 *   pause's tokens cannot be separated from the rest the way the resolved
 *   path drops a stall with its share.
 */

export interface DecodeRateInput {
    /** Seconds between consecutive visible-content chunks; the first chunk has no entry. */
    gaps?: ReadonlyArray<number> | null;
    /** Visible tokens in the run. Falls back to generated tokens, then the 64-token mark. */
    visibleTokens?: number | null;
    generatedTokens?: number | null;
    /** The runner's `stream_resolution`: resolved | batched | unmeasured. Absent on older rows. */
    resolution?: string | null;
    /** Exact visible tokens after the first chunk (runner rows from 2026-11-11). */
    windowTokens?: number | null;
    /** Seconds from the first to the last visible chunk. */
    windowSeconds?: number | null;
    /** Largest number of tokens the runner saw in one chunk. */
    maxTokensPerChunk?: number | null;
}

export type DecodeVerdict = 'usable' | 'too-few-gaps' | 'batched' | 'flushed';

export interface DecodeEstimate {
    verdict: DecodeVerdict;
    /** Tokens per second once generation is under way. Present only when `usable`. */
    rate: number | null;
}

export const MIN_GAPS = 8;
/** Inferred-resolution bound for rows without a label. The runner's own bound is 4 on the maximum. */
export const MAX_MEAN_TOKENS_PER_CHUNK = 2;
export const FLUSH_MEDIAN_GAP_SECONDS = 0.001;
export const STALL_FLOOR_SECONDS = 2;
export const STALL_MEDIAN_MULTIPLE = 50;
export const DEFAULT_VISIBLE_TOKENS = 64;
/** A batched window shorter than this times the socket, not the decoder (Cerebras: 0.069s). */
export const MIN_WINDOW_SECONDS = 0.25;
/** Largest chunk a batched window may contain and still time the decoder. */
export const MAX_BATCHED_TOKENS_PER_CHUNK = 16;
/** No one chunk may carry more than this share of the window's tokens. */
export const MAX_CHUNK_SHARE = 0.25;
/** No one gap may take more than this share of the window's time. */
export const MAX_GAP_SHARE = 0.25;

export function median(values: ReadonlyArray<number>): number {
    if (!values.length) return NaN;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = sorted.length >> 1;
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function estimateDecodeRate(input: DecodeRateInput): DecodeEstimate {
    const gaps = (input.gaps ?? []).filter((g) => typeof g === 'number' && Number.isFinite(g) && g >= 0);
    if (gaps.length < MIN_GAPS) return { verdict: 'too-few-gaps', rate: null };

    const tokens =
        input.visibleTokens && input.visibleTokens > 0
            ? input.visibleTokens
            : input.generatedTokens && input.generatedTokens > 0
                ? input.generatedTokens
                : DEFAULT_VISIBLE_TOKENS;
    const chunks = gaps.length + 1;
    const tokensPerChunk = tokens / chunks;

    const typical = median(gaps);

    if (input.resolution) {
        if (input.resolution !== 'resolved') return estimateBatchedWindow(input, gaps);
    } else if (tokensPerChunk > MAX_MEAN_TOKENS_PER_CHUNK) {
        return { verdict: 'batched', rate: null };
    }

    if (typical < FLUSH_MEDIAN_GAP_SECONDS) return { verdict: 'flushed', rate: null };

    const cut = Math.max(STALL_FLOOR_SECONDS, STALL_MEDIAN_MULTIPLE * typical);
    const kept = gaps.filter((g) => g <= cut);
    if (kept.length < MIN_GAPS) return { verdict: 'too-few-gaps', rate: null };

    const seconds = kept.reduce((total, g) => total + g, 0);
    if (!(seconds > 0)) return { verdict: 'flushed', rate: null };

    return { verdict: 'usable', rate: (tokensPerChunk * kept.length) / seconds };
}

function estimateBatchedWindow(input: DecodeRateInput, gaps: number[]): DecodeEstimate {
    const windowTokens = input.windowTokens;
    const windowSeconds = input.windowSeconds;
    if (!(windowTokens && windowTokens > 0) || !(windowSeconds && windowSeconds > 0)) {
        return { verdict: 'batched', rate: null };
    }
    if (windowSeconds < MIN_WINDOW_SECONDS) return { verdict: 'flushed', rate: null };
    const largest = input.maxTokensPerChunk;
    if (
        largest == null ||
        largest > MAX_BATCHED_TOKENS_PER_CHUNK ||
        largest > MAX_CHUNK_SHARE * windowTokens
    ) {
        return { verdict: 'batched', rate: null };
    }
    if (gaps.some((g) => g > MAX_GAP_SHARE * windowSeconds)) return { verdict: 'batched', rate: null };
    return { verdict: 'usable', rate: windowTokens / windowSeconds };
}

export interface DecodeSummary {
    /** Median decode rate over the usable runs, or null when none qualified. */
    median: number | null;
    /** Usable runs. */
    samples: number;
    /** Usable runs as a share of all runs in the group. */
    share: number;
}

export function summariseDecodeRates(rates: ReadonlyArray<number>, runs: number): DecodeSummary {
    return {
        median: rates.length ? median(rates) : null,
        samples: rates.length,
        share: runs > 0 ? rates.length / runs : 0,
    };
}
