/**
 * Decode rate: the generation speed once tokens are flowing, read from the
 * inter-chunk gaps of one ordinary 64-token run.
 *
 * The published tokens_per_second folds time-to-first-token into the rate
 * and, at a 64-token budget, reports as little as a third of the model's
 * real speed. The gaps between visible chunks exclude that floor. Each guard
 * below corresponds to a way a stream's timing can describe something other
 * than the decoder: too few chunks, transport batching, a buffer flushed in
 * one burst, and a reasoning stall that leaked past the first visible token.
 */

const {
    estimateDecodeRate,
    summariseDecodeRates,
    median,
    MIN_GAPS,
} = require('../utils/decodeRate');
const { cleanTransformCloud } = require('../utils/processCloud');
const { processRawTableData } = require('../utils/dataProcessing');
const { mergeProcessedModelGroup } = require('../utils/modelMappingMerge');

const steady = (n, gap) => new Array(n).fill(gap);

describe('estimateDecodeRate', () => {
    it('reads the decode rate from steady gaps, excluding the first chunk', () => {
        // 64 tokens in 64 one-token chunks, 20ms apart: 50 tok/s.
        const out = estimateDecodeRate({ gaps: steady(63, 0.02), visibleTokens: 64, resolution: 'resolved' });
        expect(out.verdict).toBe('usable');
        expect(out.rate).toBeCloseTo(50, 5);
    });

    it('needs enough chunks to average', () => {
        expect(estimateDecodeRate({ gaps: steady(MIN_GAPS - 1, 0.02), visibleTokens: 64 }).verdict).toBe('too-few-gaps');
        expect(estimateDecodeRate({ gaps: null, visibleTokens: 64 }).verdict).toBe('too-few-gaps');
    });

    it('refuses a stream the runner labelled batched', () => {
        const out = estimateDecodeRate({ gaps: steady(12, 0.005), visibleTokens: 256, resolution: 'batched' });
        expect(out.verdict).toBe('batched');
        expect(out.rate).toBeNull();
    });

    it('infers batching from chunk size when the row predates the label', () => {
        // 64 tokens over 11 chunks is ~6 tokens a chunk: transport, not decoder.
        expect(estimateDecodeRate({ gaps: steady(10, 0.05), visibleTokens: 64 }).verdict).toBe('batched');
        // The same 64 tokens over 64 chunks is fine without a label.
        expect(estimateDecodeRate({ gaps: steady(63, 0.02), visibleTokens: 64 }).verdict).toBe('usable');
    });

    it('refuses a buffer flushed in one burst', () => {
        // Sixty-four chunks inside 25ms is a held response released at once,
        // not a 2,500 tok/s decoder.
        const out = estimateDecodeRate({ gaps: steady(63, 0.0004), visibleTokens: 64, resolution: 'resolved' });
        expect(out.verdict).toBe('flushed');
        expect(out.rate).toBeNull();
    });

    it('drops a stall but keeps ordinary jitter', () => {
        // A 30s reasoning phase after the first visible chunk would make the
        // sum-based rate ~2 tok/s; the decoder ran at 50.
        const stalled = [30, ...steady(62, 0.02)];
        expect(estimateDecodeRate({ gaps: stalled, visibleTokens: 64, resolution: 'resolved' }).rate).toBeCloseTo(50, 3);

        // Burst-then-pause streaming (OpenAI) is what the decoder actually
        // delivers, so 150ms pauses stay in and lower the rate.
        const jittery = [...steady(56, 0.01), ...steady(7, 0.15)];
        const out = estimateDecodeRate({ gaps: jittery, visibleTokens: 64, resolution: 'resolved' });
        expect(out.verdict).toBe('usable');
        expect(out.rate).toBeLessThan(64 / 0.63 / 1.0);
        expect(out.rate).toBeCloseTo((64 / 64) * 63 / (56 * 0.01 + 7 * 0.15), 3);
    });

    it('falls back to generated tokens, then the 64-token mark', () => {
        const fromGenerated = estimateDecodeRate({ gaps: steady(63, 0.02), generatedTokens: 128, resolution: 'resolved' });
        expect(fromGenerated.rate).toBeCloseTo(100, 3);
        const fromMark = estimateDecodeRate({ gaps: steady(63, 0.02), resolution: 'resolved' });
        expect(fromMark.rate).toBeCloseTo(50, 3);
    });
});

describe('summariseDecodeRates', () => {
    it('reports the median, the count and the share of runs that qualified', () => {
        expect(summariseDecodeRates([40, 60, 50], 6)).toEqual({ median: 50, samples: 3, share: 0.5 });
        expect(summariseDecodeRates([], 4)).toEqual({ median: null, samples: 0, share: 0 });
        expect(median([3, 1, 2, 4])).toBe(2.5);
    });
});

