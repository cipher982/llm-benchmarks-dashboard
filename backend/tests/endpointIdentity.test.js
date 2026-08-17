/**
 * The endpoint is the unit the site publishes.
 *
 * Verified against the live OpenRouter API on 2026-08-17:
 *   - `only:["deepinfra"]`, `["deepinfra/bf16"]` and `["deepinfra/turbo"]` all
 *     report back `provider: "DeepInfra"`, so the tag is the only thing that
 *     distinguishes them and it has to travel on the row.
 *   - `openai/gpt-oss-120b` is served at fp4 by five endpoints and bf16 by
 *     three. fp4 is faster because it is a smaller artifact, not because the
 *     provider is quicker.
 */

const { processDeliveredTps } = require('../utils/deliveredTpsProcessing');

const lookup = () => ({ display_name: 'gpt-oss-120b' });

const row = (over = {}) => ({
    model_name: 'openai/gpt-oss-120b',
    provider: 'openrouter',
    observed_provider: 'DeepInfra',
    time_to_64_visible_tokens_seconds: 1,
    tokens_per_second: 20,
    ...over,
});

describe('endpoint identity', () => {
    it('keeps two deployments of one provider on separate rows', () => {
        const rows = processDeliveredTps(
            [
                row({ route_endpoint_tag: 'deepinfra/bf16', quantization: 'bf16', time_to_64_visible_tokens_seconds: 2 }),
                row({ route_endpoint_tag: 'deepinfra/turbo', quantization: 'bf16', time_to_64_visible_tokens_seconds: 1 }),
            ],
            lookup
        );

        expect(rows).toHaveLength(2);
        expect(rows.map(r => r.endpointTag).sort()).toEqual(['deepinfra/bf16', 'deepinfra/turbo']);
        // Averaging them would report a speed neither deployment serves at.
        expect(new Set(rows.map(r => r.deliveredTps)).size).toBe(2);
    });

    it('never ranks fp4 against bf16 as the same artifact', () => {
        const rows = processDeliveredTps(
            [
                row({ route_endpoint_tag: 'coreweave/fp4', quantization: 'fp4' }),
                row({ route_endpoint_tag: 'akashml/bf16', quantization: 'bf16' }),
            ],
            lookup
        );

        expect(rows).toHaveLength(2);
        expect(rows.map(r => r.quantization).sort()).toEqual(['bf16', 'fp4']);
    });

    it('does not merge an unknown quantization into a known one', () => {
        const rows = processDeliveredTps(
            [
                row({ route_endpoint_tag: 'groq', quantization: null, observed_provider: 'Groq' }),
                row({ route_endpoint_tag: 'groq', quantization: 'fp8', observed_provider: 'Groq' }),
            ],
            lookup
        );

        expect(rows.map(r => r.quantization).sort()).toEqual(['fp8', 'unknown']);
    });

    it('marks pre-cutover rows unpinned so they cannot rank as endpoints', () => {
        const rows = processDeliveredTps([row()], lookup);

        expect(rows).toHaveLength(1);
        expect(rows[0].pinned).toBe(false);
        expect(rows[0].endpointTag).toBeNull();
    });

    it('marks a pinned row pinned', () => {
        const rows = processDeliveredTps([row({ route_endpoint_tag: 'groq', quantization: 'unknown' })], lookup);

        expect(rows[0].pinned).toBe(true);
    });

    it('still credits the upstream, never OpenRouter', () => {
        const rows = processDeliveredTps([row({ route_endpoint_tag: 'deepinfra/fp8', quantization: 'fp8' })], lookup);

        expect(rows[0].providerCanonical).toBe('deepinfra');
        expect(JSON.stringify(rows[0])).not.toMatch(/openrouter/i);
    });
});
