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
