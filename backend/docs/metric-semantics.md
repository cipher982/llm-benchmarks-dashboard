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
- Speed distribution uses the **same basis as the table** — visible throughput where the provider reports it, generated otherwise. It ranks models against each other and sits directly above that table, so every row on its axis has to be the same quantity and the two have to agree. Plotting generated throughput here ranked thinking models by tokens the reader never sees: of 244 live models 122 are >=95% visible while 5 hide almost everything they generate, and it put GPT-oss-safeguard-20b at 638 tok/s against a next-fastest of 225 purely because 54% of its output is hidden. Pinned by `tests/speedDistBasis.test.js`.
- Time-series values use generated throughput from `tokens_per_second`, deliberately. A line tracking one provider's serving performance over time is better served by the number that does not collapse to ~2 tok/s whenever the model thinks, and the chart makes no cross-model ranking claim. Pinned by `tests/timeseries.test.js`.
- The two charts therefore answer different questions and are labelled accordingly. A reasoning model legitimately shows ~2 tok/s in the distribution and the table, and ~55 in the time series.
- First-token latency is the first visible text token. Reasoning-only or thinking-only runs with no visible token are omitted from TTFT averages instead of being counted as immediate output.

## API Compatibility

No API migration is required for schema-v2 metrics. Existing clients can continue reading `tokens_per_second`; clients that need user-visible output speed should prefer table rows with `throughput_basis` or raw rows that include `visible_tokens_per_second`.
