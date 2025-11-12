/**
 * Status Page Helper Utilities
 *
 * Pure functions for data transformation and formatting in the status page.
 * These helpers are stateless and can be easily unit tested.
 */

/**
 * ModelData interface matching the API response structure
 */
export interface ModelData {
    provider: string;
    model: string;
    last_run_timestamp: string | null;
    last_run_relative: string;
    runs: boolean[];
    status: 'healthy' | 'warning' | 'deprecated' | 'disabled';
    warnings: string[];
    enabled?: boolean;
    deprecated?: boolean;
    deprecation_date?: string;
    successor_model?: string;
    disabled_reason?: string;
}

/**
 * Format a warning code into a human-readable label with emoji
 *
 * @param warning - Warning code from API (e.g., "stale_3d", "failures_5")
 * @returns Formatted warning label with emoji
 *
 * @example
 * formatWarningLabel("stale_3d") // "⚠️ Stale (3d)"
 * formatWarningLabel("failures_5") // "⚠️ 5 failures"
 */
export function formatWarningLabel(warning: string): string {
    if (warning.startsWith('stale')) {
        return `⚠️ Stale (${warning.split('_')[1]})`;
    }
    if (warning.startsWith('infrequent')) {
        return `⚠️ Infrequent (${warning.split('_')[1]})`;
    }
    if (warning.startsWith('failures')) {
        return `⚠️ ${warning.split('_')[1]} failures`;
    }
    return warning;
}

/**
 * Group an array of models by their provider
 *
 * @param models - Array of model data
 * @returns Object mapping provider names to arrays of their models
 *
 * @example
 * const models = [
 *   { provider: 'openai', model: 'gpt-4', ... },
 *   { provider: 'openai', model: 'gpt-3.5-turbo', ... },
 *   { provider: 'anthropic', model: 'claude-3-opus', ... }
 * ];
 * groupModelsByProvider(models);
 * // {
 * //   openai: [{ provider: 'openai', model: 'gpt-4', ... }, ...],
 * //   anthropic: [{ provider: 'anthropic', model: 'claude-3-opus', ... }]
 * // }
 */
export function groupModelsByProvider(models: ModelData[]): Record<string, ModelData[]> {
    return models.reduce((acc, model) => {
        if (!acc[model.provider]) {
            acc[model.provider] = [];
        }
        acc[model.provider].push(model);
        return acc;
    }, {} as Record<string, ModelData[]>);
}

/**
 * Get the most recent status from a runs array
 *
 * @param runs - Array of boolean run results (newest first)
 * @returns The most recent status, or null if no runs
 *
 * @example
 * getLatestStatus([true, false, true]) // true
 * getLatestStatus([]) // null
 */
export function getLatestStatus(runs: boolean[]): boolean | null {
    if (runs.length === 0) return null;
    return runs[runs.length - 1];
}
