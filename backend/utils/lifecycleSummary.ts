import mongoose from 'mongoose';
import connectToMongoDB from './connectToMongoDB';

const FLAGGED_STATUSES = new Set([
    'likely_deprecated',
    'deprecated',
    'failing',
    'stale',
    'never_succeeded',
    'disabled'
]);

const LifecycleStatusSchema = new mongoose.Schema({
    provider: { type: String, required: true },
    model_id: { type: String, required: true },
    status: { type: String },
    confidence: { type: String },
    reasons: { type: [String], default: [] },
    recommended_actions: { type: [String], default: [] },
    catalog_state: { type: String },
    computed_at: { type: Date },
    metrics: { type: mongoose.Schema.Types.Mixed }
});

export const LifecycleStatusModel = mongoose.models.ModelLifecycleStatus ||
    mongoose.model('ModelLifecycleStatus', LifecycleStatusSchema, 'model_status');

export interface LifecycleSummaryOptions {
    providers?: string[];
    includeActive?: boolean;
    limitPerStatus?: number;
}

export interface LifecycleSummaryRow {
    provider: string;
    total: number;
    counts: Record<string, number>;
    flaggedTotal: number;
    sampleReasons: Record<string, string>;
    lastComputedAt?: string;
}

export interface LifecycleSummaryResult {
    flaggedStatuses: string[];
    includeActive: boolean;
    rows: LifecycleSummaryRow[];
}

const toIsoString = (value: unknown): string | undefined => {
    if (!value) return undefined;
    if (value instanceof Date) return value.toISOString();
    const parsed = new Date(value as string);
    if (Number.isNaN(parsed.getTime())) {
        return undefined;
    }
    return parsed.toISOString();
};

export async function fetchLifecycleSummary(options: LifecycleSummaryOptions = {}): Promise<LifecycleSummaryResult> {
    await connectToMongoDB();

    const { providers, includeActive = false, limitPerStatus = 1 } = options;

    const query: Record<string, unknown> = {};
    if (providers && providers.length > 0) {
        query.provider = { $in: providers };
    }

    const rows = await LifecycleStatusModel.find(query, {
        provider: 1,
        status: 1,
        confidence: 1,
        reasons: 1,
        computed_at: 1,
    }).lean();

    const summaries = new Map<string, LifecycleSummaryRow>();

    rows.forEach(doc => {
        const provider = doc.provider as string;
        const status = (doc.status as string | undefined) || 'unknown';
        const includeStatus = includeActive || status !== 'active';

        let summary = summaries.get(provider);
        if (!summary) {
            summary = {
                provider,
                total: 0,
                counts: {},
                flaggedTotal: 0,
                sampleReasons: {},
                lastComputedAt: undefined,
            };
            summaries.set(provider, summary);
        }

        summary.total += 1;

        if (includeStatus) {
            summary.counts[status] = (summary.counts[status] || 0) + 1;
        }

        if (FLAGGED_STATUSES.has(status)) {
            summary.flaggedTotal += 1;
        }

        const computedAtIso = toIsoString(doc.computed_at);
        if (!summary.lastComputedAt || (computedAtIso && computedAtIso > summary.lastComputedAt)) {
            summary.lastComputedAt = computedAtIso;
        }

        if (includeStatus && doc.reasons && Array.isArray(doc.reasons) && doc.reasons.length > 0) {
            const existingReasonCount = summary.sampleReasons[status] ? 1 : 0;
            if (existingReasonCount < limitPerStatus) {
                summary.sampleReasons[status] = doc.reasons[0];
            }
        }
    });

    const rowsArray = Array.from(summaries.values()).sort((a, b) => a.provider.localeCompare(b.provider));

    return {
        flaggedStatuses: Array.from(FLAGGED_STATUSES),
        includeActive,
        rows: rowsArray,
    };
}

export { FLAGGED_STATUSES };
