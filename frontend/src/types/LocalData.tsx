export interface LocalBenchmark {
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

export interface LocalBenchmarkProps { }