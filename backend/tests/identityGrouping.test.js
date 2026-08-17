/**
 * Charts group on identity, not on the label.
 *
 * The display name is presentation, and it now comes from a third-party
 * catalogue that can rename a model whenever it likes. Grouping chart lines on
 * it made every line hostage to someone else's copy edit — and had already
 * split `claude-haiku-4.5` from `claude-haiku-4-5` into two lines for one model
 * served by three providers.
 */

const { processTimeSeriesData } = require('../utils/dataProcessing');

const base = (over = {}) => ({
  provider: 'p',
  providerCanonical: 'provider-1',
  providerSlug: 'provider-1',
  model_name: 'Model A',
  modelCanonical: 'model-a',
  modelSlug: 'model-a',
  tokens_per_second: [50],
  tokens_per_second_timestamps: [new Date('2026-08-17T12:00:00Z')],
  tokens_per_second_mean: 50,
  tokens_per_second_min: 50,
  tokens_per_second_max: 50,
  time_to_first_token: [0.1],
  time_to_first_token_timestamps: [new Date('2026-08-17T12:00:00Z')],
  time_to_first_token_mean: 0.1,
  ...over,
});

describe('cross-provider chart identity', () => {
  test('two providers with different labels but one identity are one model', async () => {
    // Exactly the claude-haiku-4.5 / claude-haiku-4-5 case.
    const data = [
      base({ providerCanonical: 'openrouter', model_name: 'Claude Haiku 4.5', identityKey: 'claude-haiku-4.5' }),
      base({ providerCanonical: 'bedrock', model_name: 'claude-haiku-4-5', identityKey: 'claude-haiku-4.5' }),
    ];

    const result = await processTimeSeriesData(data, 3);

    expect(result.models).toHaveLength(1);
    expect(result.models[0].providers).toHaveLength(2);
  });

  test('a shared label without a shared identity is not one model', async () => {
    // Two unrelated models that happen to be called the same thing must not be
    // averaged together just because a catalogue reused a name.
    const data = [
      base({ providerCanonical: 'openrouter', model_name: 'Reka Edge', identityKey: 'reka-edge' }),
      base({ providerCanonical: 'openrouter', model_name: 'Reka Edge', modelCanonical: 'other-edge', identityKey: 'other-edge' }),
    ];

    const result = await processTimeSeriesData(data, 3);

    expect(result.models).toHaveLength(2);
  });

  test('a rename moves the label without moving the line', async () => {
    const before = [
      base({ providerCanonical: 'openrouter', model_name: 'GLM 4.7', identityKey: 'glm-4.7' }),
      base({ providerCanonical: 'bedrock', model_name: 'GLM 4.7', identityKey: 'glm-4.7' }),
    ];
    const after = [
      base({ providerCanonical: 'openrouter', model_name: 'Z.ai GLM 4.7 Turbo', identityKey: 'glm-4.7' }),
      base({ providerCanonical: 'bedrock', model_name: 'Z.ai GLM 4.7 Turbo', identityKey: 'glm-4.7' }),
    ];

    const first = await processTimeSeriesData(before, 3);
    const second = await processTimeSeriesData(after, 3);

    expect(first.models).toHaveLength(1);
    expect(second.models).toHaveLength(1);
    expect(second.models[0].providers).toHaveLength(2);
  });

  test('unresolved endpoints keep the previous name-based behaviour', async () => {
    // Tightening identity must not regress the models we know least about:
    // without an identityKey, two providers serving one name still share a line.
    const data = [
      base({ providerCanonical: 'provider-1', model_name: 'Model A' }),
      base({ providerCanonical: 'provider-2', model_name: 'Model A' }),
    ];

    const result = await processTimeSeriesData(data, 3);

    expect(result.models).toHaveLength(1);
    expect(result.models[0].providers).toHaveLength(2);
  });
});
