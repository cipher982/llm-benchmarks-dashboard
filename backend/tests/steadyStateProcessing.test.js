/**
 * Steady-state endpoint processing: grouping, profile selection, and the
 * canonical/display/slug naming contract, on fixture rows of both profiles.
 * Pure — the metadata lookup is a fixture, exactly like pipeline.canonical.
 */

jest.mock('../utils/connectToMongoDB', () => jest.fn().mockResolvedValue(true));

const { processSteadyState, LONG_PROFILE_ID, STEADY_STATE_PROFILE_IDS } = require('../utils/steadyStateProcessing');
const { PUBLISHED_PROFILE_ID } = require('../utils/processCloud');
const { createSlug } = require('../utils/seoUtils');

const DISPLAY_NAMES = {
  'vertex:gemini-2.5-pro-001': 'gemini-2.5-pro',
  'openai:gpt-5.2-2026-01-15': 'gpt-5.2',
};

const lookup = (provider, modelId) => ({
  display_name: DISPLAY_NAMES[`${provider}:${modelId}`] || modelId,
});

// r = 100 tok/s, floor = 0.4 s, small deterministic jitter.
const runTime = (tokens, i) => (0.4 + tokens / 100) * (1 + 0.02 * Math.sin(i * 12.9898));

const makeRow = (overrides = {}) => ({
  _id: 'row-id',
  run_ts: '2026-08-10T12:00:00Z',
  provider: 'vertex',
  model_name: 'gemini-2.5-pro-001',
  benchmark_profile_id: PUBLISHED_PROFILE_ID,
  output_tokens: 64,
  generate_time: 1.04,
  tokens_per_second: 61.5,
  ...overrides,
});

// A full two-profile set for one provider/model: 12 short + 6 long runs.
const makeFullGroup = (provider, model_name, extra = {}) => {
  const rows = [];
  for (let i = 0; i < 12; i++) {
    rows.push(makeRow({
      provider,
      model_name,
      output_tokens: 64,
      generate_time: runTime(64, i),
      tokens_per_second: 64 / runTime(64, i),
      ...extra,
    }));
  }
  for (let i = 0; i < 6; i++) {
    rows.push(makeRow({
      provider,
      model_name,
      benchmark_profile_id: LONG_PROFILE_ID,
      output_tokens: 512,
      generate_time: runTime(512, 12 + i),
      tokens_per_second: 512 / runTime(512, 12 + i),
      ...extra,
    }));
  }
  return rows;
};

