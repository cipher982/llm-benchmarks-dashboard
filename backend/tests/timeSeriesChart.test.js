const {
  buildModelVisibility,
  getFreshnessLineStyle,
  sortModelVisibilityRows,
} = require('../components/charts/cloud/TimeSeries');

const provider = (providerCanonical, values, overrides = {}) => ({
  provider: providerCanonical,
  providerCanonical,
  values,
  ...overrides,
});

const model = (modelName, providers) => ({
  model_name: modelName,
  display_name: modelName,
  providers,
});

describe('TimeSeries chart helpers', () => {
  test('sorts multi-provider models above single-provider models', () => {
    const singleRecent = buildModelVisibility(
      model('single-recent', [provider('bedrock', [1, 2, 3])])
    );
    const multiOlder = buildModelVisibility(
      model('multi-provider', [
        provider('anthropic', [1, 2, null]),
        provider('bedrock', [1, 2, null]),
      ])
    );

    const sorted = sortModelVisibilityRows([singleRecent, multiOlder]);

    expect(sorted.map(row => row.model.model_name)).toEqual([
      'multi-provider',
      'single-recent',
    ]);
  });

  test('keeps the only stopped provider line high contrast and solid', () => {
    const style = getFreshnessLineStyle(
      provider('bedrock', [1, 2, null], { freshness_status: 'critical' }),
      true
    );

    expect(style.dash).toBeUndefined();
    expect(style.opacity).toBe(1);
    expect(style.width).toBeGreaterThan(3);
  });

  test('uses dashed stopped line only when there are competing visible providers', () => {
    const style = getFreshnessLineStyle(
      provider('bedrock', [1, 2, null], { freshness_status: 'critical' }),
      false
    );

    expect(style.dash).toBe('4 3');
    expect(style.opacity).toBeLessThan(1);
  });
});