describe('decode rate through the pipeline', () => {
    const raw = (overrides = {}) => ({
        _id: 'x',
        provider: 'openai',
        model_name: 'gpt-5-nano',
        run_ts: '2026-09-01T12:00:00.000Z',
        tokens_per_second: 40,
        generated_tokens_per_second: 40,
        visible_tokens_per_second: 40,
        output_tokens: 64,
        generate_time: 1.6,
        time_to_first_token: 0.3,
        times_between_tokens: steady(63, 0.02),
        visible_output_tokens: 64,
        stream_resolution: 'resolved',
        ...overrides,
    });

    it('carries the median decode rate and its evidence onto the table row', async () => {
        const rows = cleanTransformCloud([
            raw({ _id: 'a' }),
            raw({ _id: 'b', times_between_tokens: steady(63, 0.04) }),
            raw({ _id: 'c', stream_resolution: 'batched' }),
        ]);
        expect(rows).toHaveLength(1);
        expect(rows[0].decode_samples).toBe(2);
        expect(rows[0].decode_resolution_share).toBeCloseTo(2 / 3, 5);
        // Median of 50 and 25.
        expect(rows[0].decode_tokens_per_second_median).toBeCloseTo(37.5, 3);

        const [tableRow] = await processRawTableData([
            { ...rows[0], providerSlug: 'openai', modelSlug: 'gpt5nano', time_to_first_token_mean: 0.3 },
        ]);
        expect(tableRow.decode_tokens_per_second).toBeCloseTo(37.5, 1);
        expect(tableRow.decode_samples).toBe(2);
        expect(tableRow.decode_resolution_share).toBeCloseTo(0.667, 2);
    });

    it('leaves the decode fields empty rather than zero when nothing qualified', async () => {
        const rows = cleanTransformCloud([raw({ times_between_tokens: [] })]);
        expect(rows[0].decode_tokens_per_second_median).toBeNull();
        expect(rows[0].decode_samples).toBe(0);
        const [tableRow] = await processRawTableData([
            { ...rows[0], providerSlug: 'openai', modelSlug: 'gpt5nano', time_to_first_token_mean: 0.3 },
        ]);
        expect(tableRow.decode_tokens_per_second).toBeUndefined();
    });
});

describe('decode rate survives the name-mapping merge', () => {
    // The first deploy of the column shipped em dashes on every row: the
    // transform computed the rate, the table read it, and the merge in
    // between rebuilt each row from an explicit field list that did not
    // name it. Production is the only place the merge runs on real rows.
    const gaps = Array.from({ length: 63 }, (_, i) => 0.002 + (i % 4) * 0.0005);
    const raw = (overrides = {}) => ({
        _id: 'x', provider: 'openrouter', observed_provider: 'Groq', observed_provider_slug: 'groq',
        transport_provider: 'openrouter', model_name: 'meta-llama/llama-3.3-70b-instruct',
        display_name: 'Llama 3.3 70B Instruct', run_ts: new Date().toISOString(),
        tokens_per_second: 90, generate_time: 0.7, time_to_first_token: 0.5,
        times_between_tokens: gaps, visible_output_tokens: 64, generated_output_tokens: 64,
        stream_resolution: 'resolved', benchmark_profile_id: 'cloud-default-v1',
        visible_tokens_per_second: 90, generated_tokens_per_second: 90,
        ...overrides,
    });

    it('carries the rate through mergeProcessedModelGroup', () => {
        const items = cleanTransformCloud([raw(), raw({ _id: 'y' })]);
        const merged = mergeProcessedModelGroup({
            items, providerCanonical: 'groq', transportProvider: 'openrouter',
            modelDisplay: 'Llama 3.3 70B Instruct', modelCanonical: 'meta-llama/llama-3.3-70b-instruct',
        });
        expect(merged.decode_tokens_per_second_median).toBeGreaterThan(0);
        expect(merged.decode_samples).toBe(2);
        expect(merged.decode_resolution_share).toBe(1);
    });

    it('recomputes one median over every run when two catalogue ids merge', () => {
        const fast = cleanTransformCloud([raw({ times_between_tokens: gaps.map((g) => g / 2) })]);
        const slow = cleanTransformCloud([raw({ model_name: 'llama-3.3-70b-versatile', times_between_tokens: gaps.map((g) => g * 2) })]);
        const merged = mergeProcessedModelGroup({
            items: [...fast, ...slow], providerCanonical: 'groq', transportProvider: 'openrouter',
            modelDisplay: 'Llama 3.3 70B Instruct', modelCanonical: 'meta-llama/llama-3.3-70b-instruct',
        });
        const rates = merged.decode_rates;
        expect(rates).toHaveLength(2);
        // Median of two values is their midpoint, not either item's own median.
        expect(merged.decode_tokens_per_second_median).toBeCloseTo((rates[0] + rates[1]) / 2, 6);
        expect(merged.decode_runs).toBe(2);
    });
});
