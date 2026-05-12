const {
  normalizeBedrockClaudeDisplayName,
  resolveDisplayFromHardcoded,
} = require('../utils/naming');

describe('naming helpers', () => {
  test('does not normalize non-Bedrock Claude ids', () => {
    expect(normalizeBedrockClaudeDisplayName('gpt-5.5')).toBeUndefined();
  });

  test('normalizes Bedrock Claude checkpoint ids without hardcoding each minor version', () => {
    expect(normalizeBedrockClaudeDisplayName('us.anthropic.claude-opus-4-8-20260601-v1:0'))
      .toBe('claude-opus-4.8');
    expect(normalizeBedrockClaudeDisplayName('anthropic.claude-sonnet-4-10-20260715-v1:0'))
      .toBe('claude-sonnet-4.10');
  });

  test('resolves hardcoded display names before Bedrock fallback normalization', () => {
    const modelNameMapping = {
      'canonical-model': 'mapped-canonical',
      'raw-model': 'mapped-raw',
    };

    expect(resolveDisplayFromHardcoded({
      modelCanonical: 'canonical-model',
      rawModelName: 'raw-model',
      modelNameMapping,
    })).toBe('mapped-canonical');

    expect(resolveDisplayFromHardcoded({
      modelCanonical: 'missing-canonical',
      rawModelName: 'raw-model',
      modelNameMapping,
    })).toBe('mapped-raw');
  });

  test('falls back to Bedrock normalization, then raw model name', () => {
    expect(resolveDisplayFromHardcoded({
      modelCanonical: 'us.anthropic.claude-haiku-4-8-20260601-v1:0',
      rawModelName: 'raw-bedrock-id',
      modelNameMapping: {},
    })).toBe('claude-haiku-4.8');

    expect(resolveDisplayFromHardcoded({
      modelCanonical: 'unknown-provider-model',
      rawModelName: 'raw-model',
      modelNameMapping: {},
    })).toBe('raw-model');
  });
});
