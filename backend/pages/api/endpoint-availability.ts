/**
 * Availability, reported separately from speed.
 *
 * Timeouts, rate limits and refusals are not slow measurements — folding them
 * into a throughput number would let an endpoint that fails most requests look
 * fast on the few it serves. They are a different property of the endpoint and
 * get their own surface.
 *
 * Two independent sources, never blended:
 *   ours     — successes and failures our own scheduler observed, one
 *              controlled workload, per endpoint.
 *   external — OpenRouter's uptime and status for the same endpoint, over
 *              their whole customer traffic.
 *
 * OpenRouter's throughput percentiles are deliberately NOT served here. They
 * aggregate uncontrolled workloads with varying prompt and output lengths, so
 * mixing them with a controlled 64-token measurement produces a number that
 * means neither thing. They may be shown on an endpoint detail page under an
 * explicit external-telemetry label; they must never become a prior, a
 * fallback for endpoints below threshold, or a ranking input.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { BenchEndpoints, BenchModelHealth } from '../../models/BenchmarkMetrics';
import connectToMongoDB from '../../utils/connectToMongoDB';
import { corsMiddleware } from '../../utils/apiMiddleware';
import logger from '../../utils/logger';

interface EndpointHealthDoc {
    model_id?: string;
    endpoint_tag?: string;
    successes_24h?: number;
    failures_24h?: number;
    last_error_kind?: string;
    last_success_at?: Date;
    freshness_status?: string;
}

interface EndpointCatalogueDoc {
    model_id?: string;
    endpoint_tag?: string;
    provider_canonical?: string;
    provider_name?: string;
    quantization?: string;
    or_status?: number;
    or_uptime_1d?: number;
}

const key = (modelId?: string, tag?: string) => `${modelId ?? ''}|${tag ?? ''}`;

const availabilityHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    const corsHandled = await corsMiddleware(req, res);
    if (corsHandled) return;

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        await connectToMongoDB();

        const [catalogue, health] = await Promise.all([
            BenchEndpoints.find({ enabled: true })
                .select('model_id endpoint_tag provider_canonical provider_name quantization or_status or_uptime_1d')
                .lean(),
            BenchModelHealth.find({ provider: 'openrouter', endpoint_tag: { $ne: null } })
                .select('model_id endpoint_tag successes_24h failures_24h last_error_kind last_success_at freshness_status')
                .lean(),
        ]);

        const healthByKey = new Map<string, EndpointHealthDoc>();
        for (const doc of (health ?? []) as EndpointHealthDoc[]) {
            healthByKey.set(key(doc.model_id, doc.endpoint_tag), doc);
        }

        const rows = ((catalogue ?? []) as EndpointCatalogueDoc[]).map(entry => {
            const observed = healthByKey.get(key(entry.model_id, entry.endpoint_tag));
            const successes = observed?.successes_24h ?? 0;
            const failures = observed?.failures_24h ?? 0;
            const attempts = successes + failures;
            return {
                model: entry.model_id,
                endpointTag: entry.endpoint_tag,
                providerCanonical: entry.provider_canonical,
                provider: entry.provider_name,
                quantization: entry.quantization ?? 'unknown',
                measured: {
                    successes24h: successes,
                    failures24h: failures,
                    // Null rather than 1.0 when nothing was attempted: an
                    // endpoint nobody called has no success rate, and
                    // reporting a perfect one would read as health.
                    successRate: attempts > 0 ? successes / attempts : null,
                    lastErrorKind: observed?.last_error_kind ?? null,
                    lastSuccessAt: observed?.last_success_at ?? null,
                    freshness: observed?.freshness_status ?? 'never_run',
                },
                external: {
                    source: 'openrouter',
                    uptime1d: entry.or_uptime_1d ?? null,
                    status: entry.or_status ?? null,
                },
            };
        });

        const withAttempts = rows.filter(r => r.measured.successRate != null);
        res.setHeader('Cache-Control', 'public, s-maxage=300');
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json({
            generatedAt: new Date().toISOString(),
            note:
                'Availability is reported separately from speed. Timeouts and rate limits are ' +
                'not slow measurements and never enter a throughput number. External values are ' +
                "OpenRouter's own telemetry over their whole traffic, not our controlled workload.",
            rowCount: rows.length,
            summary: {
                endpoints: rows.length,
                measuredEndpoints: withAttempts.length,
                neverMeasured: rows.filter(r => r.measured.freshness === 'never_run').length,
                degraded: rows.filter(r => (r.external.status ?? 0) < 0).length,
            },
            rows,
        });
    } catch (error) {
        logger.error(`Error computing endpoint availability: ${error}`);
        return res.status(500).json({ error: 'Failed to compute endpoint availability' });
    }
};

export default availabilityHandler;
