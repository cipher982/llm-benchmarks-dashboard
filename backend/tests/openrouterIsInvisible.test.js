/**
 * OpenRouter is provisioning, not a provider.
 *
 * It is how requests are billed and reached; it has nothing to do with what the
 * site shows. A measurement OpenRouter served from DeepInfra is a DeepInfra
 * measurement, and reads the same as one taken on a DeepInfra key directly.
 *
 * This was broken in the other direction: every or-served row published as
 * `provider: "openrouter"` while carrying `observed_provider: "DeepInfra"` in
 * the same document, so 332 of 388 models lost the provider attribution that is
 * the entire point of a comparison site.
 */

const { resolveServingProvider } = require('../utils/providerMetadata');
const { cleanTransformCloud } = require('../utils/processCloud');

describe('resolveServingProvider', () => {
    test('credits the upstream that served the request', () => {
        expect(resolveServingProvider({ provider: 'openrouter', observed_provider: 'DeepInfra' })).toBe('deepinfra');
    });

    test('prefers an explicit slug when the feed gives one', () => {
        expect(resolveServingProvider({
            provider: 'openrouter',
            observed_provider: 'DeepInfra',
            observed_provider_slug: 'deepinfra',
        })).toBe('deepinfra');
    });

    test('lands multi-word upstreams on the slug the direct lanes use', () => {
        // Otherwise the same provider appears twice under two spellings.
        expect(resolveServingProvider({ provider: 'openrouter', observed_provider: 'Amazon Bedrock' })).toBe('bedrock');
        expect(resolveServingProvider({ provider: 'openrouter', observed_provider: 'Google AI Studio' })).toBe('google');
    });

    test('normalises casing and punctuation', () => {
        expect(resolveServingProvider({ provider: 'openrouter', observed_provider: 'xAI' })).toBe('xai');
        expect(resolveServingProvider({ provider: 'openrouter', observed_provider: 'AionLabs' })).toBe('aionlabs');
    });

    test('falls back to the row provider when no upstream was reported', () => {
        expect(resolveServingProvider({ provider: 'groq' })).toBe('groq');
        expect(resolveServingProvider({ provider: 'groq', observed_provider: null })).toBe('groq');
    });
});

describe('published rows', () => {
    const row = (over = {}) => ({
        _id: 'x',
        provider: 'openrouter',
        model_name: 'google/gemma-3-12b-it',
        tokens_per_second: 40,
        generated_tokens_per_second: 40,
        time_to_first_token: 0.2,
        run_ts: new Date('2026-08-17T12:00:00Z'),
        ...over,
    });

    test('an or-served row is credited to its upstream, not to OpenRouter', () => {
        const [out] = cleanTransformCloud([row({ observed_provider: 'DeepInfra' })]);

        expect(out.provider).toBe('deepinfra');
        expect(out.providerCanonical).toBe('deepinfra');
    });

    test('two upstreams serving one model are two comparable rows', () => {
        // This is the product: same model, different providers, side by side.
        const out = cleanTransformCloud([
            row({ observed_provider: 'DeepInfra' }),
            row({ observed_provider: 'Novita' }),
        ]);

        expect(out.map(r => r.providerCanonical).sort()).toEqual(['deepinfra', 'novita']);
    });

    test('nothing published ever says openrouter when an upstream is known', () => {
        const out = cleanTransformCloud([
            row({ observed_provider: 'DeepInfra' }),
            row({ observed_provider: 'Alibaba', model_name: 'qwen/qwen3-max' }),
            row({ observed_provider: 'Amazon Bedrock', model_name: 'meta/llama' }),
        ]);

        out.forEach(r => {
            expect(r.provider).not.toMatch(/openrouter/i);
            expect(r.providerCanonical).not.toMatch(/openrouter/i);
        });
    });
});
