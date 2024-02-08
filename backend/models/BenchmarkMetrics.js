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

const LocalMetrics = mongoose.model("metrics_v2", LocalSchema);

const CloudSchema = new mongoose.Schema({
  provider: String,
  model_name: String,
  output_tokens: Number,
  tokens_per_second: Number,
  time_to_first_tokens: Number,
  times_between_tokens: [Number],
});

const CloudSchemaOld = new mongoose.Schema({
  provider: String,
  model_name: String,
  output_tokens: [Number],
  tokens_per_second: [Number],
});

const CloudMetrics = mongoose.model("metrics_cloud_v2", CloudSchema, "metrics_cloud_v2");
const CloudMetricsOld = mongoose.model("metrics_cloud", CloudSchemaOld, "metrics_cloud");

module.exports = { LocalMetrics, CloudMetrics, CloudMetricsOld };