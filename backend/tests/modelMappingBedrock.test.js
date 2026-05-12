const {
  mapModelNamesHardcoded,
  normalizeBedrockClaudeDisplayName,
} = require('../utils/modelMapping');

const processed = (modelName) => ({
  _id: modelName,
  provider: 'bedrock',
  providerCanonical: 'bedrock',
  model_name: modelName,
  modelCanonical: modelName,
  tokens_per_second: [40],
  tokens_per_second_timestamps: [new Date('2026-05-11T00:00:00Z')],
  time_to_first_token: [0.2],
  time_to_first_token_timestamps: [new Date('2026-05-11T00:00:00Z')],
  tokens_per_second_mean: 40,
  tokens_per_second_min: 40,
  tokens_per_second_max: 40,
  tokens_per_second_quartiles: [40, 40, 40],
  time_to_first_token_mean: 0.2,
  time_to_first_token_min: 0.2,
  time_to_first_token_max: 0.2,
  time_to_first_token_quartiles: [0.2, 0.2, 0.2],
});

describe('Bedrock model display normalization', () => {
  test('strips provider checkpoint dates but keeps real Claude versions', () => {
    expect(normalizeBedrockClaudeDisplayName('us.anthropic.claude-opus-4-5-20251101-v1:0'))
      .toBe('claude-opus-4.5');
    expect(normalizeBedrockClaudeDisplayName('us.anthropic.claude-opus-4-7'))
      .toBe('claude-opus-4.7');
    expect(normalizeBedrockClaudeDisplayName('us.anthropic.claude-sonnet-4-8-20260601-v1:0'))
      .toBe('claude-sonnet-4.8');
    expect(normalizeBedrockClaudeDisplayName('anthropic.claude-haiku-4-10-20260715-v1:0'))
      .toBe('claude-haiku-4.10');
  });

  test('hardcoded fallback maps new Bedrock Claude IDs without one-off entries', () => {
    const result = mapModelNamesHardcoded([
      processed('us.anthropic.claude-sonnet-4-6-20260115-v1:0'),
    ]);

    expect(result[0].model_name).toBe('claude-sonnet-4.6');
    expect(result[0].modelCanonical).toBe('us.anthropic.claude-sonnet-4-6-20260115-v1:0');
  });
});
