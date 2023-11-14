import { calculateMean, bytesToGB } from './utils';

export const transformBenchmarks = (data) => {
    const transformedBenchmarks = data
        .filter(benchmark => benchmark.tokens_per_second.length > 0 && benchmark.gpu_mem_usage.length > 0)
        .map((benchmark, index) => {
            const rawModelSize = benchmark.model_size;
            return {
                id: index,
                framework: benchmark.framework,
                model_name: benchmark.model_name,
                model_size: rawModelSize,
                formatted_model_size: rawModelSize ? rawModelSize.toLocaleString() : "N/A",
                tokens_per_second: parseFloat(calculateMean(benchmark.tokens_per_second)),
                gpu_mem_usage: parseFloat(bytesToGB(calculateMean(benchmark.gpu_mem_usage))),
                quantization_bits: benchmark.quantization_bits && benchmark.quantization_bits !== "unknown" ? benchmark.quantization_bits : "None",
                model_dtype: benchmark.model_dtype
            };
        });

    const dedupedBenchmarks = transformedBenchmarks.reduce((acc, curr) => {
        const key = `${curr.model_name}-${curr.framework}-${curr.quantization_bits}-${curr.model_dtype}`;
        if (acc[key]) {
            acc[key].tokens_per_second = (acc[key].tokens_per_second + curr.tokens_per_second) / 2;
            acc[key].gpu_mem_usage = (acc[key].gpu_mem_usage + curr.gpu_mem_usage) / 2;
            acc[key].model_size = (acc[key].model_size + curr.model_size) / 2;
        } else {
            acc[key] = curr;
        }
        return acc;
    }, {});

    const dedupedBenchmarksArray = Object.values(dedupedBenchmarks).map(benchmark => ({
        ...benchmark,
        tokens_per_second: parseFloat(benchmark.tokens_per_second.toFixed(2)),
        gpu_mem_usage: parseFloat(benchmark.gpu_mem_usage.toFixed(2)),
    }));

    return dedupedBenchmarksArray;
};