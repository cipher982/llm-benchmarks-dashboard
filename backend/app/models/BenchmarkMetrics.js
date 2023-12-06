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
  output_tokens: [Number],
  tokens_per_second: [Number],
});

const CloudMetrics = mongoose.model("metrics_cloud", CloudSchema);

module.exports = { LocalMetrics, CloudMetrics };