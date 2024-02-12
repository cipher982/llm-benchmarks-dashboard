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
  time_to_first_tokens: Number,
  times_between_tokens: [Number],
});
const CloudMetrics = mongoose.models.metrics_cloud_v2 || mongoose.model("metrics_cloud_v2", CloudSchema, "metrics_cloud_v2");

module.exports = { LocalMetrics, CloudMetrics };