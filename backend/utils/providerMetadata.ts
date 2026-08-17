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


// OpenRouter reports the upstream that actually served a request as a display
// string — "DeepInfra", "Amazon Bedrock", "Google AI Studio". Those have to
// land on the same canonical slugs the direct lanes use, or the same provider
// appears twice under two spellings.
//
// Most names normalise by lowercasing and dropping punctuation. These do not,
// and they are the ones that matter: a serving upstream that fails to map is a
// provider the site cannot compare against itself.
const OBSERVED_PROVIDER_ALIASES: Record<string, string> = {
    amazonbedrock: "bedrock",
    aws: "bedrock",
    googleaistudio: "google",
    googlevertex: "vertex",
    vertexai: "vertex",
    azureopenai: "azure",
};

/**
 * The provider a user should see credited for a measurement.
 *
 * OpenRouter is how the request was provisioned and billed; it is not who
 * served it, and it has no place in what the site displays. A row that says
 * `provider: "openrouter"` while carrying `observed_provider: "DeepInfra"` is a
 * DeepInfra measurement — the same measurement we would get calling DeepInfra
 * directly, and it belongs on the same line.
 */
export const resolveServingProvider = (row: {
    provider?: string;
    observed_provider?: string | null;
    observed_provider_slug?: string | null;
}): string => {
    const slug = (row.observed_provider_slug || "").trim().toLowerCase();
    if (slug) {
        return OBSERVED_PROVIDER_ALIASES[slug.replace(/[^a-z0-9]/g, "")] ?? slug;
    }
    const observed = (row.observed_provider || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (observed) {
        return OBSERVED_PROVIDER_ALIASES[observed] ?? observed;
    }
    return row.provider || "";
};
