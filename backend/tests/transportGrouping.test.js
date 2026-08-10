const { cleanTransformCloud } = require('../utils/processCloud');
const { groupAndMerge, getModelMetadataSync } = require('../utils/modelMappingDB');
const { processRawTableData } = require('../utils/dataProcessing');

const raw = (transport_provider, value) => ({
  _id: `${transport_provider}-${value}`,
  run_ts: '2026-08-09T00:00:00.000Z',
  model_name: 'Qwen/Qwen3-32B',
  temperature: 0.1,
  gen_ts: '2026-08-09T00:00:01.000Z',
  requested_tokens: 64,
  output_tokens: value,
  generate_time: 1,
  tokens_per_second: value,
  provider: 'deepinfra',
  transport_provider,
  streaming: true,
  time_to_first_token: 0.1,
});

describe('transport publication grouping', () => {
  test('direct and routed samples never share an aggregate', () => {
    const transformed = cleanTransformCloud([
      raw('direct', 40),
      raw('openrouter', 60),
    ]);
    const mapped = groupAndMerge(transformed, () => ({ display_name: 'qwen-3-32b' }));

    expect(mapped).toHaveLength(2);
    expect(mapped.map(item => item.transportProvider).sort()).toEqual(['direct', 'openrouter']);
    expect(mapped.map(item => item.provider).sort()).toEqual([
      'deepinfra',
      'deepinfra via OpenRouter',
    ]);
  });

  test('legacy rows without transport metadata remain direct', async () => {
    const transformed = cleanTransformCloud([raw(undefined, 40)]);
    const mapped = groupAndMerge(transformed, () => ({ display_name: 'qwen-3-32b' }));
    const table = await processRawTableData(mapped);

    expect(table).toHaveLength(1);
    expect(table[0].transportProvider).toBe('direct');
  });

  test('lifecycle metadata is isolated by transport', () => {
    const cache = {
      'deepinfra:Qwen/Qwen3-32B:direct': {
        display_name: 'qwen-3-32b',
        lifecycle: { status: 'active' },
      },
      'deepinfra:Qwen/Qwen3-32B:openrouter': {
        display_name: 'qwen-3-32b',
        lifecycle: { status: 'stale' },
      },
    };

    expect(getModelMetadataSync('deepinfra', 'Qwen/Qwen3-32B', 'direct', cache).lifecycle.status).toBe('active');
    expect(getModelMetadataSync('deepinfra', 'Qwen/Qwen3-32B', 'openrouter', cache).lifecycle.status).toBe('stale');
    expect(getModelMetadataSync('deepinfra', 'Qwen/Qwen3-32B', 'openrouter', {
      'deepinfra:Qwen/Qwen3-32B:direct': cache['deepinfra:Qwen/Qwen3-32B:direct'],
    }).lifecycle).toBeUndefined();
  });
});
