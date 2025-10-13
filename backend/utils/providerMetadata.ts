const PROVIDER_DISPLAY_ALIASES: Record<string, string> = {
    vertex: "google",
};

const PROVIDER_WEBSITES: Record<string, string> = {
    anthropic: "https://www.anthropic.com",
    openai: "https://openai.com",
    vertex: "https://cloud.google.com/vertex-ai",
    google: "https://cloud.google.com/vertex-ai",
    azure: "https://azure.microsoft.com/en-us/products/ai-services/openai-service",
    fireworks: "https://fireworks.ai",
    groq: "https://groq.com",
    together: "https://www.together.ai",
    anyscale: "https://www.anyscale.com",
    deepseek: "https://deepseeks.ai",
    perplexity: "https://www.perplexity.ai",
    cohere: "https://cohere.com",
    mistral: "https://mistral.ai",
    cerebras: "https://www.cerebras.ai",
    deepinfra: "https://deepinfra.com",
    replicate: "https://replicate.com",
    huggingface: "https://huggingface.co",
};

export const getProviderDisplayName = (canonical: string): string => {
    if (!canonical) {
        return canonical;
    }
    return PROVIDER_DISPLAY_ALIASES[canonical] ?? canonical;
};

export const getProviderWebsite = (canonical: string): string | undefined => {
    if (!canonical) {
        return undefined;
    }
    return PROVIDER_WEBSITES[canonical.toLowerCase()];
};

