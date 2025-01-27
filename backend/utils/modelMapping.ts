import { CloudBenchmark } from '../types/CloudData';


export const mapModelNames = (data: CloudBenchmark[]): CloudBenchmark[] => {
    const modelNameMapping: { [key: string]: string } = {
        // llama 2 7b
        "meta-llama/Llama-2-7b-chat-hf": "llama-2-7b",
        "togethercomputer/llama-2-7b-chat": "llama-2-7b",
        "llama-2-7b-chat": "llama-2-7b",
        "llama2-7b-chat": "llama-2-7b",
        "accounts/fireworks/models/llama-v2-7b": "llama-2-7b",
        "accounts/fireworks/models/llama-v2-7b-chat": "llama-2-7b",
        "meta-llama/Llama-2-7b-hf": "llama-2-7b",

        // llama 2 13b
        "meta-llama/Llama-2-13b-chat-hf": "llama-2-13b",
        "togethercomputer/llama-2-13b-chat": "llama-2-13b",
        "llama-2-13b-chat": "llama-2-13b",
        "meta-llama/llama-2-13b-chat": "llama-2-13b",
        "llama2-13b-chat": "llama-2-13b",
        "accounts/fireworks/models/llama-v2-13b": "llama-2-13b",
        "accounts/fireworks/models/llama-v2-13b-chat": "llama-2-13b",
        "meta.llama2-13b-chat-v1:0": "llama-2-13b",
        "meta-llama/Llama-2-13b-hf": "llama-2-13b",

        // llama 2 34b - code
        "accounts/fireworks/models/llama-v2-34b-code": "llama-2-34b",
        "codellama/CodeLlama-34b-Instruct-hf": "llama-2-34b",
        "meta-llama/codellama-34b-instruct": "llama-2-34b",

        // llama 2 70b
        "meta-llama/Llama-2-70b-chat-hf": "llama-2-70b",
        "togethercomputer/llama-2-70b-chat": "llama-2-70b",
        "llama-2-70b-chat": "llama-2-70b",
        "meta-llama/llama-2-70b-chat": "llama-2-70b",
        "accounts/fireworks/models/llama-v2-70b": "llama-2-70b",
        "accounts/fireworks/models/llama-v2-70b-chat": "llama-2-70b",
        "meta.llama2-70b-chat-v1:0": "llama-2-70b",
        "llama2-70b-4096": "llama-2-70b",
        "meta-llama/Llama-2-70b-hf": "llama-2-70b",

        // llama 3 8b
        "meta-llama/Meta-Llama-3-8B": "llama-3-8b",
        "accounts/fireworks/models/llama-v3-8b-instruct": "llama-3-8b",
        "accounts/fireworks/models/llama-v3-8b-instruct-hf": "llama-3-8b",
        "meta.llama3-8b-instruct-v1:0": "llama-3-8b",
        "llama3-8b-8192": "llama-3-8b",
        "meta-llama/Meta-Llama-3-8B-Instruct": "llama-3-8b",

        // llama 3 70b
        "meta-llama/Meta-Llama-3-70B-Instruct": "llama-3-70b",
        "meta-llama/Meta-Llama-3-70B": "llama-3-70b",
        "accounts/fireworks/models/llama-v3-70b-instruct": "llama-3-70b",
        "accounts/fireworks/models/llama-v3-70b-instruct-hf": "llama-3-70b",
        "meta.llama3-70b-instruct-v1:0": "llama-3-70b",
        "llama3-70b-8192": "llama-3-70b",

        // llama 3.1 8b
        "meta.llama3-1-8b-instruct-v1:0": "llama-3.1-8b",
        "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo": "llama-3.1-8b",
        "accounts/fireworks/models/llama-v3p1-8b-instruct": "llama-3.1-8b",
        "llama-3.1-8b-instant": "llama-3.1-8b",
        "meta-llama/Meta-Llama-3.1-8B-Instruct": "llama-3.1-8b",
        "llama3.1-8b-instruct": "llama-3.1-8b",

        // llama 3.1 70b
        "meta.llama3-1-70b-instruct-v1:0": "llama-3.1-70b",
        "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo": "llama-3.1-70b",
        "accounts/fireworks/models/llama-v3p1-70b-instruct": "llama-3.1-70b",
        "llama-3.1-70b-versatile": "llama-3.1-70b",
        "meta-llama/Meta-Llama-3.1-70B-Instruct": "llama-3.1-70b",
        "llama3.1-70b-instruct-fp8": "llama-3.1-70b",

        // llama 3.1 405b
        "meta.llama3-1-405b-instruct-v1:0": "llama-3.1-405b",
        "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo": "llama-3.1-405b",
        "accounts/fireworks/models/llama-v3p1-405b-instruct": "llama-3.1-405b",
        "meta-llama/Meta-Llama-3.1-405B-Instruct": "llama-3.1-405b",
        "llama3.1-405b-instruct-fp8": "llama-3.1-405b",

        // llama 3.2 1b
        "us.meta.llama3-2-1b-instruct-v1:0": "llama-3.2-1b",
        "meta-llama/Llama-Vision-Free": "llama-3.2-1b",
        "meta-llama/Llama-3.2-1B-Instruct": "llama-3.2-1b",
        "llama-3.2-1b-preview": "llama-3.2-1b",
        "accounts/fireworks/models/llama-v3p2-1b-instruct": "llama-3.2-1b",

        // llama 3.2 3b
        "us.meta.llama3-2-3b-instruct-v1:0": "llama-3.2-3b",
        "meta-llama/Llama-3.2-3B-Instruct-Turbo": "llama-3.2-3b",
        "meta-llama/Llama-3.2-3B-Instruct": "llama-3.2-3b",
        "llama-3.2-3b-preview": "llama-3.2-3b",
        "accounts/fireworks/models/llama-v3p2-3b-instruct": "llama-3.2-3b",
        "llama3.2-3b-instruct": "llama-3.2-3b",

        // llama 3.2 11b
        "us.meta.llama3-2-11b-instruct-v1:0": "llama-3.2-11b",
        "meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo": "llama-3.2-11b",
        "meta-llama/Llama-3.2-11B-Vision-Instruct": "llama-3.2-11b",
        "llama-3.2-11b-text-preview": "llama-3.2-11b",
        "accounts/fireworks/models/llama-v3p2-11b-vision-instruct": "llama-3.2-11b",

        // llama 3.2 90b
        "us.meta.llama3-2-90b-instruct-v1:0": "llama-3.2-90b",
        "meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo": "llama-3.2-90b",
        "meta-llama/Llama-3.2-90B-Vision-Instruct": "llama-3.2-90b",
        "llama-3.2-90b-text-preview": "llama-3.2-90b",
        "accounts/fireworks/models/llama-v3p2-90b-vision-instruct": "llama-3.2-90b",
        "meta/llama-3.2-90b-vision-instruct-maas": "llama-3.2-90b",

        // mistral 7b
        "mistralai/Mistral-7B-Instruct-v0.2": "mistral-7b",
        "mistralai/Mistral-7B-Instruct-v0.1": "mistral-7b",
        "mistralai/mistral-7b-instruct": "mistral-7b",
        "accounts/fireworks/models/mistral-7b": "mistral-7b",
        "mistral.mistral-7b-instruct-v0:2": "mistral-7b",
        "mistralai/Mistral-7B-Instruct-v0.3": "mistral-7b",

        // mistral 8x7b
        "mistralai/Mixtral-8x7B-Instruct-v0.1": "mistral-8x7b",
        "mistralai/mixtral-8x7b-instruct": "mistral-8x7b",
        "accounts/fireworks/models/mixtral-8x7b": "mistral-8x7b",
        "accounts/fireworks/models/mixtral-8x7b-instruct": "mistral-8x7b",
        "mistral.mixtral-8x7b-instruct-v0:1": "mistral-8x7b",
        "mixtral-8x7b-32768": "mistral-8x7b",
        "accounts/fireworks/models/mixtral-8x7b-instruct-hf": "mistral-8x7b",

        // mistral small
        "mistral.mistral-small-2402-v1:0": "mistral-small",

        // mistral large
        "mistral-large": "mistral-large",
        "mistral.mistral-large-2402-v1:0": "mistral-large",
        "mistral.mistral-large-2402-v1:1": "mistral-large",

        // mistral 8x22b
        "mistralai/Mixtral-8x22B": "mistral-8x22b",
        "mistralai/Mixtral-8x22B-Instruct-v0.1": "mistral-8x22b",
        "accounts/fireworks/models/mixtral-8x22b-instruct": "mistral-8x22b",
        
        // claude-instant
        "anthropic.claude-instant-v1": "claude-instant-1",
        "claude-instant-1.2": "claude-instant-1",
        "claude-instant-1": "claude-instant-1",

        // claude-1
        // "anthropic.claude-v1": "claude-1",

        // claude-2
        "claude-2": "claude-2",
        "claude-2.1": "claude-2",
        // "anthropic.claude-v2": "claude-2",
        "anthropic.claude-v2:1": "claude-2",

        // claude-3 haiku
        "claude-3-haiku-20240307": "claude-3-haiku",
        "anthropic.claude-3-haiku-20240307-v1:0": "claude-3-haiku",
        "claude-3-haiku@20240307": "claude-3-haiku",

        // claude-3 sonnet
        "claude-3-sonnet-20240229": "claude-3-sonnet",
        "anthropic.claude-3-sonnet-20240229-v1:0": "claude-3-sonnet",
        "claude-3-sonnet@20240229": "claude-3-sonnet",

        // claude-3 opus
        "claude-3-opus-20240229": "claude-3-opus",
        "claude-3-opus@20240229": "claude-3-opus",
        "anthropic.claude-3-opus-20240229-v1:0": "claude-3-opus",
        "us.anthropic.claude-3-opus-20240229-v1:0": "claude-3-opus",

        // claude-3.5 haiku
        "us.anthropic.claude-3-5-haiku-20241022-v1:0": "claude-3-5-haiku",
        "claude-3-5-haiku-20241022": "claude-3-5-haiku",

        // claude-3-5 sonnet
        "claude-3-5-sonnet-20240620": "claude-3-5-sonnet",
        "anthropic.claude-3-5-sonnet-20240620-v1:0": "claude-3-5-sonnet",
        "us.anthropic.claude-3-5-sonnet-20240620-v1:0": "claude-3-5-sonnet",
        "claude-3-5-sonnet@20240620": "claude-3-5-sonnet",

        // gpt-3.5
        "gpt-3.5-turbo-0613": "gpt-3.5-turbo",
        "gpt-3.5-turbo-16k-0613": "gpt-3.5-turbo",
        "gpt-3.5-turbo-16k": "gpt-3.5-turbo",
        "gpt-3.5-turbo": "gpt-3.5-turbo",
        "gpt-3.5-turbo-1106": "gpt-3.5-turbo",
        "gpt-3.5-turbo-0125": "gpt-3.5-turbo",

        // gpt-4
        "gpt-4-0613": "gpt-4",
        "gpt-4-0314": "gpt-4",

        // gpt-4-turbo
        "gpt-4-1106-preview": "gpt-4-turbo",
        "gpt-4-0125-preview": "gpt-4-turbo",
        "gpt-4-turbo-preview": "gpt-4-turbo",
        "gpt-4-turbo-2024-04-09": "gpt-4-turbo",

        // gpt-4o
        "gpt-4o": "gpt-4o",
        "gpt-4o-2024-05-13": "gpt-4o",
        "gpt-4o-2024-08-06": "gpt-4o",
        "gpt-4o-2024-11-20": "gpt-4o",

        // gpt-4o-mini
        "gpt-4o-mini": "gpt-4o-mini",
        "gpt-4o-mini-2024-07-18": "gpt-4o-mini",

        // gpt-4-vision
        "gpt-4-vision-preview": "gpt-4-vision",

        // falcon
        "togethercomputer/falcon-7b": "falcon-7b",
        "togethercomputer/falcon-40b": "falcon-40b",

        // gemma 2b
        "google/gemma-2b-it": "gemma-2b",

        // gemma 7b
        "google/gemma-7b-it": "gemma-7b",
        "gemma-7b-it": "gemma-7b",
        "accounts/fireworks/models/gemma-7b-it": "gemma-7b",

        // gemma 2 9b
        "google/gemma-2-9b-it": "gemma-2-9b",
        "accounts/fireworks/models/gemma2-9b-it": "gemma-2-9b",

        // gemma 2 27b
        "google/gemma-2-27b-it": "gemma-2-27b",

        // phi-2
        "microsoft/phi-2": "phi-2",

        // qwen 1.5 4b
        "Qwen/Qwen1.5-4B-Chat": "qwen-1.5-4b",

        // qwen 1.5 7b
        "Qwen/Qwen1.5-7B-Chat": "qwen-1.5-7b",

        // qwen 1.5 14b
        "Qwen/Qwen1.5-14B-Chat": "qwen-1.5-14b",
        "accounts/fireworks/models/qwen-14b-chat": "qwen-1.5-14b",

        // qwen 1.5 72b
        "Qwen/Qwen1.5-72B-Chat": "qwen-1.5-72b",
        "accounts/fireworks/models/qwen-72b-chat": "qwen-1.5-72b",

        // qwen 2 72b
        "accounts/fireworks/models/qwen2-72b-instruct": "qwen-2-72b",

        // qwen 2.5 7b
        "qwen/Qwen2.5-7B-Instruct-Turbo": "qwen-2.5-7b",

        // qwen 2.5 32b
        "accounts/fireworks/models/qwen2p5-coder-32b-instruct": "qwen-2.5-32b",

        // qwem 2.5 72b
        "Qwen/Qwen2.5-72B-Instruct": "qwen-2.5-72b",
        "qwen/Qwen2.5-72B-Instruct-Turbo": "qwen-2.5-72b",
        "accounts/fireworks/models/qwen2p5-72b-instruct": "qwen-2.5-72b",

        // yi 34b
        "01-ai/yi-34b-chat": "yi-34b",
        "zero-one-ai/Yi-34B-Chat": "yi-34b",
        "accounts/fireworks/models/yi-34b-chat": "yi-34b",

        // yi large
        "accounts/yi-01-ai/models/yi-large": "yi-large",

        // dbrx
        "accounts/fireworks/models/dbrx-instruct": "dbrx",
        "databricks/dbrx-instruct": "dbrx",

        // cohere command r
        "cohere.command-r-v1:0": "cohere-cmd-r",

        // cohere command r plus
        "cohere-cmd-r-plus": "cohere-cmd-r-plus",
        "cohere.command-r-plus-v1:0": "cohere-cmd-r-plus",

        // gemini 1.0 pro
        // "gemini-pro",
        "gemini-1.0-pro": "gemini-1.0-pro",

        // gemini 1.5 pro
        "gemini-1.5-pro-preview-0409": "gemini-1.5-pro",
        "gemini-1.5-pro-001": "gemini-1.5-pro",

        // gemini 1.5 flash
        "gemini-1.5-flash-preview-0514": "gemini-1.5-flash",
        "gemini-1.5-flash-001": "gemini-1.5-flash",
        "gemini-1.5-flash-002": "gemini-1.5-flash",

        // google bison
        "text-bison@002": "google-bison",

        // starcoder 7b
        "accounts/fireworks/models/starcoder-7b": "starcoder-7b",

        // starcoder 16b
        "accounts/fireworks/models/starcoder-16b": "starcoder-16b",

        // Starcoder 2 15b
        "bigcode/starcoder2-15b": "starcoder-2-15b",

        // Amazon models
        "amazon.titan-tg1-large": "titan-tg1-large",
        "amazon.titan-text-lite-v1": "titan-text-lite",
        "amazon.titan-text-express-v1": "titan-text-express",

        "amazon.nova-pro-v1:0": "nova-pro",
        "amazon.nova-lite-v1:0": "nova-lite",
        "amazon.nova-micro-v1:0": "nova-micro",

        // deepseek 67b
        "deepseek-ai/deepseek-llm-67b-chat": "deepseek-67b",

        // deepseek v3
        "accounts/fireworks/models/deepseek-v3": "deepseek-v3",
        "deepseek-ai/DeepSeek-V3": "deepseek-v3",

        // deepseek r1
        "accounts/fireworks/models/deepseek-r1": "deepseek-r1",
        "deepseek-ai/DeepSeek-R1": "deepseek-r1",

    };

    data = data.filter(item => item.provider !== "openrouter");
    data = data.filter(item => item.model_name !== "anthropic.claude-v1" && item.model_name !== "anthropic.claude-v2");

    data.forEach(item => {
        if (item.provider === "vertex") {
            item.provider = "google";
        }
    });

    const groupedData: { [key: string]: CloudBenchmark[] } = {};

    data.forEach((item: CloudBenchmark) => {
        const mappedName = modelNameMapping[item.model_name] || item.model_name;
        const groupKey = `${item.provider}_${mappedName}`;
        if (!groupedData[groupKey]) {
            groupedData[groupKey] = [];
        }
        groupedData[groupKey].push(item);
    });

    const mergedData: CloudBenchmark[] = Object.entries(groupedData).map(([groupKey, items]) => {
        const [provider, modelName] = groupKey.split('_');
        const mergedItem: CloudBenchmark = {
            _id: items[0]._id,
            provider: provider,
            model_name: modelName,
            tokens_per_second: [],
            time_to_first_token: [],
            tokens_per_second_mean: 0,
            tokens_per_second_min: Infinity,
            tokens_per_second_max: -Infinity,
            tokens_per_second_quartiles: [0, 0, 0],
            time_to_first_token_mean: 0,
            time_to_first_token_min: Infinity,
            time_to_first_token_max: -Infinity,
            time_to_first_token_quartiles: [0, 0, 0],
        };

        items.forEach((item) => {
            mergedItem.tokens_per_second.push(...item.tokens_per_second);
            if (item.time_to_first_token) {
                mergedItem.time_to_first_token!.push(...item.time_to_first_token);
            }
            mergedItem.tokens_per_second_mean += item.tokens_per_second_mean;
            mergedItem.tokens_per_second_min = Math.min(mergedItem.tokens_per_second_min, item.tokens_per_second_min);
            mergedItem.tokens_per_second_max = Math.max(mergedItem.tokens_per_second_max, item.tokens_per_second_max);
            mergedItem.time_to_first_token_mean += item.time_to_first_token_mean;
            
            // Safely handle optional time_to_first_token min/max values
            if (item.time_to_first_token_min !== undefined) {
                mergedItem.time_to_first_token_min = Math.min(
                    mergedItem.time_to_first_token_min ?? Infinity,
                    item.time_to_first_token_min
                );
            }
            if (item.time_to_first_token_max !== undefined) {
                mergedItem.time_to_first_token_max = Math.max(
                    mergedItem.time_to_first_token_max ?? -Infinity,
                    item.time_to_first_token_max
                );
            }
        });

        mergedItem.tokens_per_second_mean /= items.length;
        mergedItem.time_to_first_token_mean /= items.length;

        return mergedItem;
    });

    return mergedData;
};