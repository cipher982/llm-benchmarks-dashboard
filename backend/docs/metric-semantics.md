# Metric Semantics

The dashboard consumes schema-v2 cloud benchmark rows from `metrics_cloud_v2`. The runner keeps legacy fields for compatibility and adds explicit generated/visible throughput fields for reasoning and thinking models.

## Stored Metric Fields

| Field | Meaning |
|-------|---------|
| `output_tokens` | Backwards-compatible alias for generated output tokens. |
| `tokens_per_second` | Backwards-compatible alias for generated throughput. |
| `generated_output_tokens` | Provider-reported generated output tokens, including hidden reasoning/thinking tokens when available. |
| `visible_output_tokens` | User-visible output tokens when the provider exposes enough information to separate them. |
| `reasoning_tokens` | Hidden reasoning/thinking tokens when reported or inferable. |
| `generated_tokens_per_second` | Generated output throughput, including hidden reasoning/thinking tokens when available. |
| `visible_tokens_per_second` | User-visible output throughput when available. |
| `time_to_first_token` | Seconds until the first visible text token. If no visible text token arrives, this is `null`, not `0`. |
| `ttft_available` | Whether `time_to_first_token` is available for the run. |

## Dashboard Presentation

- Table throughput (`tokens_per_second_mean` in table rows) uses visible throughput when recent samples have `visible_tokens_per_second`; otherwise it falls back to legacy generated throughput.
- `generated_tokens_per_second_mean` is shown separately as generated average throughput.
- `throughput_basis` explains the table throughput source:
  - `visible`: table throughput is based on visible-token samples.
  - `mixed`: recent samples include both visible-token and legacy generated throughput.
  - `legacy`: visible throughput is unavailable, so table throughput uses generated throughput.
- Speed distribution and time-series chart values use generated throughput from `tokens_per_second`, so they reflect total generated work including reasoning/thinking tokens when available.
- First-token latency is the first visible text token. Reasoning-only or thinking-only runs with no visible token are omitted from TTFT averages instead of being counted as immediate output.

## API Compatibility

No API migration is required for schema-v2 metrics. Existing clients can continue reading `tokens_per_second`; clients that need user-visible output speed should prefer table rows with `throughput_basis` or raw rows that include `visible_tokens_per_second`.
