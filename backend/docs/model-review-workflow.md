# Model Review Workflow

The model review workflow is the low-mental-load control surface for adding
new benchmark models.

## Product Contract

Sauron discovers candidate models and writes them to the `models` collection as
disabled review candidates. The dashboard presents those candidates once. David
approves or rejects each candidate with one click.

Approved models begin benchmark traffic. Rejected models remain tracked in the
catalog but do not run daily benchmarks and should not return as new candidates.

## States

```text
candidate -> approved -> benchmarking
          -> rejected -> tracked_only
```

`models` owns the state:

- `promotion_status: "candidate"` means waiting for dashboard review.
- `promotion_status: "approved"` means `enabled: true` and eligible for the
  scheduler.
- `promotion_status: "rejected"` means `enabled: false`; the model remains
  cataloged and suppressed from future discovery noise.

## Actions

### Approve

The dashboard `Approve` action:

1. Sets `models.enabled` to `true`.
2. Sets `models.deprecated` to `false`.
3. Sets `promotion_status` and `promotion_decision` to `approved`.
4. Clears any rejection metadata.
5. Inserts an immediate `bench_jobs` manual job for the provider/model.

The scheduler already loads only `enabled: true` and `deprecated != true`
models, so normal daily benchmarking follows automatically.

### Reject

The dashboard `Reject` action:

1. Sets `models.enabled` to `false`.
2. Sets `models.deprecated` to `false`.
3. Sets `promotion_status` and `promotion_decision` to `rejected`.
4. Stores rejection metadata.

The model stays in `models`, so discovery treats it as known and does not ask
again the next day.

## Email Role

The daily email should be a pointer and exception summary, not the workflow.
It can say how many models are waiting and link to `/admin/model-review`.

## Live End-to-End Success Criteria

The shipped workflow is complete when production verifies all of the following:

- Sauron or a live-equivalent seeded candidate creates a disabled candidate row.
- `/admin/model-review` shows that candidate.
- Approving the candidate sets `enabled: true`.
- Approving inserts a queued `bench_jobs` manual job.
- Rejecting a different candidate sets `enabled: false` and
  `promotion_status: rejected`.
- Rejected candidates do not appear in the pending queue afterward.
- The dashboard build passes and the production page/API respond successfully.
