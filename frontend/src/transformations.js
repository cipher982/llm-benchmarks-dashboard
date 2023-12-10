// transformations.js
import { calculateMean, calculateMin, calculateMax, calculateQuartiles, bytesToGB } from './utils';


// Clean up and transform the local benchmarks data
export const transformLocal = (data) => {
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


// Clean up and transform the cloud benchmarks data
export const transformCloud = (data) => {
    const transformedBenchmarks = data
        .filter(benchmark => benchmark.tokens_per_second.length > 0)
        .map((benchmark, index) => {
            return {
                id: index,
                provider: benchmark.provider,
                model_name: benchmark.model_name,
                tokens_per_second: parseFloat(calculateMean(benchmark.tokens_per_second)),
            };
        });

    const dedupedBenchmarks = transformedBenchmarks.reduce((acc, curr) => {
        const key = `${curr.model_name}-${curr.provider}`;
        if (acc[key]) {
            acc[key].tokens_per_second.push(curr.tokens_per_second);
        } else {
            acc[key] = { ...curr, tokens_per_second: [curr.tokens_per_second] };
        }
        return acc;
    }, {});

    const dedupedBenchmarksArray = Object.values(dedupedBenchmarks).map(benchmark => {
        let sortedTokensPerSecond = benchmark.tokens_per_second.sort((a, b) => a - b);
        if (sortedTokensPerSecond.length > 5) {
            sortedTokensPerSecond.pop();
            sortedTokensPerSecond.shift();
        }

        const tokensPerSecond = {
            mean: parseFloat(calculateMean(benchmark.tokens_per_second).toFixed(2)),
            min: parseFloat(calculateMin(benchmark.tokens_per_second).toFixed(2)),
            max: parseFloat(calculateMax(benchmark.tokens_per_second).toFixed(2)),
            quartiles: calculateQuartiles(benchmark.tokens_per_second).map(val => parseFloat(val.toFixed(2))),
        };
        return {
            ...benchmark,
            tokens_per_second_mean: tokensPerSecond.mean,
            tokens_per_second_min: tokensPerSecond.min,
            tokens_per_second_max: tokensPerSecond.max,
            tokens_per_second_quartiles: tokensPerSecond.quartiles,
        };
    });

    return dedupedBenchmarksArray;
};





// Compare different frameworks based on their benchmarks.
export const compareFrameworks = (benchmarks) => {
    // Group benchmarks by model_name and quantization_bits
    const groupedBenchmarks = benchmarks.reduce((acc, curr) => {
        const key = `${curr.model_name}-${curr.quantization_bits}`;
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(curr);
        return acc;
    }, {});

    // Compare tokens/second betwen frameworks
    const comparisonResults = Object.values(groupedBenchmarks)
        .map(group => {
            group.sort((a, b) => b.tokens_per_second - a.tokens_per_second);

            const comparison = group.reduce((acc, curr) => {
                acc[curr.framework] = curr.tokens_per_second;
                return acc;
            }, {});

            // Find the framework with the most tokens_per_second
            let fastestFramework = group[0].framework;
            let maxTokensPerSecond = group[0].tokens_per_second;
            for (let i = 1; i < group.length; i++) {
                if (group[i].tokens_per_second > maxTokensPerSecond) {
                    fastestFramework = group[i].framework;
                    maxTokensPerSecond = group[i].tokens_per_second;
                }
            }

            return {
                model_name: group[0].model_name,
                quantization_bits: group[0].quantization_bits,
                model_size: group[0].model_size,
                formatted_model_size: group[0].formatted_model_size,
                comparison,
                fastest_framework: fastestFramework
            };
        })
        .filter(result => Object.keys(result.comparison).length >= 3);

    return comparisonResults;
};

export const getComparisonAndFastestFrameworks = (benchmarks) => {
    // First, get the comparison results
    const comparisonResults = compareFrameworks(benchmarks);

    // Then, count the number of times each framework is the fastest
    let fastestFrameworks = comparisonResults.reduce((acc, curr) => {
        const framework = curr.fastest_framework;
        if (!acc[framework]) {
            acc[framework] = 1;
        } else {
            acc[framework]++;
        }
        return acc;
    }, {});

    // Convert the object to an array of tuples, sort it by values in descending order, and convert it back to an object
    fastestFrameworks = Object.entries(fastestFrameworks)
        .sort((a, b) => b[1] - a[1])
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

    // Return both results
    return { comparisonResults, fastestFrameworks };
};