const PROVIDER_DISPLAY_ALIASES: Record<string, string> = {
    vertex: "google",
};

export const getProviderDisplayName = (canonical: string): string => {
    if (!canonical) {
        return canonical;
    }
    return PROVIDER_DISPLAY_ALIASES[canonical] ?? canonical;
};

