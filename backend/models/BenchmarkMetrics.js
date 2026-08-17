const mongoose = require("mongoose");

const LocalSchema = new mongoose.Schema({
  framework: String,
  model_name: String,
  quantization_method: String,
  quantization_bits: String,
  tokens_per_second: [Number],
  gpu_mem_usage: [Number],
  output_tokens: [Number],
  model_dtype: String,
});
const LocalMetrics = mongoose.models.metrics_v2 || mongoose.model("metrics_v2", LocalSchema, "metrics_v2");

const CloudSchema = new mongoose.Schema({
  provider: String,
  source_provider: String,
  source_model_id: String,
  transport_provider: { type: String, default: "direct" },
  transport_model_id: String,
  route_model_id: String,
  route_provider_slug: String,
  observed_provider: String,
  observed_provider_slug: String,
  // The exact endpoint a pinned run was routed to. Absent on rows produced
  // before endpoint identity, which is precisely what marks them unpinned.
  route_endpoint_tag: String,
  // Weight quantization of that endpoint. gpt-oss-120b is served at fp4 and at
  // bf16; those are different artifacts and do not share a ranking axis.
  quantization: String,
  // Whether the stream's deltas were fine-grained enough to time generation at
  // all. Cerebras returned 256 tokens in 13 chunks, which yields a throughput
  // number describing the socket rather than the model.
  stream_resolution: String,
  visible_stream_chunks: Number,
  max_tokens_per_chunk: Number,
  openrouter_response_id: String,
  route_policy: String,
  route_snapshot_at: String,
  route_probe_id: String,
  route_decision_version: String,
  route_canary_id: String,
  route_canary_state: String,
  route_canary_successes: Number,
  route_canary_required_successes: Number,
  transport_attempt: String,
  fallback_reason: String,
  route_reason: String,
  provider_metadata_verified: Boolean,
  route_state: String,
  model_name: String,
  output_tokens: Number,
  tokens_per_second: Number,
  time_to_first_token: Number,
  metrics_schema_version: Number,
  generated_output_tokens: Number,
  visible_output_tokens: Number,
  reasoning_tokens: Number,
  generated_tokens_per_second: Number,
  visible_tokens_per_second: Number,
  token_source: String,
  request_mode: String,
  ttft_available: Boolean,
  finish_reason: String,
  response_id: String,
  response_status: String,
  validation_policy: String,
  times_between_tokens: [Number],
});
const CloudMetrics = mongoose.models.metrics_cloud_v2 || mongoose.model("metrics_cloud_v2", CloudSchema, "metrics_cloud_v2");

const BenchModelHealthSchema = new mongoose.Schema({
  provider: String,
  model_id: String,
  enabled: Boolean,
  cadence_seconds: Number,
  last_success_at: Date,
  last_attempt_at: Date,
  last_error_at: Date,
  last_error_kind: String,
  last_error_message: String,
  consecutive_failures: Number,
  successes_24h: Number,
  failures_24h: Number,
  deadline_misses_24h: Number,
  staleness_seconds: Number,
  freshness_status: String,
  updated_at: Date,
}, { collection: "bench_model_health" });
const BenchModelHealth = mongoose.models.bench_model_health ||
  mongoose.model("bench_model_health", BenchModelHealthSchema, "bench_model_health");

module.exports = { LocalMetrics, CloudMetrics, BenchModelHealth };
