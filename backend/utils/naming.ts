export const normalizeBedrockClaudeDisplayName = (modelName: string): string | undefined => {
    if (!modelName.startsWith('us.anthropic.') && !modelName.startsWith('anthropic.')) {
        return undefined;
    }

    const withoutProvider = modelName
        .replace(/^us\.anthropic\./, '')
        .replace(/^anthropic\./, '');

    const withoutCheckpoint = withoutProvider
        .replace(/-v\d+(?::\d+)?$/i, '')
        .replace(/-\d{8}$/i, '');

    return withoutCheckpoint.replace(
        /^claude-(opus|sonnet|haiku)-(\d+)-(\d+)($|-)/,
        'claude-$1-$2.$3$4'
    );
};

export const resolveDisplayFromHardcoded = ({
    modelCanonical,
    rawModelName,
    modelNameMapping,
}: {
    modelCanonical: string;
    rawModelName: string;
    modelNameMapping: Record<string, string>;
}): string => {
    return modelNameMapping[modelCanonical]
        || modelNameMapping[rawModelName]
        || normalizeBedrockClaudeDisplayName(modelCanonical)
        || normalizeBedrockClaudeDisplayName(rawModelName)
        || rawModelName;
};
