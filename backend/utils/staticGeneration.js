const { CloudMetrics } = require('../models/BenchmarkMetrics');

// Enable TypeScript support for this file
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    moduleResolution: 'node',
    target: 'es2017',
    esModuleInterop: true,
    allowSyntheticDefaultImports: true
  }
});

const connectToMongoDB = require('./connectToMongoDB.ts').default;

// Direct MongoDB query for static file generation
async function generateRawData(days) {
  await connectToMongoDB();
  
  const dateFilter = new Date();
  dateFilter.setDate(dateFilter.getDate() - days);
  
  const rawMetrics = await CloudMetrics.find({ run_ts: { $gte: dateFilter } })
    .select("model_name provider tokens_per_second time_to_first_token run_ts display_name gpu_mem_usage framework quantization_method quantization_bits model_dtype")
    .lean()
    .exec();
  
  return rawMetrics;
}

module.exports = { generateRawData };