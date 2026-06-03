const { buildManualBenchmarkJob, manualBenchmarkJobId } = require('../utils/modelReview/jobs');

describe('model review benchmark jobs', () => {
  test('builds scheduler-compatible manual benchmark job', () => {
    const now = new Date('2026-06-03T12:34:56.789Z');
    const job = buildManualBenchmarkJob({
      provider: 'openai',
      modelId: 'gpt-next',
      now,
      requestedBy: '127.0.0.1',
    });

    expect(job).toMatchObject({
      _id: 'manual:openai:gpt-next:20260603T123456789000Z',
      provider: 'openai',
      model_id: 'gpt-next',
      status: 'queued',
      priority: 10000,
      attempt: 0,
      max_attempts: 3,
      deadline_seconds: 240,
      job_kind: 'manual',
      requested_by: '127.0.0.1',
      source: 'dashboard_model_review',
    });
    expect(job.not_before).toBe(now);
    expect(job.created_at).toBe(now);
    expect(job.started_at).toBeNull();
    expect(job.lease_expires_at).toBeNull();
  });

  test('manual job ids include provider model and microsecond-compatible timestamp', () => {
    const now = new Date('2026-06-03T00:00:00.001Z');

    expect(manualBenchmarkJobId('anthropic', 'claude-next', now)).toBe(
      'manual:anthropic:claude-next:20260603T000000001000Z',
    );
  });
});
