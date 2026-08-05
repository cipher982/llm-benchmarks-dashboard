/**
 * Offline fixtures for design iteration.
 *
 * `/status`, `/providers/[provider]` and `/models/[provider]/[model]` all query
 * MongoDB with no fallback, so `npm run design:dev` — which runs with an empty
 * `MONGODB_URI` — returned 500 for three of the site's five page templates.
 * Two thirds of the site could only be reviewed against production, which is
 * exactly when a redesign stops being iterable.
 *
 * These fixtures are derived from `public/design/data.json`, the committed
 * extract of a real 14-day window, so the shapes and the names are the ones the
 * site actually renders. Everything synthesised on top of it is deterministic:
 * two capture runs must differ only where the design changed.
 *
 * Gated on an explicit `DESIGN_FIXTURES=1`, set only by `npm run design:dev`.
 * Deliberately not gated on "no Mongo URI configured": under that rule a
 * production deploy that lost its connection string would quietly start serving
 * fabricated status and model data instead of failing, which is far worse than
 * a 500. Nothing here should ever be reachable by accident.
 */

import fs from 'fs/promises';
import path from 'path';
import { ModelData } from './status/statusHelpers';
import { createSlug } from './seoUtils';
import type { ModelPageData, ProviderModelEntry, ProviderPageData } from '../types/ModelPages';

interface ExtractRow {
    provider: string;
    model: string;
    mean: number;
    min: number;
    max: number;
    ttft: number | null;
    spread: number;
    n?: number | null;
}

interface Extract {
    window: { from: string; to: string; points: number };
    ridge: { xMax: number; points: number; rows: Array<{ model: string; provider: string; mean: number; min: number; max: number; curve: number[] }> };
    series: { timestamps: string[]; models: Array<{ model: string; provider: string; values: (number | null)[] }> };
    table: ExtractRow[];
    scatter: Array<{ p: string; m: string; x: number; y: number }>;
    providers: Array<{ name: string; models: number; median: number; p90: number; best: number; spread: number; ttft: number | null }>;
}

/**
 * Whether to serve fixtures instead of querying MongoDB. Explicit opt-in only.
 */
export function designFixturesEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
    return env.DESIGN_FIXTURES === '1' && env.NODE_ENV !== 'production';
}

let cached: Extract | null = null;

async function loadExtract(): Promise<Extract | null> {
    if (cached) return cached;
    try {
        const file = path.join(process.cwd(), 'public', 'design', 'data.json');
        cached = JSON.parse(await fs.readFile(file, 'utf8')) as Extract;
        return cached;
    } catch {
        // The extract is committed, but a checkout that deleted it should
        // degrade to "no fixture" rather than to a crash.
        return null;
    }
}

