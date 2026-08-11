/**
 * Steady-state estimator math on synthetic data.
 *
 * Data is generated from the model the estimator assumes,
 * time = a + tokens / r, with deterministic noise so every run of the suite
 * sees identical inputs, and the bootstrap RNG is seeded so CIs are exact.
 */

const { estimateSteadyState, median } = require('../utils/steadyState');

// r = 100 tok/s (slope 0.01 s/token), a = 0.4 s floor.
const RATE = 100;
const FLOOR = 0.4;

// Deterministic multiplicative jitter in [-scale, +scale].
const jitter = (i, scale) => scale * Math.sin(i * 12.9898);

const makeSample = (tokens, i, noiseScale = 0.02) => ({
  generatedTokens: tokens,
  generateTimeSeconds: (FLOOR + tokens / RATE) * (1 + jitter(i, noiseScale)),
});

// shortCount 64-token runs + longCount 512-token runs.
const makeSamples = (shortCount, longCount, noiseScale = 0.02) => {
  const samples = [];
  for (let i = 0; i < shortCount; i++) samples.push(makeSample(64, i, noiseScale));
  for (let i = 0; i < longCount; i++) samples.push(makeSample(512, shortCount + i, noiseScale));
  return samples;
};

describe('median', () => {
  test('odd and even lengths', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});

describe('estimateSteadyState', () => {
  test('recovers known slope and intercept from clean data', () => {
    const result = estimateSteadyState(makeSamples(12, 6));

    expect(result.status).toBe('ok');
    expect(result.generationSpeed).toBeGreaterThan(RATE * 0.95);
    expect(result.generationSpeed).toBeLessThan(RATE * 1.05);
    expect(result.floorLatencySeconds).toBeGreaterThan(FLOOR * 0.85);
    expect(result.floorLatencySeconds).toBeLessThan(FLOOR * 1.15);
    expect(result.sampleCount).toBe(18);
    expect(result.longRunCount).toBe(6);
    expect(result.ci95[0]).toBeLessThanOrEqual(result.generationSpeed);
    expect(result.ci95[1]).toBeGreaterThanOrEqual(result.generationSpeed);
  });

  test('one wildly slow long run does not move the estimate (Theil-Sen robustness)', () => {
    const samples = makeSamples(16, 8);
    // A stall: one long run takes 5x as long as it should.
    samples[samples.length - 1].generateTimeSeconds *= 5;

    const result = estimateSteadyState(samples);

    expect(result.status).toBe('ok');
    expect(result.generationSpeed).toBeGreaterThan(RATE * 0.93);
    expect(result.generationSpeed).toBeLessThan(RATE * 1.07);
  });

  test('fewer than 4 long runs is insufficient-data', () => {
    const result = estimateSteadyState(makeSamples(20, 3));

    expect(result.status).toBe('insufficient-data');
    expect(result.reason).toBe('insufficient-long-runs');
    expect(result.generationSpeed).toBeUndefined();
    expect(result.longRunCount).toBe(3);
  });

  test('fewer than 12 total samples is insufficient-data', () => {
    const result = estimateSteadyState(makeSamples(5, 5));

    expect(result.status).toBe('insufficient-data');
    expect(result.reason).toBe('insufficient-samples');
    expect(result.sampleCount).toBe(10);
  });

  test('empty input is insufficient-data, not a throw', () => {
    const result = estimateSteadyState([]);

    expect(result.status).toBe('insufficient-data');
    expect(result.reason).toBe('insufficient-long-runs');
    expect(result.sampleCount).toBe(0);
  });

  test('no pair with enough token spread is insufficient-data', () => {
    // All long runs clustered at 500-520 tokens: counts pass, spread does not.
    const samples = [];
    for (let i = 0; i < 14; i++) samples.push(makeSample(500 + i, i));

    const result = estimateSteadyState(samples);

    expect(result.status).toBe('insufficient-data');
    expect(result.reason).toBe('no-token-spread');
  });

  test('very noisy data fails the CI publication gate as unstable', () => {
    const result = estimateSteadyState(makeSamples(12, 6, 0.6));

    expect(result.status).toBe('unstable');
    expect(result.reason).toBe('ci-width');
    // The caller can still see the (unpublishable) point estimate and CI.
    expect(result.generationSpeed).toBeGreaterThan(0);
    expect(result.ci95).toHaveLength(2);
  });

  test('bootstrap CI is deterministic for a given seed', () => {
    const samples = makeSamples(12, 6);
    const first = estimateSteadyState(samples, { seed: 7 });
    const second = estimateSteadyState(samples, { seed: 7 });

    expect(first.ci95).toEqual(second.ci95);
    expect(first.generationSpeed).toBe(second.generationSpeed);
  });

  test('invalid samples (non-positive, non-finite) are dropped, not fitted', () => {
    const samples = makeSamples(12, 6);
    samples.push(
      { generatedTokens: 0, generateTimeSeconds: 1 },
      { generatedTokens: 512, generateTimeSeconds: -1 },
      { generatedTokens: NaN, generateTimeSeconds: 1 },
    );

    const result = estimateSteadyState(samples);

    expect(result.status).toBe('ok');
    expect(result.sampleCount).toBe(18);
  });
});
