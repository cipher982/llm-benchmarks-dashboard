/**
 * What the landing page shows by default: live lanes, one row per identity.
 *
 * A lane is one way of reaching a model — a provider, a catalogue id and a
 * transport (direct key or via OpenRouter). The 2026-08-16 migration moved
 * most measurement from direct keys to OpenRouter-served lanes, so the 30-day
 * window holds both lanes for hundreds of models: the retired one with weeks
 * of samples and the current one with days. Shown raw, the same model appears
 * twice and the retired lane ranks higher.
 *
 * Nothing is deleted. Every lane stays in the payload, reachable through the
 * lifecycle scope ("all"). By default the page hides flagged lanes and folds
 * the rest to one row per (provider, model), spoken for by the lane measured
 * most recently — the one a visitor could use today.
 */

import type { TableRow } from '../types/ProcessedData';

export type LaneScope = 'all' | 'hideFlagged' | 'flaggedOnly';

export const FLAGGED_LIFECYCLE_STATUSES = new Set([
    'likely_deprecated',
    'deprecated',
    'failing',
    'stale',
    'never_succeeded',
    'disabled',
]);

interface Lifecycle {
    lifecycle_status?: string;
    deprecated?: boolean;
}

export const lifecycleOf = (row: Lifecycle): string =>
    row.lifecycle_status || (row.deprecated ? 'deprecated' : 'active');

export const isFlagged = (row: Lifecycle): boolean => FLAGGED_LIFECYCLE_STATUSES.has(lifecycleOf(row));

export function scopeRows<T extends Lifecycle>(rows: T[], scope: LaneScope): T[] {
    if (scope === 'all') return rows;
    return rows.filter((row) => (scope === 'flaggedOnly' ? isFlagged(row) : !isFlagged(row)));
}

interface LaneIdentity {
    providerCanonical?: string;
    provider: string;
    modelCanonical?: string;
    transportProvider?: string;
}

/** One measured lane. */
export const laneKey = (row: LaneIdentity): string =>
    `${row.providerCanonical || row.provider}/${row.modelCanonical}/${row.transportProvider || 'direct'}`;

/** What a visitor thinks of as one thing: this model at this provider. */
export const identityKey = (row: { providerCanonical?: string; provider: string; model_name: string }): string =>
    `${row.providerCanonical || row.provider}/${row.model_name}`;

export interface LaneRef {
    modelCanonical: string;
    transportProvider: string;
    samples: number;
    tokensPerSecondMean: number;
    lastBenchmarkDate?: string;
}

/**
 * The lane that speaks for an identity: measured most recently, then with
 * the most samples. Recency first because the question the landing page
 * answers is "what is this model doing now"; sample count only breaks ties.
 */
const laneOrder = (a: TableRow, b: TableRow): number => {
    const da = a.last_benchmark_date || '';
    const db = b.last_benchmark_date || '';
    if (da !== db) return da > db ? -1 : 1;
    return (b.samples ?? 0) - (a.samples ?? 0);
};

export interface FoldedLanes {
    rows: TableRow[];
    /** Lanes hidden behind another row. */
    folded: number;
    /** `laneKey` of every row shown, so other payloads can be filtered to match. */
    lanes: Set<string>;
}

export function foldLanes(rows: TableRow[]): FoldedLanes {
    const groups = new Map<string, TableRow[]>();
    for (const row of rows) {
        const key = identityKey(row);
        const group = groups.get(key);
        if (group) group.push(row);
        else groups.set(key, [row]);
    }

    const out: TableRow[] = [];
    const lanes = new Set<string>();
    let folded = 0;

    for (const group of groups.values()) {
        const [primary, ...rest] = [...group].sort(laneOrder);
        lanes.add(laneKey(primary));
        if (!rest.length) {
            out.push(primary);
            continue;
        }
        folded += rest.length;
        out.push({
            ...primary,
            otherLanes: rest.length,
            lanes: rest.map((lane) => ({
                modelCanonical: lane.modelCanonical,
                transportProvider: lane.transportProvider || 'direct',
                samples: lane.samples ?? 0,
                tokensPerSecondMean: lane.tokens_per_second_mean,
                lastBenchmarkDate: lane.last_benchmark_date,
            })),
        });
    }

    return { rows: out, folded, lanes };
}
