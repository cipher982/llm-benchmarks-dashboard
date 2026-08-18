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
import { evaluatePublication, type PublicationState } from './endpointPublication';

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
    route_endpoint_tag?: string | null;
    quantization?: string | null;
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
    /** The exact endpoint measured; null on unpinned pre-cutover rows. */
    endpointTag: string | null;
    /** Weight quantization of that endpoint. fp4 and bf16 do not share an axis. */
    quantization: string;
    /** False for rows from OpenRouter's price-selected default routing. */
    pinned: boolean;
    /** 64 / median(T64) over samples that pass the publication gate. Null until
     *  the endpoint has earned publication -- this is the number the site shows. */
    deliveredTps: number | null;
    /** The same statistic over every sample, ungated. Diagnostics and endpoint
     *  detail only: it is what we measured, not what we are willing to publish. */
    measuredDeliveredTps: number | null;
    sampleCount: number;
    /** insufficient | preliminary | official. Only official rows may be ranked. */
    publicationState: PublicationState;
    /** 95% block-bootstrap interval. Official rows only. */
    interval: { low: number; high: number } | null;
    /** Samples surviving 30-minute deduplication inside the rolling window. */
    qualifyingSamples: number;
    distinctDates: number;
    /** Median tokens_per_second of the 64-token (default profile) rows, for comparison. */
    legacyTps: number | null;
}

interface DeliveredTpsGroup {
    providerCanonical: string;
    /** The lane the catalogue keys names on, not the upstream that served it. */
    catalogueProvider: string;
    modelCanonical: string;
    transportProvider: string;
    endpointTag: string | null;
    quantization: string;
    pinned: boolean;
    deliveredTpsSamples: number[];
    /** Every T64 timing, whether or not the row carried a usable timestamp. */
    t64Seconds: number[];
    /** Timings that also carry a timestamp. Only these can evidence time
     *  spread, so only these reach the publication gate; a row with no run_ts
     *  is still a measurement, just not evidence about *when*. */
    t64Samples: { seconds: number; at: Date }[];
    legacyTpsSamples: number[];
}

export const processDeliveredTps = (
    rows: DeliveredTpsRawRow[],
    lookup: MetadataLookup,
    now: Date = new Date()
): DeliveredTpsRow[] => {
    const groups = new Map<string, DeliveredTpsGroup>();

    for (const row of rows) {
        if (!row.provider || !row.model_name) continue;

        const timeTo64 = row.time_to_64_visible_tokens_seconds;
        if (typeof timeTo64 !== 'number' || !Number.isFinite(timeTo64) || timeTo64 <= 0) continue;

        const transportProvider = row.transport_provider || 'direct';
        // Credit whoever served it, not how it was billed.
        const servingProvider = resolveServingProvider(row);
        // An endpoint is (model, exact tag). Two deployments from one provider
        // — deepinfra/bf16 and deepinfra/turbo — serve at different speeds and
        // cannot share a row.
        const endpointTag = row.route_endpoint_tag || null;
        // Quantization is identity: gpt-oss-120b is served at fp4 and at bf16,
        // and fp4 is faster because it is a smaller artifact, not because the
        // provider is quicker. `unknown` never merges with a known value.
        const quantization = row.quantization || 'unknown';
        const key = JSON.stringify([
            servingProvider,
            row.model_name,
            transportProvider,
            endpointTag,
            quantization,
        ]);

        let group = groups.get(key);
        if (!group) {
            group = {
                providerCanonical: servingProvider,
                catalogueProvider: row.provider,
                modelCanonical: row.model_name,
                transportProvider,
                endpointTag,
                quantization,
                // Rows produced before endpoint pinning came from OpenRouter's
                // default routing, which selects on price. They measured
                // whichever deployment happened to be cheapest that minute, so
                // they are retained and labelled but never ranked against a
                // pinned measurement of a named endpoint.
                pinned: Boolean(endpointTag),
                deliveredTpsSamples: [],
                t64Seconds: [],
                t64Samples: [],
                legacyTpsSamples: [],
            };
            groups.set(key, group);
        }

        group.deliveredTpsSamples.push(VISIBLE_TOKEN_MARK / timeTo64);
        group.t64Seconds.push(timeTo64);
        if (row.run_ts) {
            const at = row.run_ts instanceof Date ? row.run_ts : new Date(row.run_ts);
            if (!Number.isNaN(at.getTime())) group.t64Samples.push({ seconds: timeTo64, at });
        }

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
        const { endpointTag, quantization, pinned } = group;
        // Names are keyed on the scheduling lane, not the serving upstream.
        const metadata = lookup(catalogueProvider || providerCanonical, modelCanonical, transportProvider);
        // The gate, not a raw median: an endpoint measured 348 times inside one
        // three-hour window has one window's worth of evidence, not 348.
        // An unpinned group is disqualified by kind, not by sample count: it
        // measured whatever OpenRouter's price-selected routing picked that
        // minute, so no amount of it describes a named endpoint. Running it
        // through the gate would let a long pre-cutover history publish as
        // though an endpoint had been measured -- 190 rows reached
        // `preliminary` that way.
        const verdict = pinned
            ? evaluatePublication(
                  group.t64Samples,
                  `${providerCanonical}|${modelCanonical}|${endpointTag ?? ''}|${quantization}`,
                  now
              )
            : {
                  state: 'unpinned' as const,
                  deliveredTps: null,
                  interval: null,
                  sampleCount: group.t64Samples.length,
                  distinctDates: 0,
                  distinctBlocks: 0,
                  spanHours: 0,
              };
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
            endpointTag,
            quantization,
            pinned,
            deliveredTps: verdict.deliveredTps,
            measuredDeliveredTps:
                group.t64Seconds.length > 0 ? VISIBLE_TOKEN_MARK / median(group.t64Seconds) : null,
            sampleCount: group.deliveredTpsSamples.length,
            publicationState: verdict.state,
            interval: verdict.interval,
            qualifyingSamples: verdict.sampleCount,
            distinctDates: verdict.distinctDates,
            legacyTps: group.legacyTpsSamples.length > 0 ? median(group.legacyTpsSamples) : null,
        };
    });

    result.sort((a, b) =>
        a.providerCanonical.localeCompare(b.providerCanonical) ||
        a.modelCanonical.localeCompare(b.modelCanonical) ||
        (a.endpointTag || '').localeCompare(b.endpointTag || '') ||
        a.quantization.localeCompare(b.quantization) ||
        a.transportProvider.localeCompare(b.transportProvider)
    );

    return result;
};