/** Stable small integer from a string, so synthesised values never move between runs. */
function hash(value: string): number {
    let h = 2166136261;
    for (let i = 0; i < value.length; i++) {
        h ^= value.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return Math.abs(h);
}

/**
 * The site's own slug function, not a lookalike. Fixture URLs have to be the
 * URLs production serves — a fixture that invents its own slug shape reviews a
 * page that does not exist.
 */
const slugify = createSlug;

// =============================================================================
// STATUS
// =============================================================================

export interface FixtureStatus {
    active: ModelData[];
    deprecated: ModelData[];
    disabled: ModelData[];
    summary: {
        active_count: number;
        deprecated_count: number;
        disabled_count: number;
        total_issues: number;
    };
}

/**
 * Every model in the extract, bucketed and given a deterministic run history.
 * One model in eleven is failing and one in seventeen is stale, which is close
 * enough to production to exercise the warning and failure paths that a happy
 * fixture would leave unrendered.
 */
export async function getFixtureStatus(): Promise<FixtureStatus | null> {
    const extract = await loadExtract();
    if (!extract) return null;

    const toModel = (row: ExtractRow, status: ModelData['status']): ModelData => {
        const seed = hash(`${row.provider}/${row.model}`);
        const failing = seed % 11 === 0;
        const stale = seed % 17 === 0;

        const runs = Array.from({ length: 10 }, (_, i) => {
            if (failing) return i < 7 ? (seed + i) % 3 !== 0 : false;
            return (seed + i * 7) % 13 !== 0;
        });

        const warnings: string[] = [];
        if (stale) warnings.push('stale_3d');
        if (failing) warnings.push(`failures_${runs.filter((r) => !r).length}`);

        const ageHours = stale ? 72 + (seed % 48) : seed % 6;

        return {
            provider: row.provider,
            model: row.model,
            last_run_timestamp: null,
            last_run_relative: ageHours < 1 ? 'just now' : ageHours < 24 ? `${ageHours}h ago` : `${Math.floor(ageHours / 24)}d ago`,
            runs: status === 'disabled' ? [] : runs,
            status,
            warnings: status === 'healthy' || status === 'warning' ? warnings : [],
            enabled: status !== 'disabled',
            deprecated: status === 'deprecated',
            deprecation_date: status === 'deprecated' ? '2026-05-01T00:00:00.000Z' : undefined,
        };
    };

    const rows = extract.table;
    const active = rows.filter((_, i) => i % 7 !== 0).map((r) => toModel(r, 'healthy'));
    const deprecated = rows.filter((_, i) => i % 7 === 0 && i % 14 !== 0).map((r) => toModel(r, 'deprecated'));
    const disabled = rows.filter((_, i) => i % 14 === 0).map((r) => toModel(r, 'disabled'));

    return {
        active,
        deprecated,
        disabled,
        summary: {
            active_count: active.length,
            deprecated_count: deprecated.length,
            disabled_count: disabled.length,
            total_issues: active.filter((m) => m.warnings.length > 0).length,
        },
    };
}

// =============================================================================
// PROVIDER AND MODEL PAGES
// =============================================================================

function toEntry(row: ExtractRow): ProviderModelEntry {
    const providerSlug = slugify(row.provider);
    const modelSlug = slugify(row.model);
    return {
        provider: row.provider,
        providerCanonical: row.provider,
        providerSlug,
        model: row.model,
        modelCanonical: row.model,
        modelSlug,
        displayName: row.model,
        latestRunAt: '2026-01-15T12:00:00.000Z',
        dataSpanDays: 14,
        lifecycleStatus: 'active',
        tokensPerSecondMean: row.mean,
        timeToFirstTokenMean: row.ttft ?? undefined,
        tokensPerSecondMin: row.min,
        tokensPerSecondMax: row.max,
    };
}

export async function getFixtureProviderPageData(providerSlug: string): Promise<ProviderPageData | null> {
    const extract = await loadExtract();
    if (!extract) return null;

    const rows = extract.table.filter((r) => slugify(r.provider) === providerSlug);
    if (!rows.length) return null;

    const models = rows.map(toEntry);
    const means = rows.map((r) => r.mean);
    const ttfts = rows.map((r) => r.ttft).filter((v): v is number => v != null);

    return {
        provider: rows[0].provider,
        providerCanonical: rows[0].provider,
        providerSlug,
        displayName: rows[0].provider,
        summary: {
            tokensPerSecondMean: means.reduce((a, b) => a + b, 0) / means.length,
            tokensPerSecondMin: Math.min(...rows.map((r) => r.min)),
            tokensPerSecondMax: Math.max(...rows.map((r) => r.max)),
            timeToFirstTokenMean: ttfts.length ? ttfts.reduce((a, b) => a + b, 0) / ttfts.length : null,
            sampleCount: rows.reduce((total, r) => total + (r.n ?? 0), 0),
            runCount: rows.length,
            latestRunAt: '2026-01-15T12:00:00.000Z',
        },
        models,
        fastestModels: [...models].sort((a, b) => (b.tokensPerSecondMean ?? 0) - (a.tokensPerSecondMean ?? 0)).slice(0, 5),
        latestRunAt: '2026-01-15T12:00:00.000Z',
    };
}

export async function getFixtureModelPageData(
    providerSlug: string,
    modelSlug: string,
): Promise<ModelPageData | null> {
    const extract = await loadExtract();
    if (!extract) return null;

    // Production slugs come from `modelCanonical` — the raw provider model id,
    // which the extract does not carry, only display names. So an exact match
    // is preferred but any URL under a known provider still renders that
    // provider's fastest model. The pipeline is capturing a template, and a
    // template that 404s teaches nothing; the alternative was pointing
    // routes.json at fixture-only URLs that would then 404 against production.
    const forProvider = extract.table.filter((r) => slugify(r.provider) === providerSlug);
    const row =
        forProvider.find((r) => slugify(r.model) === modelSlug) ??
        forProvider[0] ??
        null;
    if (!row) return null;

    const ridge = extract.ridge.rows.find((r) => r.model === row.model && r.provider === row.provider);
    const series = extract.series.models.find((m) => m.model === row.model);
    const sameModel = extract.table.filter((r) => r.model === row.model);

    return {
        provider: row.provider,
        providerCanonical: row.provider,
        providerSlug,
        model: row.model,
        modelCanonical: row.model,
        modelSlug,
        displayName: row.model,
        summary: {
            tokensPerSecondMean: row.mean,
            tokensPerSecondMin: row.min,
            tokensPerSecondMax: row.max,
            timeToFirstTokenMean: row.ttft,
            sampleCount: row.n ?? 0,
            runCount: row.n ?? 0,
            latestRunAt: '2026-01-15T12:00:00.000Z',
        },
        speedDistribution: ridge
            ? {
                provider: row.provider,
                modelName: row.model,
                displayName: row.model,
                meanTokensPerSecond: row.mean,
                minTokensPerSecond: row.min,
                maxTokensPerSecond: row.max,
                // The extract stores curves normalised over a shared domain;
                // the page type wants absolute x values back.
                densityPoints: ridge.curve.map((y, i) => ({
                    x: (i / (ridge.curve.length - 1)) * extract.ridge.xMax,
                    y,
                })),
            }
            : undefined,
        timeSeries: series
            ? {
                modelName: row.model,
                displayName: row.model,
                timestamps: extract.series.timestamps,
                providers: [{ provider: row.provider, providerCanonical: row.provider, values: series.values }],
            }
            : undefined,
        tableRows: sameModel.map((r) => ({
            provider: r.provider,
            modelName: r.model,
            tokensPerSecondMean: r.mean,
            tokensPerSecondMin: r.min,
            tokensPerSecondMax: r.max,
            timeToFirstTokenMean: r.ttft ?? 0,
        })),
        relatedModels: extract.table
            .filter((r) => slugify(r.provider) === providerSlug && r.model !== row.model)
            .slice(0, 6)
            .map(toEntry),
        alternatives: sameModel.filter((r) => r.provider !== row.provider).slice(0, 6).map(toEntry),
        lifecycleStatus: 'active',
        dataSpanDays: 14,
        isDeprecated: false,
        shouldNoIndex: false,
    };
}

// =============================================================================
// PROCESSED BUNDLE
// =============================================================================

/**
 * The `/api/processed` payload.
 *
 * `?include=series` is a partial request, and partial requests deliberately
 * bypass the static file and go to MongoDB — so the cloud page's small
 * multiples were the one block that stayed unreviewable even with the static
 * files on disk. Those files are gitignored anyway, so a fresh clone had
 * nothing to fall back to.
 *
 * Density curves are reconstructed from the ridge rows, which is why only the
 * 22 fastest models carry a distribution here. That is a property of the
 * extract, not of the chart.
 */
export async function getFixtureProcessed(): Promise<Record<string, unknown> | null> {
    const extract = await loadExtract();
    if (!extract) return null;

    const speedDistribution = extract.ridge.rows.map((row) => ({
        provider: row.provider,
        model_name: `${row.provider}-${row.model}`,
        display_name: row.model,
        mean_tokens_per_second: row.mean,
        min_tokens_per_second: row.min,
        max_tokens_per_second: row.max,
        density_points: row.curve.map((y, i) => ({
            x: (i / (row.curve.length - 1)) * extract.ridge.xMax,
            y,
        })),
        lifecycle_status: 'active',
    }));

    const table = extract.table.map((row) => ({
        provider: row.provider,
        providerCanonical: row.provider,
        providerSlug: slugify(row.provider),
        model_name: row.model,
        modelCanonical: row.model,
        modelSlug: slugify(row.model),
        tokens_per_second_mean: row.mean,
        tokens_per_second_min: row.min,
        tokens_per_second_max: row.max,
        samples: row.n ?? null,
        generated_tokens_per_second_mean: Number((row.mean * 1.08).toFixed(2)),
        throughput_basis: 'visible',
        time_to_first_token_mean: row.ttft ?? 0,
        last_benchmark_date: '2026-01-15T12:00:00.000Z',
        lifecycle_status: 'active',
    }));

    return {
        speedDistribution,
        timeSeries: {
            timestamps: extract.series.timestamps,
            models: extract.series.models.map((m) => ({
                model_name: m.model,
                display_name: m.model,
                providers: [{
                    provider: m.provider,
                    providerCanonical: m.provider,
                    values: m.values,
                }],
            })),
        },
        table,
        meta: { table: { totalRows: table.length, filteredRows: table.length, flaggedStatuses: [] } },
    };
}

// =============================================================================
// LIFECYCLE SUMMARY
// =============================================================================

/**
 * The `/api/lifecycle-summary` payload, feeding the "N flagged" note on the
 * provider rail.
 *
 * The cloud page catches this endpoint failing and renders without the note,
 * so a 500 here is not a broken page — but it still logs, and Next's dev
 * overlay puts a full-screen Runtime Error over the design being reviewed.
 * An endpoint that is allowed to fail quietly still has to be quiet.
 */
export async function getFixtureLifecycleSummary(): Promise<Record<string, unknown> | null> {
    const extract = await loadExtract();
    if (!extract) return null;

    const byProvider = new Map<string, number>();
    for (const row of extract.table) {
        byProvider.set(row.provider, (byProvider.get(row.provider) ?? 0) + 1);
    }

    return {
        generatedAt: '2026-01-15T12:00:00.000Z',
        flaggedStatuses: ['likely_deprecated', 'deprecated', 'failing', 'stale', 'never_succeeded', 'disabled'],
        includeActive: false,
        rows: [...byProvider.entries()].map(([provider, total]) => {
            // Deterministic, and matching the status fixture's rate so the two
            // pages do not contradict each other about how much is flagged.
            const flaggedTotal = Math.floor(total / 7);
            return {
                provider,
                total,
                flaggedTotal,
                counts: flaggedTotal ? { deprecated: flaggedTotal } : {},
                sampleReasons: flaggedTotal ? { deprecated: 'provider marked the model end-of-life' } : {},
                lastComputedAt: '2026-01-15T12:00:00.000Z',
            };
        }),
    };
}

/** Slugs the fixture can serve, for `getStaticPaths` under design mode. */
export async function getFixturePaths(): Promise<{
    providers: string[];
    models: Array<{ provider: string; model: string }>;
}> {
    const extract = await loadExtract();
    if (!extract) return { providers: [], models: [] };

    return {
        providers: [...new Set(extract.table.map((r) => slugify(r.provider)))],
        models: extract.table.slice(0, 20).map((r) => ({
            provider: slugify(r.provider),
            model: slugify(r.model),
        })),
    };
}
