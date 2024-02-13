import { calculateMean, bytesToGB, shuffleArray } from './dataUtils';
import extractModelSize from './extractModelSize';


export interface RawData {
    tokens_per_second: number[];
    gpu_mem_usage: number[];
    model_name: string;
    framework: string;
    quantization_method?: string;
    quantization_bits?: string;
    model_dtype: string;
}

export interface ProcessedData {
    id: number;
    framework: string;
    model_name: string;
    model_size: number;
    formatted_model_size: string;
    tokens_per_second: number;
    gpu_mem_usage: number;
    quantization_method: string;
    quantization_bits: string;
    model_dtype: string;
}

// Clean up and transform the local benchmarks data
export const cleanTransformLocal = (data: RawData[]): ProcessedData[] => {
    const dedupedBenchmarks = data.reduce<Record<string, ProcessedData>>((acc, benchmark, index) => {
        if (benchmark.tokens_per_second.length > 0 && benchmark.gpu_mem_usage.length > 0) {
            const key = `${benchmark.model_name}-${benchmark.framework}-${benchmark.quantization_method || "None"}-${benchmark.quantization_bits || "None"}-${benchmark.model_dtype}`;
            const modelSize = extractModelSize(benchmark.model_name);
            const tokensPerSecond = calculateMean(benchmark.tokens_per_second as number[]);
            const gpuMemUsage = bytesToGB(calculateMean(benchmark.gpu_mem_usage as number[]) || 0);
            if (!acc[key]) {
                acc[key] = {
                    id: index,
                    framework: benchmark.framework,
                    model_name: benchmark.model_name,
                    model_size: modelSize,
                    formatted_model_size: modelSize ? modelSize.toLocaleString() : "N/A",
                    tokens_per_second: tokensPerSecond,
                    gpu_mem_usage: gpuMemUsage,
                    quantization_method: benchmark.quantization_method && benchmark.quantization_method !== "unknown" ? benchmark.quantization_method : "None",
                    quantization_bits: benchmark.quantization_bits && benchmark.quantization_bits !== "unknown" ? benchmark.quantization_bits : "None",
                    model_dtype: benchmark.model_dtype
                };
            } else {
                acc[key].tokens_per_second = Math.max(acc[key].tokens_per_second, tokensPerSecond);
                acc[key].gpu_mem_usage = Math.max(acc[key].gpu_mem_usage, gpuMemUsage);
                acc[key].model_size = Math.max(acc[key].model_size, modelSize);
            }
        }
        return acc;
    }, {});

    const finalData = Object.values(dedupedBenchmarks).map(benchmark => ({
        ...benchmark,
        tokens_per_second: parseFloat(benchmark.tokens_per_second.toString()),
        gpu_mem_usage: parseFloat(benchmark.gpu_mem_usage.toString()),
    }));

    return shuffleArray(finalData);

};