jest.mock('../utils/connectToMongoDB', () => jest.fn().mockResolvedValue(true));

const aggregateMock = jest.fn();
const execMock = jest.fn();
const leanMock = jest.fn(() => ({ exec: execMock }));
const selectMock = jest.fn(() => ({ lean: leanMock }));
const findMock = jest.fn(() => ({ select: selectMock }));

jest.mock('../models/BenchmarkMetrics', () => ({
  CloudMetrics: {
    aggregate: aggregateMock,
    find: findMock,
  },
}));

const processAllMetricsMock = jest.fn();

jest.mock('../pages/api/processed', () => ({
  processAllMetrics: processAllMetricsMock,
}));

const oldCanonical = 'model-a-20250101';
const newCanonical = 'model-a-20250201';
const oldSlug = 'modela20250101';
const newSlug = 'modela20250201';

const inventoryRows = [
  {
    provider: 'bedrock',
    model: oldCanonical,
    catalogDisplayName: 'model-a',
    firstRunAt: new Date('2026-04-01T00:00:00Z'),
    latestRunAt: new Date('2026-04-10T00:00:00Z'),
  },
  {
    provider: 'bedrock',
    model: newCanonical,
    catalogDisplayName: 'model-a',
    firstRunAt: new Date('2026-05-01T00:00:00Z'),
    latestRunAt: new Date('2026-05-10T00:00:00Z'),
  },
  {
    provider: 'bedrock',
    model: 'model-b',
    catalogDisplayName: 'model-b',
    firstRunAt: new Date('2026-04-01T00:00:00Z'),
    latestRunAt: new Date('2026-05-10T00:00:00Z'),
  },
];

function resetMocks() {
  jest.clearAllMocks();
  aggregateMock.mockResolvedValue(inventoryRows);
  execMock.mockResolvedValue([
    { provider: 'bedrock', model_name: oldCanonical, run_ts: new Date('2026-05-09T00:00:00Z') },
    { provider: 'bedrock', model_name: newCanonical, run_ts: new Date('2026-05-10T00:00:00Z') },
  ]);
  processAllMetricsMock.mockResolvedValue({
    table: [{
      provider: 'bedrock',
      providerCanonical: 'bedrock',
      providerSlug: 'bedrock',
      model_name: 'model-a',
      modelCanonical: 'processor-selected-canonical',
      modelSlug: 'processorselectedcanonical',
      tokens_per_second_mean: 20,
      tokens_per_second_min: 10,
      tokens_per_second_max: 30,
      time_to_first_token_mean: 0.2,
    }],
    speedDistribution: [{
      provider: 'bedrock',
      model_name: 'model-a',
      display_name: 'model-a',
      mean_tokens_per_second: 20,
      min_tokens_per_second: 10,
      max_tokens_per_second: 30,
      density_points: [{ x: 20, y: 1 }],
    }],
    timeSeries: {
      timestamps: ['2026-05-10T00:00:00.000Z'],
      models: [{
        model_name: 'model-a',
        display_name: 'model-a',
        providers: [{ provider: 'bedrock', providerCanonical: 'bedrock', values: [20] }],
      }],
    },
  });
}

describe('modelService naming groups', () => {
  let modelService;

  beforeEach(() => {
    jest.resetModules();
    resetMocks();
    modelService = require('../utils/modelService');
    modelService.clearModelServiceCache();
  });

  test('dedupes inventory to one representative per provider display group', async () => {
    const inventory = await modelService.getProviderModelInventory();
    const displayNames = inventory.map((entry) => entry.displayName).sort();

    expect(displayNames).toEqual(['model-a', 'model-b']);

    const grouped = inventory.find((entry) => entry.displayName === 'model-a');
    expect(grouped.modelCanonical).toBe(oldCanonical);
    expect(grouped.modelSlug).toBe(oldSlug);
    expect(grouped.canonicalGroup).toEqual([oldCanonical, newCanonical]);
    expect(grouped.latestRunAt).toBe('2026-05-10T00:00:00.000Z');
  });

  test('static model paths use the stable representative slug', async () => {
    const paths = await modelService.getFeaturedStaticPaths();

    expect(paths).toContainEqual({ params: { provider: 'bedrock', model: oldSlug } });
    expect(paths).not.toContainEqual({ params: { provider: 'bedrock', model: newSlug } });
  });

  test('alias model slugs resolve to grouped page data and representative canonical URL data', async () => {
    const data = await modelService.getModelPageData('bedrock', newSlug);

    expect(data).toBeTruthy();
    expect(data.model).toBe('model-a');
    expect(data.displayName).toBe('model-a');
    expect(data.modelCanonical).toBe(oldCanonical);
    expect(data.modelSlug).toBe(oldSlug);
    expect(data.tableRows).toHaveLength(1);
    expect(data.speedDistribution.meanTokensPerSecond).toBe(20);
    expect(data.timeSeries.providers[0].values).toEqual([20]);
    expect(findMock).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'bedrock',
      model_name: { $in: [oldCanonical, newCanonical] },
    }));
  });

  test('representative model slug also resolves to grouped page data', async () => {
    const data = await modelService.getModelPageData('bedrock', oldSlug);

    expect(data).toBeTruthy();
    expect(data.model).toBe('model-a');
    expect(data.modelCanonical).toBe(oldCanonical);
    expect(data.modelSlug).toBe(oldSlug);
    expect(data.tableRows).toHaveLength(1);
  });
});
