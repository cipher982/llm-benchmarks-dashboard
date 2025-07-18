import { LocalBenchmark } from '../types/LocalData';

interface ComparisonResult {
    model_name: string;
    quantization_bits: string;
    model_size?: number;
    formatted_model_size?: string;
    comparison: { [framework: string]: number };
    fastest_framework: string;
}

export interface FastestFrameworks {
    [framework: string]: number;
}

interface FastestModel {
    model_name: string;
    mean_tokens_per_second: number;
}

const standardizeModelNames = (benchmarks: LocalBenchmark[]): LocalBenchmark[] => {
    const modelMapping: Record<string, string> = {
        "llama-7B/ggml-model-f16.gguf": "llama-7B",
    };

    return benchmarks.map(benchmark => ({
        ...benchmark,
        model_name: modelMapping[benchmark.model_name] || benchmark.model_name,
    }));
};

const roundTokensPerSecond = (comparison: Record<string, number>): Record<string, number> => {
    return Object.entries(comparison).reduce((acc, [framework, tokensPerSecond]) => ({
        ...acc,
        [framework]: Math.round(tokensPerSecond),
    }), {});
};

// Compare different frameworks based on their benchmarks.
export const compareFrameworks = (benchmarks: LocalBenchmark[]): ComparisonResult[] => {
    const groupedBenchmarks = new Map<string, LocalBenchmark[]>();
    benchmarks.forEach((benchmark: any) => {
        const key = `${benchmark.model_name}-${benchmark.quantization_bits}`;
        if (!groupedBenchmarks.has(key)) {
            groupedBenchmarks.set(key, []);
        }
        groupedBenchmarks.get(key)?.push(benchmark);
    });

    const comparisonResults: ComparisonResult[] = Array.from(groupedBenchmarks.values())
        .map(group => {
            let maxTokensPerSecond = 0;
            let fastestFramework = "";
            const comparison: { [framework: string]: number } = {};

            group.forEach((benchmark: any) => {
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

export const getComparisonAndFastestFrameworks = (benchmarks: LocalBenchmark[]): { comparisonResults: ComparisonResult[], fastestFrameworks: FastestFrameworks } => {
    benchmarks = standardizeModelNames(benchmarks);
    let comparisonResults = compareFrameworks(benchmarks);

    let fastestFrameworks: FastestFrameworks = comparisonResults.reduce((acc: Record<string, number>, { fastest_framework }) => ({
        ...acc,
        [fastest_framework]: (acc[fastest_framework] || 0) + 1,
    }), {});

    fastestFrameworks = Object.fromEntries(Object.entries(fastestFrameworks).sort((a, b) => b[1] - a[1]));

    comparisonResults = comparisonResults.map(result => ({
        ...result,
        comparison: roundTokensPerSecond(result.comparison),
    }));

    return { comparisonResults, fastestFrameworks };
};



export const compareFastest7BModels = (benchmarks: LocalBenchmark[]): FastestModel => {
    // Group benchmarks by model_name
    const groupedBenchmarks: { [key: string]: LocalBenchmark[] } = benchmarks.reduce(
        (acc: { [key: string]: LocalBenchmark[] }, curr: LocalBenchmark) => {
            const key = curr.model_name;
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(curr);
            return acc;
        },
        {}
    );

    // Filter for models with '7b' in the name and calculate mean tokens/second
    const meanBenchmarks: FastestModel[] = Object.entries(groupedBenchmarks)
        .filter(([modelName]) => modelName.toLowerCase().includes('7b'))
        .map(([modelName, group]): FastestModel => {
            const totalTokensPerSecond = group.reduce((total, benchmark) => total + benchmark.tokens_per_second, 0);
            const meanTokensPerSecond = totalTokensPerSecond / group.length;
            return {
                model_name: modelName,
                mean_tokens_per_second: meanTokensPerSecond
            };
        });

    // Find the model with the highest mean tokens/second
    let fastestModel: FastestModel = meanBenchmarks[0];
    for (let i = 1; i < meanBenchmarks.length; i++) {
        if (meanBenchmarks[i].mean_tokens_per_second > fastestModel.mean_tokens_per_second) {
            fastestModel = meanBenchmarks[i];
        }
    }

    return fastestModel;
};