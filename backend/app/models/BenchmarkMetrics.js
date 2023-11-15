const mongoose = require("mongoose");

const BenchmarkMetricsSchema = new mongoose.Schema({
  framework: String,
  model_name: String,
  quantization_method: String,
  quantization_bits: String,
  tokens_per_second: [Number],
  gpu_mem_usage: [Number],
  output_tokens: [Number],
  model_dtype: String,
});

const BenchmarkMetrics = mongoose.model("metrics_v2", BenchmarkMetricsSchema);
module.exports = BenchmarkMetrics;
