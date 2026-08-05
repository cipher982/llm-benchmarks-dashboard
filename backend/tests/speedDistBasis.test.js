/**
 * The distribution chart ranks models against each other, so every row on its
 * axis has to be the same quantity.
 *
 * It used to plot generated throughput for everything. That counts hidden
 * reasoning tokens, and models differ enormously in how many they emit: of 244
 * live models, 122 are >=95% visible, 57 hide between 30% and 85% of what they
 * generate, and 5 hide almost all of it. Ranking those together ranks a
 * thinking model by tokens the reader never sees.
 *
 * It surfaced as one model at 638 tok/s with the next at 225 —
 * GPT-oss-safeguard-20b, whose generated throughput is 2.2x its visible. It set
 * the scale for every other row while not being fast in the way the axis
 * claimed.
 *
 * The chart sits directly above a table that ranks on visible throughput, so
 * the two must agree or the page contradicts itself.
 */

const { processSpeedDistData, processRawTableData } = require('../utils/dataProcessing');

const benchmark = (overrides = {}) => ({
  provider: 'vertex',
  providerCanonical: 'vertex',
  providerSlug: 'vertex',
  model_name: 'gemini-2.5-flash',
  modelCanonical: 'gemini-2.5-flash',
  modelSlug: 'gemini-25-flash',
  display_name: 'gemini-2.5-flash',
  tokens_per_second: [55, 57, 56],
  generated_tokens_per_second: [55, 57, 56],
  generated_tokens_per_second_mean: 56,
  visible_tokens_per_second: [2.5, 2.6, 2.4],
  time_to_first_token: [0.3],
  time_to_first_token_mean: 0.3,
  tokens_per_second_mean: 2.5,
  tokens_per_second_min: 2.4,
  tokens_per_second_max: 2.6,
  throughput_basis: 'visible',
  ...overrides,
});

describe('speed distribution basis', () => {
  it('uses visible throughput when the provider reports it', async () => {
    const [row] = await processSpeedDistData([benchmark()]);
    // ~2.5, not ~56.
    expect(row.mean_tokens_per_second).toBeLessThan(10);
  });

  it('falls back to generated throughput when there is no visible figure', async () => {
    const [row] = await processSpeedDistData([
      benchmark({ visible_tokens_per_second: [] }),
    ]);
    expect(row.mean_tokens_per_second).toBeGreaterThan(50);
  });

  it('ranks a model the same way the table beneath it does', async () => {
    const data = [benchmark()];
    const [dist] = await processSpeedDistData(data.map((d) => ({ ...d })));
    const [tableRow] = await processRawTableData(data.map((d) => ({ ...d })));

    // The chart and the table are allowed to round differently; they are not
    // allowed to disagree about which quantity they are showing.
    expect(Math.abs(dist.mean_tokens_per_second - tableRow.tokens_per_second_mean)).toBeLessThan(1);
  });
});
