interface ModelItem {
    model_name: string;
    [key: string]: any;
}

export const mapModelNames = (data: ModelItem[]): ModelItem[] => {
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

        // mistral 7b
        "mistralai/Mistral-7B-Instruct-v0.2": "mistral-7b",
        "mistralai/Mistral-7B-Instruct-v0.1": "mistral-7b",
        "mistralai/mistral-7b-instruct": "mistral-7b",
        "accounts/fireworks/models/mistral-7b": "mistral-7b",

        // mistral 8x7b
        "mistralai/Mixtral-8x7B-Instruct-v0.1": "mistral-8x7b",
        "mistralai/mixtral-8x7b-instruct": "mistral-8x7b",
        "accounts/fireworks/models/mixtral-8x7b": "mistral-8x7b",
        "accounts/fireworks/models/mixtral-8x7b-instruct": "mistral-8x7b",

        // claude-instant
        "anthropic.claude-instant-v1": "claude-instant-1",

        // claude-1
        "anthropic.claude-v1": "claude-1",

        // claude-2
        "claude-2": "claude-2",
        "claude-2.1": "claude-2",
        "anthropic.claude-v2": "claude-2",

        // claude-instant
        "claude-instant-1": "claude-instant-1",
        "claude-instant-1.2": "claude-instant-1",

        // gpt-3.5
        "gpt-3.5-turbo-0613": "gpt-3.5-turbo",

        // gpt-3.5-16k
        "gpt-3.5-turbo-16k-0613": "gpt-3.5-turbo-16k",

        // gpt-4
        "gpt-4-0613": "gpt-4",
        "gpt-4-0314": "gpt-4",

        // falcon
        "togethercomputer/falcon-7b": "falcon-7b",
        "togethercomputer/falcon-40b": "falcon-40b",
    };

    return data.map((item: ModelItem) => {
        if (modelNameMapping[item.model_name]) {
            return { ...item, model_name: modelNameMapping[item.model_name] };
        }
        return item;
    });
};