jest.mock('../utils/connectToMongoDB', () => jest.fn().mockResolvedValue(true));

const { fetchLifecycleSummary, LifecycleStatusModel } = require('../utils/lifecycleSummary');

describe('fetchLifecycleSummary', () => {
  const sampleDocs = [
    {
      provider: 'openai',
      status: 'active',
      computed_at: new Date('2025-11-10T12:00:00Z'),
      reasons: ['Healthy'],
    },
    {
      provider: 'openai',
      status: 'stale',
      computed_at: new Date('2025-11-11T00:00:00Z'),
      reasons: ['Last success 70 days ago'],
    },
    {
      provider: 'vertex',
      status: 'likely_deprecated',
      computed_at: new Date('2025-11-11T01:00:00Z'),
      reasons: ['404 from provider'],
    },
  ];

  beforeEach(() => {
    jest.spyOn(LifecycleStatusModel, 'find').mockReturnValue({
      lean: jest.fn().mockResolvedValue(sampleDocs),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('excludes active status by default', async () => {
    const result = await fetchLifecycleSummary();

    const openaiRow = result.rows.find(row => row.provider === 'openai');
    expect(openaiRow).toBeDefined();
    expect(openaiRow.counts.active).toBeUndefined();
    expect(openaiRow.counts.stale).toBe(1);
    expect(openaiRow.flaggedTotal).toBe(1);
  });

  test('includes active status when requested', async () => {
    const result = await fetchLifecycleSummary({ includeActive: true });

    const openaiRow = result.rows.find(row => row.provider === 'openai');
    expect(openaiRow.counts.active).toBe(1);
    expect(openaiRow.total).toBe(2);
  });
});

