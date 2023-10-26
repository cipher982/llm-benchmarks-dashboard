const mongoose = require("mongoose");

const BenchmarkMetricsSchema = new mongoose.Schema({
  model_name: String,
  tokens_per_second: [Number],
  gpu_mem_usage: [Number],
  output_tokens: [Number],
  quantization_bits: String,
  torch_dtype: String,
});

const BenchmarkMetrics = mongoose.model("benchmark_metrics", BenchmarkMetricsSchema);

module.exports = BenchmarkMetrics;
