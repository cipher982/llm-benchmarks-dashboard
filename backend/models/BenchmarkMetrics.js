const mongoose = require("mongoose");

const BenchmarkMetricsSchema = new mongoose.Schema({
  model_name: String,
  tokens_per_second: Number,
});

const BenchmarkMetrics = mongoose.model("benchmark_metrics", BenchmarkMetricsSchema);

module.exports = BenchmarkMetrics;
