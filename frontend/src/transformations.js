// transformations.js
import { calculateMean, calculateMin, calculateMax, calculateQuartiles, bytesToGB } from './utils';


// Clean up and transform the local benchmarks data
export const cleanTransformLocal = (data) => {
    // Combine filtering, mapping, and deduplication into a single step for efficiency and conciseness
    const dedupedBenchmarks = data.reduce((acc, benchmark, index) => {
        if (benchmark.tokens_per_second.length > 0 && benchmark.gpu_mem_usage.length > 0) {
            const key = `${benchmark.model_name}-${benchmark.framework}-${benchmark.quantization_method || "None"}-${benchmark.quantization_bits || "None"}-${benchmark.model_dtype}`;
            const modelSize = benchmark.model_size;
            const tokensPerSecond = parseFloat(calculateMean(benchmark.tokens_per_second));
            const gpuMemUsage = parseFloat(bytesToGB(calculateMean(benchmark.gpu_mem_usage)));

            // Update the benchmark if it exists, else create a new entry
            if (!acc[key]) {
                acc[key] = {
                    id: index,
                    framework: benchmark.framework,
                    model_name: benchmark.model_name,
                    model_size: modelSize,
                    formatted_model_size: modelSize ? modelSize.toLocaleString() : "N/A",
                    tokens_per_second: tokensPerSecond,
                    gpu_mem_usage: gpuMemUsage,
                    quantization_method: benchmark.quantization_method !== "unknown" ? benchmark.quantization_method : "None",
                    quantization_bits: benchmark.quantization_bits !== "unknown" ? benchmark.quantization_bits : "None",
                    model_dtype: benchmark.model_dtype
                };
            } else {
                // Update existing entry with max values
                acc[key].tokens_per_second = Math.max(acc[key].tokens_per_second, tokensPerSecond);
                acc[key].gpu_mem_usage = Math.max(acc[key].gpu_mem_usage, gpuMemUsage);
                acc[key].model_size = Math.max(acc[key].model_size, modelSize);
            }
        }
        return acc;
    }, {});

    // Convert the deduplicated benchmarks into an array for the final output
    return Object.values(dedupedBenchmarks).map(benchmark => ({
        ...benchmark,
        tokens_per_second: parseFloat(benchmark.tokens_per_second),
        gpu_mem_usage: parseFloat(benchmark.gpu_mem_usage),
    }));
};


// Clean up and transform the cloud benchmarks data
export const aggregateAndCalcMetrics = (data, fields = ['tokens_per_second', 'time_to_first_token']) => {
    // Step 1: Filter and transform the data
    const transformedBenchmarks = data
        .filter(benchmark => fields.every(field => benchmark[field] > 0))
        .map((benchmark, index) => {
            let transformedBenchmark = {
                id: index,
                provider: benchmark.provider,
                model_name: benchmark.model_name,
            };
            fields.forEach(field => {
                transformedBenchmark[field] = [benchmark[field]]; // Initialize as an array
            });
            return transformedBenchmark;
        });

    // Step 2: Aggregate benchmarks by model_name and provider
    const aggregatedBenchmarks = transformedBenchmarks.reduce((acc, curr) => {
        const key = `${curr.model_name}-${curr.provider}`;
        if (!acc[key]) {
            acc[key] = { ...curr };
        } else {
            fields.forEach(field => {
                acc[key][field] = acc[key][field].concat(curr[field]); // Update this line
            });
        }
        return acc;
    }, {});

    // Step 3: Calculate statistics and final transformation
    const finalBenchmarks = Object.values(aggregatedBenchmarks).map(benchmark => {
        let finalBenchmark = { ...benchmark };
        fields.forEach(field => {
            let values = benchmark[field];
            values.sort((a, b) => a - b);
            if (values.length > 5) {
                values.pop();
                values.shift();
            }
            finalBenchmark[`${field}_mean`] = parseFloat(calculateMean(values).toFixed(2));
            finalBenchmark[`${field}_min`] = parseFloat(calculateMin(values).toFixed(2));
            finalBenchmark[`${field}_max`] = parseFloat(calculateMax(values).toFixed(2));
            finalBenchmark[`${field}_quartiles`] = calculateQuartiles(values).map(val => typeof val === 'number' ? parseFloat(val.toFixed(2)) : val);
        });
        return finalBenchmark;
    });

    return finalBenchmarks;
};


// Compare different frameworks based on their benchmarks.
export const compareFrameworks = (benchmarks) => {
    console.log("Starting compareFrameworks with benchmarks count:", benchmarks.length);
    const groupedBenchmarks = new Map();

    // Group benchmarks by model_name and quantization_bits
    benchmarks.forEach((benchmark) => {
        const key = `${benchmark.model_name}-${benchmark.quantization_bits}`;
        if (!groupedBenchmarks.has(key)) {
            groupedBenchmarks.set(key, []);
        }
        groupedBenchmarks.get(key).push(benchmark);
    });

    const comparisonResults = Array.from(groupedBenchmarks.values())
        .map(group => {
            let maxTokensPerSecond = 0;
            let fastestFramework = "";
            const comparison = {};

            group.forEach(benchmark => {
                comparison[benchmark.framework] = benchmark.tokens_per_second;
                if (benchmark.tokens_per_second > maxTokensPerSecond) {
                    maxTokensPerSecond = benchmark.tokens_per_second;
                    fastestFramework = benchmark.framework;
                }
            });

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

    console.log("Completed compareFrameworks with results count:", comparisonResults.length);
    return comparisonResults;
};


export const getComparisonAndFastestFrameworks = (benchmarks) => {

    // model mapping dictionary
    const modelMapping = {
        "llama-7B/ggml-model-f16.gguf": "llama-7B",
    };

    // First, standardize the model names
    benchmarks = benchmarks.map(benchmark => {
        const modelName = benchmark.model_name;
        if (modelMapping[modelName]) {
            benchmark.model_name = modelMapping[modelName];
        }
        return benchmark;
    });

    // Then, get the comparison results
    let comparisonResults = compareFrameworks(benchmarks);

    // Count the number of times each framework is the fastest
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

    // Round the comparison results to the nearest integer
    comparisonResults = comparisonResults.map(result => {
        const roundedComparison = {};
        for (const [framework, tokensPerSecond] of Object.entries(result.comparison)) {
            roundedComparison[framework] = Math.round(tokensPerSecond);
        }
        return { ...result, comparison: roundedComparison };
    });

    // Return both results
    return { comparisonResults, fastestFrameworks };
};


export const compareFastest7BModels = (benchmarks) => {
    // Group benchmarks by model_name
    const groupedBenchmarks = benchmarks.reduce((acc, curr) => {
        const key = curr.model_name;
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(curr);
        return acc;
    }, {});

    // Filter for models with '7b' in the name and calculate mean tokens/second
    const meanBenchmarks = Object.entries(groupedBenchmarks)
        .filter(([modelName]) => modelName.toLowerCase().includes('7b'))
        .map(([modelName, group]) => {
            const totalTokensPerSecond = group.reduce((total, benchmark) => total + benchmark.tokens_per_second, 0);
            const meanTokensPerSecond = totalTokensPerSecond / group.length;
            return {
                model_name: modelName,
                mean_tokens_per_second: meanTokensPerSecond
            };
        });

    // Find the model with the highest mean tokens/second
    let fastestModel = meanBenchmarks[0];
    for (let i = 1; i < meanBenchmarks.length; i++) {
        if (meanBenchmarks[i].mean_tokens_per_second > fastestModel.mean_tokens_per_second) {
            fastestModel = meanBenchmarks[i];
        }
    }

    return fastestModel;
};