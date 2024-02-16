// Compare different frameworks based on their benchmarks.
export const compareFrameworks = (benchmarks) => {
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