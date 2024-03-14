import { CloudBenchmark } from '../types/CloudData';


export const mapModelNames = (data: CloudBenchmark[]): CloudBenchmark[] => {
    const modelNameMapping: { [key: string]: string } = {
        // llama 7b
        "meta-llama/Llama-2-7b-chat-hf": "llama-2-7b",
        "togethercomputer/llama-2-7b-chat": "llama-2-7b",
        "llama-2-7b-chat": "llama-2-7b",
        "llama2-7b-chat": "llama-2-7b",
        "accounts/fireworks/models/llama-v2-7b": "llama-2-7b",
        "accounts/fireworks/models/llama-v2-7b-chat": "llama-2-7b",

        // llama 13b
        "meta-llama/Llama-2-13b-chat-hf": "llama-2-13b",
        "togethercomputer/llama-2-13b-chat": "llama-2-13b",
        "llama-2-13b-chat": "llama-2-13b",
        "meta-llama/llama-2-13b-chat": "llama-2-13b",
        "llama2-13b-chat": "llama-2-13b",
        "accounts/fireworks/models/llama-v2-13b": "llama-2-13b",
        "accounts/fireworks/models/llama-v2-13b-chat": "llama-2-13b",
        "meta.llama2-13b-chat-v1": "llama-2-13b",

        // llama 34b - code
        "accounts/fireworks/models/llama-v2-34b-code": "llama-2-34b",
        "codellama/CodeLlama-34b-Instruct-hf": "llama-2-34b",
        "meta-llama/codellama-34b-instruct": "llama-2-34b",

        // llama 70b
        "meta-llama/Llama-2-70b-chat-hf": "llama-2-70b",
        "togethercomputer/llama-2-70b-chat": "llama-2-70b",
        "llama-2-70b-chat": "llama-2-70b",
        "meta-llama/llama-2-70b-chat": "llama-2-70b",
        "accounts/fireworks/models/llama-v2-70b": "llama-2-70b",
        "accounts/fireworks/models/llama-v2-70b-chat": "llama-2-70b",
        "meta.llama2-70b-chat-v1": "llama-2-70b",
        "llama2-70b-4096": "llama-2-70b",

        // mistral 7b
        "mistralai/Mistral-7B-Instruct-v0.2": "mistral-7b",
        "mistralai/Mistral-7B-Instruct-v0.1": "mistral-7b",
        "mistralai/mistral-7b-instruct": "mistral-7b",
        "accounts/fireworks/models/mistral-7b": "mistral-7b",
        "mistral.mistral-7b-instruct-v0:2": "mistral-7b",

        // mistral 8x7b
        "mistralai/Mixtral-8x7B-Instruct-v0.1": "mistral-8x7b",
        "mistralai/mixtral-8x7b-instruct": "mistral-8x7b",
        "accounts/fireworks/models/mixtral-8x7b": "mistral-8x7b",
        "accounts/fireworks/models/mixtral-8x7b-instruct": "mistral-8x7b",
        "mistral.mixtral-8x7b-instruct-v0:1": "mistral-8x7b",
        "mixtral-8x7b-32768": "mistral-8x7b",

        // mistral large
        "mistral-large": "mistral-large",

        // claude-instant
        "anthropic.claude-instant-v1": "claude-instant-1",
        "claude-instant-1.2": "claude-instant-1",
        "claude-instant-1": "claude-instant-1",

        // claude-1
        "anthropic.claude-v1": "claude-1",

        // claude-2
        "claude-2": "claude-2",
        "claude-2.1": "claude-2",
        "anthropic.claude-v2": "claude-2",
        "anthropic.claude-v2:1": "claude-2",

        // claude-3 haiku
        "claude-3-haiku-20240307": "claude-3-haiku",

        // claude-3 sonnet
        "claude-3-sonnet-20240229": "claude-3-sonnet",
        "anthropic.claude-3-sonnet-20240229-v1:0": "claude-3-sonnet",

        // claude-3 opus
        "claude-3-opus-20240229": "claude-3-opus",

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

        // phi-2
        "microsoft/phi-2": "phi-2",

        // qwen 1.5 7b
        "Qwen/Qwen1.5-7B-Chat": "qwen-1.5-7b",

        // qwen 1.5 14b
        "Qwen/Qwen1.5-14B-Chat": "qwen-1.5-14b",

        // qwen 1.5 72b
        "Qwen/Qwen1.5-72B-Chat": "qwen-1.5-72b",

        // yi 34b
        "01-ai/yi-34b-chat": "yi-34b",
        "zero-one-ai/Yi-34B-Chat": "yi-34b",
    };

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
            mergedItem.time_to_first_token.push(...item.time_to_first_token);
            mergedItem.tokens_per_second_mean += item.tokens_per_second_mean;
            mergedItem.tokens_per_second_min = Math.min(mergedItem.tokens_per_second_min, item.tokens_per_second_min);
            mergedItem.tokens_per_second_max = Math.max(mergedItem.tokens_per_second_max, item.tokens_per_second_max);
            mergedItem.time_to_first_token_mean += item.time_to_first_token_mean;
            mergedItem.time_to_first_token_min = Math.min(mergedItem.time_to_first_token_min, item.time_to_first_token_min);
            mergedItem.time_to_first_token_max = Math.max(mergedItem.time_to_first_token_max, item.time_to_first_token_max);
        });

        mergedItem.tokens_per_second_mean /= items.length;
        mergedItem.time_to_first_token_mean /= items.length;

        return mergedItem;
    });

    return mergedData;
};