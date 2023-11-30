// transformations.js
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
                quantization_method: benchmark.quantization_method && benchmark.quantization_method !== "unknown" ? benchmark.quantization_method : "None",
                quantization_bits: benchmark.quantization_bits && benchmark.quantization_bits !== "unknown" ? benchmark.quantization_bits : "None",
                model_dtype: benchmark.model_dtype
            };
        });

    const dedupedBenchmarks = transformedBenchmarks.reduce((acc, curr) => {
        const key = `${curr.model_name}-${curr.framework}-${curr.quantization_method}-${curr.quantization_bits}-${curr.model_dtype}`;
        if (acc[key]) {
            acc[key].tokens_per_second = Math.max(acc[key].tokens_per_second, curr.tokens_per_second);
            acc[key].gpu_mem_usage = Math.max(acc[key].gpu_mem_usage, curr.gpu_mem_usage);
            acc[key].model_size = Math.max(acc[key].model_size, curr.model_size);
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


// This function is used to compare different frameworks based on their benchmarks.
export const compareFrameworks = (benchmarks) => {
    const groupedBenchmarks = benchmarks.reduce((acc, curr) => {
        const key = `${curr.model_name}-${curr.quantization_bits}`;
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(curr);
        return acc;
    }, {});

    const comparisonResults = Object.values(groupedBenchmarks)
        .map(group => {
            group.sort((a, b) => a.framework.localeCompare(b.framework));

            const comparison = group.reduce((acc, curr) => {
                acc[curr.framework] = curr.tokens_per_second;
                return acc;
            }, {});
            return {
                model_name: group[0].model_name,
                quantization_bits: group[0].quantization_bits,
                model_size: group[0].model_size,
                formatted_model_size: group[0].formatted_model_size,
                comparison
            };
        })
        .filter(result => Object.keys(result.comparison).length >= 3);

    return comparisonResults;
};