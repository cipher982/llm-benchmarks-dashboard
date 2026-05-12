import { CloudBenchmark } from '../types/CloudData';
import type { ProcessedData } from './processCloud';
import { getProviderDisplayName } from './providerMetadata';
import { createSlug } from './seoUtils';

const meanOrZero = (values: number[]): number => {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
};

type MergeMetadata = Partial<Pick<
    CloudBenchmark,
    | 'enabled'
    | 'deprecated'
    | 'deprecation_date'
    | 'successor_model'
    | 'last_benchmark_date'
    | 'lifecycle_status'
    | 'lifecycle_confidence'
    | 'lifecycle_reasons'
    | 'lifecycle_recommended_actions'
    | 'lifecycle_catalog_state'
    | 'lifecycle_computed_at'
    | 'lifecycle_metrics'
>>;

export const latestBenchmarkDate = (items: ProcessedData[]): string | undefined => {
    const allTimestamps = items
        .map(item => item.last_run_ts)
        .filter((ts): ts is Date => ts != null);

    return allTimestamps.length > 0
        ? new Date(Math.max(...allTimestamps.map(ts => ts.getTime()))).toISOString()
        : undefined;
};

export const mergeProcessedModelGroup = ({
    items,
    providerCanonical,
    modelDisplay,
    modelCanonical,
    metadata = {},
}: {
    items: ProcessedData[];
    providerCanonical: string;
    modelDisplay: string;
    modelCanonical: string;
    metadata?: MergeMetadata;
}): CloudBenchmark => {
    if (items.length === 0) {
        throw new Error('Cannot merge empty model group');
    }

    const mergedItem: CloudBenchmark = {
        _id: items[0]._id,
        provider: getProviderDisplayName(providerCanonical),
        providerCanonical,
        providerSlug: createSlug(providerCanonical),
        model_name: modelDisplay,
        modelCanonical,
        modelSlug: createSlug(modelCanonical),
        tokens_per_second: [],
        tokens_per_second_timestamps: [],
        generated_tokens_per_second: [],
        generated_tokens_per_second_mean: 0,
        visible_tokens_per_second: [],
        visible_tokens_per_second_timestamps: [],
        throughput_basis: items.some(item => item.throughput_basis === 'mixed')
            || (items.some(item => item.throughput_basis === 'visible') && items.some(item => item.throughput_basis === 'legacy'))
                ? 'mixed'
                : items.some(item => item.throughput_basis === 'visible') ? 'visible' : 'legacy',
        time_to_first_token: [],
        time_to_first_token_timestamps: [],
        tokens_per_second_mean: 0,
        tokens_per_second_min: Infinity,
        tokens_per_second_max: -Infinity,
        tokens_per_second_quartiles: [0, 0, 0],
        time_to_first_token_mean: 0,
        time_to_first_token_min: Infinity,
        time_to_first_token_max: -Infinity,
        time_to_first_token_quartiles: [0, 0, 0],
        display_name: modelDisplay,
        ...metadata,
    };

    items.forEach((item) => {
        mergedItem.tokens_per_second.push(...item.tokens_per_second);
        mergedItem.tokens_per_second_timestamps.push(...item.tokens_per_second_timestamps);
        if (item.generated_tokens_per_second) {
            mergedItem.generated_tokens_per_second!.push(...item.generated_tokens_per_second);
        } else {
            // Legacy rows predate visible/generated token splits.
            mergedItem.generated_tokens_per_second!.push(...item.tokens_per_second);
        }
        if (item.visible_tokens_per_second) {
            mergedItem.visible_tokens_per_second!.push(...item.visible_tokens_per_second);
        }
        if (item.visible_tokens_per_second_timestamps) {
            mergedItem.visible_tokens_per_second_timestamps!.push(...item.visible_tokens_per_second_timestamps);
        }
        if (item.time_to_first_token) {
            mergedItem.time_to_first_token!.push(...item.time_to_first_token);
        }
        if (item.time_to_first_token_timestamps) {
            mergedItem.time_to_first_token_timestamps!.push(...item.time_to_first_token_timestamps);
        }
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

    mergedItem.tokens_per_second_mean = meanOrZero(mergedItem.tokens_per_second);
    mergedItem.tokens_per_second_min = mergedItem.tokens_per_second.length
        ? Math.min(...mergedItem.tokens_per_second)
        : 0;
    mergedItem.tokens_per_second_max = mergedItem.tokens_per_second.length
        ? Math.max(...mergedItem.tokens_per_second)
        : 0;
    mergedItem.generated_tokens_per_second_mean = meanOrZero(mergedItem.generated_tokens_per_second ?? []);
    mergedItem.time_to_first_token_mean = meanOrZero(mergedItem.time_to_first_token ?? []);

    return mergedItem;
};
