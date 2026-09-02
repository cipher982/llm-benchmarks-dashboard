/**
 * The landing page shows live lanes, one row per identity, and never deletes.
 *
 * After the 2026-08-16 migration the 30-day window held both the retired
 * direct lane and the OpenRouter-served lane for hundreds of models. Shown
 * raw, Groq's Llama 3.1 8B appeared twice with the retired lane on top.
 */

const { scopeRows, foldLanes, isFlagged, laneKey } = require('../utils/laneView');

const row = (overrides = {}) => ({
    provider: 'groq',
    providerCanonical: 'groq',
    providerSlug: 'groq',
    model_name: 'Llama 3.1 8B Instruct',
    modelCanonical: 'meta-llama/llama-3.1-8b-instruct',
    modelSlug: 'metallamallama318binstruct',
    transportProvider: 'openrouter',
    tokens_per_second_mean: 110,
    tokens_per_second_min: 87,
    tokens_per_second_max: 138,
    samples: 4,
    time_to_first_token_mean: 0.47,
    last_benchmark_date: '2026-09-01T10:00:00.000Z',
    ...overrides,
});

describe('scopeRows', () => {
    const live = row();
    const retired = row({ modelCanonical: 'llama-3.1-8b-instant', transportProvider: 'direct', lifecycle_status: 'disabled' });
    const legacyDeprecated = row({ modelCanonical: 'old', deprecated: true });

    it('hides every flagged status by default, including rows that only carry `deprecated`', () => {
        expect(scopeRows([live, retired, legacyDeprecated], 'hideFlagged')).toEqual([live]);
    });

    it('keeps everything under "all" — history is never deleted', () => {
        expect(scopeRows([live, retired], 'all')).toHaveLength(2);
    });

    it('inverts under "flaggedOnly"', () => {
        expect(scopeRows([live, retired], 'flaggedOnly')).toEqual([retired]);
    });

    it('treats a row with no lifecycle status as live', () => {
        expect(isFlagged({})).toBe(false);
    });
});

describe('foldLanes', () => {
    it('shows one row per provider+model, spoken for by the most recent lane', () => {
        const older = row({ modelCanonical: 'llama-3.1-8b-instant', transportProvider: 'direct', samples: 387, tokens_per_second_mean: 203, last_benchmark_date: '2026-08-16T21:00:00.000Z' });
        const newer = row();
        const { rows, folded, lanes } = foldLanes([older, newer]);

        expect(rows).toHaveLength(1);
        expect(rows[0].modelCanonical).toBe('meta-llama/llama-3.1-8b-instruct');
        expect(rows[0].otherLanes).toBe(1);
        expect(rows[0].lanes[0]).toMatchObject({ modelCanonical: 'llama-3.1-8b-instant', transportProvider: 'direct', samples: 387 });
        expect(folded).toBe(1);
        expect(lanes.has(laneKey(newer))).toBe(true);
        expect(lanes.has(laneKey(older))).toBe(false);
    });

    it('breaks a same-day tie by sample count, so a direct OpenAI lane beats its 21-sample routed twin', () => {
        const direct = row({ providerCanonical: 'openai', provider: 'openai', model_name: 'gpt-4.1-nano', modelCanonical: 'gpt-4.1-nano', transportProvider: 'direct', samples: 421, last_benchmark_date: '2026-08-30T00:00:00.000Z' });
        const routed = { ...direct, transportProvider: 'openrouter', samples: 21 };
        const { rows } = foldLanes([routed, direct]);
        expect(rows[0].transportProvider).toBe('direct');
    });

    it('does not fold across providers', () => {
        const groq = row();
        const bedrock = row({ providerCanonical: 'bedrock', provider: 'bedrock', modelCanonical: 'us.meta.llama3-1-8b' });
        expect(foldLanes([groq, bedrock]).rows).toHaveLength(2);
    });

    it('leaves a lone lane untouched, with no lanes annotation', () => {
        const { rows } = foldLanes([row()]);
        expect(rows[0].otherLanes).toBeUndefined();
    });
});
