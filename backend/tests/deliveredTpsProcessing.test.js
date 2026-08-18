/**
 * Delivered TPS endpoint processing: grouping, field filtering, and the
 * canonical/display/slug naming contract, on fixture rows.
 * Pure — the metadata lookup is a fixture.
 */

jest.mock('../utils/connectToMongoDB', () => jest.fn().mockResolvedValue(true));

const { processDeliveredTps, VISIBLE_TOKEN_MARK } = require('../utils/deliveredTpsProcessing');
const { PUBLISHED_PROFILE_ID } = require('../utils/processCloud');
const { createSlug } = require('../utils/seoUtils');

const DISPLAY_NAMES = {
  'vertex:gemini-2.5-pro-001': 'gemini-2.5-pro',
  'openai:gpt-5.2-2026-01-15': 'gpt-5.2',
};

const lookup = (provider, modelId) => ({
  display_name: DISPLAY_NAMES[`${provider}:${modelId}`] || modelId,
});

const makeRow = (overrides = {}) => ({
  _id: 'row-id',
  run_ts: '2026-08-10T12:00:00Z',
  provider: 'vertex',
  model_name: 'gemini-2.5-pro-001',
  benchmark_profile_id: PUBLISHED_PROFILE_ID,
  time_to_64_visible_tokens_seconds: 2.0,
  tokens_per_second: 32,
  ...overrides,
});

describe('processDeliveredTps', () => {
  test('VISIBLE_TOKEN_MARK agrees with the runner constant', () => {
    expect(VISIBLE_TOKEN_MARK).toBe(64);
  });

  test('computes the median of 64 / time_to_64 and a sample count', () => {
    const rows = [
      makeRow({ time_to_64_visible_tokens_seconds: 2.0 }), // 32
      makeRow({ time_to_64_visible_tokens_seconds: 4.0 }), // 16
      makeRow({ time_to_64_visible_tokens_seconds: 6.0 }), // ~10.67
    ];
    const [row] = processDeliveredTps(rows, lookup);
    expect(row.measuredDeliveredTps).toBeCloseTo(16, 10);
    // These fixture rows carry no endpoint tag, so they are unpinned and
    // disqualified by kind rather than by sample count.
    expect(row.deliveredTps).toBeNull();
    expect(row.publicationState).toBe("unpinned");
    expect(row.sampleCount).toBe(3);
  });

  test('rows without a valid time_to_64 are excluded', () => {
    const rows = [
      makeRow({ time_to_64_visible_tokens_seconds: 2.0 }),
      makeRow({ time_to_64_visible_tokens_seconds: null }),
      makeRow({ time_to_64_visible_tokens_seconds: 0 }),
      makeRow({ time_to_64_visible_tokens_seconds: undefined }),
    ];
    const [row] = processDeliveredTps(rows, lookup);
    expect(row.sampleCount).toBe(1);
    expect(row.measuredDeliveredTps).toBeCloseTo(32, 10);
  });

  test('legacyTps uses only the default-profile 64-token series', () => {
    const rows = [
      makeRow({ time_to_64_visible_tokens_seconds: 2.0, tokens_per_second: 50 }),
      makeRow({
        benchmark_profile_id: 'cloud-long-v1',
        time_to_64_visible_tokens_seconds: 2.0,
        tokens_per_second: 200, // long-profile steady-state, not the burst number
      }),
    ];
    const [row] = processDeliveredTps(rows, lookup);
    expect(row.legacyTps).toBe(50);
  });

  test('follows the naming contract', () => {
    const rows = [makeRow({ time_to_64_visible_tokens_seconds: 2.0 })];
    const [row] = processDeliveredTps(rows, lookup);
    expect(row.providerCanonical).toBe('vertex');
    expect(row.modelCanonical).toBe('gemini-2.5-pro-001');
    expect(row.providerSlug).toBe('vertex');
    expect(row.modelSlug).toBe(createSlug('gemini-2.5-pro-001'));
    expect(row.displayName).toBe('gemini-2.5-pro');
  });

  test('direct and routed samples never share a row', () => {
    const rows = [
      makeRow({ time_to_64_visible_tokens_seconds: 2.0 }),
      makeRow({ transport_provider: 'openrouter', time_to_64_visible_tokens_seconds: 4.0 }),
    ];
    const result = processDeliveredTps(rows, lookup);
    expect(result).toHaveLength(2);
    expect(result.map(r => r.transportProvider).sort()).toEqual(['direct', 'openrouter']);
  });

  test('empty input returns an empty row list, not an error', () => {
    expect(processDeliveredTps([], lookup)).toEqual([]);
  });

  test('rows missing provider or model are skipped', () => {
    const rows = [
      makeRow({ provider: '', time_to_64_visible_tokens_seconds: 2.0 }),
      makeRow({ model_name: '', time_to_64_visible_tokens_seconds: 2.0 }),
    ];
    expect(processDeliveredTps(rows, lookup)).toEqual([]);
  });
});
