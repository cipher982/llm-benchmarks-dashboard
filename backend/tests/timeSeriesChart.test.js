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

describe('Provider visibility', () => {
  // Reproduces production on 2026-08-05: llama-3.3-70b was being measured at
  // four providers and the chart drew two. Together (12/144 slots) and
  // DeepInfra (11/144) fell under a 10%-of-window coverage rule, having only
  // started being measured two days earlier.
  const sparse = (n, total = 144) => [
    ...Array(n).fill(50),
    ...Array(total - n).fill(null),
  ];

  test('a provider measured only recently is still drawn', () => {
    const visibility = buildModelVisibility(
      model('llama-3.3-70b', [
        provider('bedrock', sparse(144)),
        provider('groq', sparse(71)),
        provider('together', sparse(12)),
        provider('deepinfra', sparse(11)),
      ])
    );

    expect(visibility.visibleProviders.map(p => p.provider).sort()).toEqual([
      'bedrock',
      'deepinfra',
      'groq',
      'together',
    ]);
  });

  test('a single stray point is not drawn as a line', () => {
    const visibility = buildModelVisibility(
      model('barely-measured', [
        provider('bedrock', sparse(144)),
        provider('together', sparse(1)),
      ])
    );

    expect(visibility.visibleProviders.map(p => p.provider)).toEqual(['bedrock']);
  });

  test('visibility does not depend on the width of the window', () => {
    // The same 12 real measurements, viewed over 14 days and over 30 days. A
    // ratio threshold made the provider vanish on the longer view; the number
    // of measurements did not change, only the denominator.
    const short = buildModelVisibility(model('m', [provider('together', sparse(12, 144))]));
    const long = buildModelVisibility(model('m', [provider('together', sparse(12, 720))]));

    expect(short.visibleCount).toBe(1);
    expect(long.visibleCount).toBe(1);
  });
});
