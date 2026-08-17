/**
 * Grouping + naming layer for the steady-state estimator.
 *
 * This is the cleanTransformCloud-equivalent for the steady-state endpoint.
 * It deliberately does NOT reuse `cleanTransformCloud`: that function drops
 * every row whose profile is not the published one (`cloud-default-v1`),
 * which is correct for the charts and must stay that way — the estimator is
 * the one consumer that needs `cloud-long-v1` rows too, and it needs raw
 * per-run (tokens, generate_time) pairs that ProcessedData does not carry.
 *
 * Naming contract (docs/naming-contract.md): grouping and slugs come from
 * canonical fields (`providerCanonical`, `modelCanonical`); display labels
 * (`provider`, `displayName`) are attached after grouping and never feed back
 * into keys or slugs.
 */

import type { MetadataLookup } from './modelMappingDB';
import { PUBLISHED_PROFILE_ID } from './processCloud';
import { getProviderDisplayName } from './providerMetadata';
import { createSlug } from './seoUtils';
import {
    estimateSteadyState,
    median,
    SteadyStateOptions,
    SteadyStateSample,
} from './steadyState';

/** The interleaved 512-output-token profile the estimator pairs with the default. */
export const LONG_PROFILE_ID = 'cloud-long-v1';

export const STEADY_STATE_PROFILE_IDS = [PUBLISHED_PROFILE_ID, LONG_PROFILE_ID];

/** The raw Mongo fields this pipeline consumes. */
export interface SteadyStateRawRow {
    _id?: string;
    benchmark_profile_id?: string;
    run_ts?: string | Date;
    model_name: string;
    provider: string;
    transport_provider?: string;
    output_tokens?: number;
    generated_output_tokens?: number | null;
    generate_time?: number;
    tokens_per_second?: number;
}

export interface SteadyStateRow {
    provider: string;            // display label (e.g. "google")
    providerCanonical: string;   // routing/query identifier (e.g. "vertex")
    providerSlug: string;        // slug from providerCanonical
    model: string;               // canonical model identifier
    modelCanonical: string;      // same value, named per the contract
    modelSlug: string;           // slug from modelCanonical
    displayName: string;         // display label from the models collection
    transportProvider: string;
    generationSpeed: number | null;
    floorLatencySeconds: number | null;
    ci95: [number, number] | null;
    sampleCount: number;
    longRunCount: number;
    status: 'ok' | 'insufficient-data' | 'unstable';
    reason?: string;
    /** Median tokens_per_second of the 64-token (default profile) rows, for comparison. */
    legacyTps: number | null;
}

interface SteadyStateGroup {
    providerCanonical: string;
    modelCanonical: string;
    transportProvider: string;
    samples: SteadyStateSample[];
    longRunCount: number;
    legacyTpsSamples: number[];
}

export const processSteadyState = (
    rows: SteadyStateRawRow[],
    lookup: MetadataLookup,
    options: SteadyStateOptions = {}
): SteadyStateRow[] => {
    const groups = new Map<string, SteadyStateGroup>();

    for (const row of rows) {
        if (!row.provider || !row.model_name) continue;

        const profileId = row.benchmark_profile_id;
        // Rows written before the profile field existed are the default profile.
        const isDefaultProfile = !profileId || profileId === PUBLISHED_PROFILE_ID;
        const isLongProfile = profileId === LONG_PROFILE_ID;
        // Any other profile (e.g. cloud-reasoning-v1) is a different experiment.
        if (!isDefaultProfile && !isLongProfile) continue;

        // Same transport separation as the published pipeline: direct and
        // routed samples must never share a fit.
        const transportProvider = row.transport_provider || 'direct';
        const key = JSON.stringify([row.provider, row.model_name, transportProvider]);

        let group = groups.get(key);
        if (!group) {
            group = {
                providerCanonical: row.provider,
                modelCanonical: row.model_name,
                transportProvider,
                samples: [],
                longRunCount: 0,
                legacyTpsSamples: [],
            };
            groups.set(key, group);
        }

        const generatedTokens =
            typeof row.generated_output_tokens === 'number' && row.generated_output_tokens > 0
                ? row.generated_output_tokens
                : row.output_tokens;
        if (
            typeof generatedTokens === 'number' && generatedTokens > 0 &&
            typeof row.generate_time === 'number' && row.generate_time > 0
        ) {
            group.samples.push({
                generatedTokens,
                generateTimeSeconds: row.generate_time,
            });
            if (isLongProfile) group.longRunCount += 1;
        }

        if (isDefaultProfile && typeof row.tokens_per_second === 'number' && row.tokens_per_second > 0) {
            group.legacyTpsSamples.push(row.tokens_per_second);
        }
    }

    const result: SteadyStateRow[] = Array.from(groups.values()).map(group => {
        const { providerCanonical, modelCanonical, transportProvider } = group;
        const metadata = lookup(providerCanonical, modelCanonical, transportProvider);
        const estimate = estimateSteadyState(group.samples, options);

        // No "via OpenRouter". The transport is provisioning detail; the
        // provider shown is whoever served the request.
        const providerDisplay = getProviderDisplayName(providerCanonical);

        return {
            provider: providerDisplay,
            providerCanonical,
            providerSlug: createSlug(providerCanonical),
            model: modelCanonical,
            modelCanonical,
            modelSlug: createSlug(modelCanonical),
            displayName: metadata.display_name,
            transportProvider,
            generationSpeed: estimate.status === 'ok' ? estimate.generationSpeed : null,
            floorLatencySeconds: estimate.status === 'ok' ? estimate.floorLatencySeconds : null,
            ci95: estimate.status === 'ok' ? estimate.ci95 : null,
            sampleCount: estimate.sampleCount,
            longRunCount: estimate.longRunCount,
            status: estimate.status,
            ...(estimate.status !== 'ok' ? { reason: estimate.reason } : {}),
            legacyTps: group.legacyTpsSamples.length > 0 ? median(group.legacyTpsSamples) : null,
        };
    });

    result.sort((a, b) =>
        a.providerCanonical.localeCompare(b.providerCanonical) ||
        a.modelCanonical.localeCompare(b.modelCanonical) ||
        a.transportProvider.localeCompare(b.transportProvider)
    );

    return result;
};
