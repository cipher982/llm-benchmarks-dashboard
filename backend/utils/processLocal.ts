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
    // Check if data is valid
    if (!data || !Array.isArray(data) || data.length === 0) {
        console.warn('cleanTransformLocal received empty or invalid data');
        return [];
    }
    
    try {
        const dedupedBenchmarks = data.reduce<Record<string, ProcessedData>>((acc, benchmark, index) => {
            // Skip invalid entries
            if (!benchmark || typeof benchmark !== 'object') {
                return acc;
            }
            
            // Ensure tokens_per_second and gpu_mem_usage are valid arrays
            const tokensArray = Array.isArray(benchmark.tokens_per_second) ? benchmark.tokens_per_second : [];
            const memArray = Array.isArray(benchmark.gpu_mem_usage) ? benchmark.gpu_mem_usage : [];
            
            if (tokensArray.length > 0 && memArray.length > 0) {
                const modelName = benchmark.model_name || 'Unknown Model';
                const framework = benchmark.framework || 'Unknown Framework';
                const quantMethod = benchmark.quantization_method || 'None';
                const quantBits = benchmark.quantization_bits || 'None';
                const modelDtype = benchmark.model_dtype || 'Unknown';
                
                const key = `${modelName}-${framework}-${quantMethod}-${quantBits}-${modelDtype}`;
                const modelSize = extractModelSize(modelName);
                const tokensPerSecond = calculateMean(tokensArray);
                const gpuMemUsage = bytesToGB(calculateMean(memArray) || 0);
                
                if (!acc[key]) {
                    acc[key] = {
                        id: index,
                        framework,
                        model_name: modelName,
                        model_size: modelSize,
                        formatted_model_size: modelSize ? modelSize.toLocaleString() : "N/A",
                        tokens_per_second: tokensPerSecond,
                        gpu_mem_usage: gpuMemUsage,
                        quantization_method: quantMethod !== "unknown" ? quantMethod : "None",
                        quantization_bits: quantBits !== "unknown" ? quantBits : "None",
                        model_dtype: modelDtype
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
    } catch (error) {
        console.error('Error in cleanTransformLocal:', error);
        return [];
    }
};