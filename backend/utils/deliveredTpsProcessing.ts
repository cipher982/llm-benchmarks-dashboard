/**
 * Grouping + naming layer for the Delivered TPS headline.
 *
 * Delivered TPS (docs/specs/delivered-tps-vision.md) is
 * 64 visible answer tokens / time from request start to the 64th visible token.
 * The runner records the denominator on every row that reached 64 visible
 * tokens (`time_to_64_visible_tokens_seconds`); reasoning tokens never advance
 * the clock, so one scalar is comparable across chat and reasoning models.
 *
 * Like the steady-state pipeline this does NOT reuse `cleanTransformCloud`:
 * it reads raw per-run rows and needs the time_to_64 field that ProcessedData
 * does not carry. It shares the naming contract and the direct-vs-routed
 * transport separation with every other pipeline.
 */

import type { MetadataLookup } from './modelMappingDB';
import { PUBLISHED_PROFILE_ID } from './processCloud';
import { getProviderDisplayName, resolveServingProvider } from './providerMetadata';
import { createSlug } from './seoUtils';
import { median } from './steadyState';

/** The numerator and crossing test agree with the runner (cloud/visible_tokens.py). */
export const VISIBLE_TOKEN_MARK = 64;

/** The raw Mongo fields this pipeline consumes. */
export interface DeliveredTpsRawRow {
    _id?: string;
    benchmark_profile_id?: string;
    run_ts?: string | Date;
    model_name: string;
    provider: string;
    observed_provider?: string | null;
    observed_provider_slug?: string | null;
    transport_provider?: string;
    time_to_64_visible_tokens_seconds?: number | null;
    tokens_per_second?: number;
}

export interface DeliveredTpsRow {
    provider: string;            // display label (e.g. "google")
    providerCanonical: string;   // routing/query identifier (e.g. "vertex")
    providerSlug: string;        // slug from providerCanonical
    model: string;               // canonical model identifier
    modelCanonical: string;      // same value, named per the contract
    modelSlug: string;           // slug from modelCanonical
    displayName: string;         // display label from the models collection
    transportProvider: string;
    /** Median of 64 / time_to_64_visible_tokens_seconds over all reaching rows. */
    deliveredTps: number | null;
    sampleCount: number;
    /** Median tokens_per_second of the 64-token (default profile) rows, for comparison. */
    legacyTps: number | null;
}

interface DeliveredTpsGroup {
    providerCanonical: string;
    /** The lane the catalogue keys names on, not the upstream that served it. */
    catalogueProvider: string;
    modelCanonical: string;
    transportProvider: string;
    deliveredTpsSamples: number[];
    legacyTpsSamples: number[];
}

export const processDeliveredTps = (
    rows: DeliveredTpsRawRow[],
    lookup: MetadataLookup
): DeliveredTpsRow[] => {
    const groups = new Map<string, DeliveredTpsGroup>();

    for (const row of rows) {
        if (!row.provider || !row.model_name) continue;

        const timeTo64 = row.time_to_64_visible_tokens_seconds;
        if (typeof timeTo64 !== 'number' || !Number.isFinite(timeTo64) || timeTo64 <= 0) continue;

        const transportProvider = row.transport_provider || 'direct';
        // Credit whoever served it, not how it was billed.
        const servingProvider = resolveServingProvider(row);
        const key = JSON.stringify([servingProvider, row.model_name, transportProvider]);

        let group = groups.get(key);
        if (!group) {
            group = {
                providerCanonical: servingProvider,
                catalogueProvider: row.provider,
                modelCanonical: row.model_name,
                transportProvider,
                deliveredTpsSamples: [],
                legacyTpsSamples: [],
            };
            groups.set(key, group);
        }

        group.deliveredTpsSamples.push(VISIBLE_TOKEN_MARK / timeTo64);

        // The "burst / short answer" comparison number is the legacy 64-token
        // series; long-profile rows measure a different (512-token) quantity.
        const profileId = row.benchmark_profile_id;
        const isDefaultProfile = !profileId || profileId === PUBLISHED_PROFILE_ID;
        if (isDefaultProfile && typeof row.tokens_per_second === 'number' && row.tokens_per_second > 0) {
            group.legacyTpsSamples.push(row.tokens_per_second);
        }
    }

    const result: DeliveredTpsRow[] = Array.from(groups.values()).map(group => {
        const { providerCanonical, catalogueProvider, modelCanonical, transportProvider } = group;
        // Names are keyed on the scheduling lane, not the serving upstream.
        const metadata = lookup(catalogueProvider || providerCanonical, modelCanonical, transportProvider);
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
            deliveredTps: group.deliveredTpsSamples.length > 0 ? median(group.deliveredTpsSamples) : null,
            sampleCount: group.deliveredTpsSamples.length,
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