describe('processSteadyState', () => {
  test('profile constants cover exactly the default and long profiles', () => {
    expect(STEADY_STATE_PROFILE_IDS).toEqual(['cloud-default-v1', 'cloud-long-v1']);
  });

  test('groups by canonical fields and follows the naming contract', () => {
    const rows = processSteadyState(
      [...makeFullGroup('vertex', 'gemini-2.5-pro-001'), ...makeFullGroup('openai', 'gpt-5.2-2026-01-15')],
      lookup
    );

    expect(rows).toHaveLength(2);

    const vertexRow = rows.find(r => r.providerCanonical === 'vertex');
    expect(vertexRow).toBeDefined();
    // Display label is 'google'; canonical and slug stay 'vertex'.
    expect(vertexRow.provider).toBe('google');
    expect(vertexRow.providerCanonical).toBe('vertex');
    expect(vertexRow.providerSlug).toBe('vertex');
    // Model slug comes from the canonical id, never the display name.
    expect(vertexRow.model).toBe('gemini-2.5-pro-001');
    expect(vertexRow.modelCanonical).toBe('gemini-2.5-pro-001');
    expect(vertexRow.modelSlug).toBe(createSlug('gemini-2.5-pro-001'));
    expect(vertexRow.displayName).toBe('gemini-2.5-pro');

    const openaiRow = rows.find(r => r.providerCanonical === 'openai');
    expect(openaiRow.provider).toBe('openai');
    expect(openaiRow.displayName).toBe('gpt-5.2');
  });

  test('a full two-profile group produces an ok estimate and a legacy median', () => {
    const rows = processSteadyState(makeFullGroup('vertex', 'gemini-2.5-pro-001'), lookup);

    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.status).toBe('ok');
    expect(row.sampleCount).toBe(18);
    expect(row.longRunCount).toBe(6);
    expect(row.generationSpeed).toBeGreaterThan(95);
    expect(row.generationSpeed).toBeLessThan(105);
    expect(row.floorLatencySeconds).toBeGreaterThan(0.3);
    expect(row.floorLatencySeconds).toBeLessThan(0.5);
    expect(row.ci95).toHaveLength(2);
    // legacyTps is the median of the 64-token rows only (~61.5 tok/s), not
    // dragged upward by the 512-token runs (~95 tok/s).
    expect(row.legacyTps).toBeGreaterThan(55);
    expect(row.legacyTps).toBeLessThan(70);
  });

  test('default-profile-only rows report insufficient-data with clean nulls', () => {
    const rows = processSteadyState(
      Array.from({ length: 20 }, (_, i) => makeRow({ generate_time: runTime(64, i) })),
      lookup
    );

    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.status).toBe('insufficient-data');
    expect(row.reason).toBe('insufficient-long-runs');
    expect(row.generationSpeed).toBeNull();
    expect(row.floorLatencySeconds).toBeNull();
    expect(row.ci95).toBeNull();
    expect(row.longRunCount).toBe(0);
    // Legacy throughput is still reported while the estimator waits for data.
    expect(row.legacyTps).toBeGreaterThan(0);
    // The whole response must remain plain JSON.
    expect(() => JSON.stringify(rows)).not.toThrow();
  });

  test('rows from other benchmark profiles are excluded from the fit', () => {
    const reasoningRows = Array.from({ length: 10 }, () => makeRow({
      benchmark_profile_id: 'cloud-reasoning-v1',
      output_tokens: 2048,
      generate_time: 300, // would wreck the slope if it leaked in
    }));
    const rows = processSteadyState(
      [...makeFullGroup('vertex', 'gemini-2.5-pro-001'), ...reasoningRows],
      lookup
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].sampleCount).toBe(18);
    expect(rows[0].status).toBe('ok');
  });

  test('rows without a profile id count as the default profile', () => {
    const legacyRows = Array.from({ length: 3 }, (_, i) => makeRow({
      benchmark_profile_id: undefined,
      tokens_per_second: 60,
      generate_time: runTime(64, 100 + i),
    }));
    const rows = processSteadyState(legacyRows, lookup);

    expect(rows).toHaveLength(1);
    expect(rows[0].sampleCount).toBe(3);
    expect(rows[0].legacyTps).toBe(60);
  });

  test('direct and routed samples never share a fit', () => {
    const rows = processSteadyState(
      [
        ...makeFullGroup('deepinfra', 'Qwen/Qwen3-32B'),
        ...makeFullGroup('deepinfra', 'Qwen/Qwen3-32B', { transport_provider: 'openrouter' }),
      ],
      lookup
    );

    expect(rows).toHaveLength(2);
    expect(rows.map(r => r.transportProvider).sort()).toEqual(['direct', 'openrouter']);
    expect(rows.map(r => r.provider).sort()).toEqual(['deepinfra', 'deepinfra via OpenRouter']);
    rows.forEach(r => expect(r.sampleCount).toBe(18));
  });

  test('empty input returns an empty row list, not an error', () => {
    expect(processSteadyState([], lookup)).toEqual([]);
  });

  test('rows missing provider or model are skipped', () => {
    const rows = processSteadyState(
      [makeRow({ provider: '' }), makeRow({ model_name: undefined })],
      lookup
    );
    expect(rows).toEqual([]);
  });
});
