export type ManualBenchmarkJob = {
  _id: string;
  provider: string;
  model_id: string;
  status: 'queued';
  priority: number;
  attempt: number;
  max_attempts: number;
  deadline_seconds: number;
  not_before: Date;
  created_at: Date;
  updated_at: Date;
  started_at: null;
  lease_expires_at: null;
  worker_id: null;
  last_attempt_error_kind: null;
  last_attempt_error_message: null;
  job_kind: 'manual';
  requested_by: string;
  source: 'dashboard_model_review';
};

export function manualBenchmarkJobId(provider: string, modelId: string, now: Date): string {
  const timestamp = now.toISOString().replace(/[-:.]/g, '').replace('Z', '000Z');
  return `manual:${provider}:${modelId}:${timestamp}`;
}

export function buildManualBenchmarkJob({
  provider,
  modelId,
  now,
  requestedBy = 'dashboard',
}: {
  provider: string;
  modelId: string;
  now: Date;
  requestedBy?: string;
}): ManualBenchmarkJob {
  return {
    _id: manualBenchmarkJobId(provider, modelId, now),
    provider,
    model_id: modelId,
    status: 'queued',
    priority: 10000,
    attempt: 0,
    max_attempts: 3,
    deadline_seconds: 240,
    not_before: now,
    created_at: now,
    updated_at: now,
    started_at: null,
    lease_expires_at: null,
    worker_id: null,
    last_attempt_error_kind: null,
    last_attempt_error_message: null,
    job_kind: 'manual',
    requested_by: requestedBy,
    source: 'dashboard_model_review',
  };
}
