import { NextApiRequest, NextApiResponse } from 'next';
import { CloudMetrics } from '../../models/BenchmarkMetrics';
import connectToMongoDB from '../../utils/connectToMongoDB';
import { corsMiddleware } from '../../utils/apiMiddleware';
import { getMetadataLookup } from '../../utils/modelMappingDB';
import { processDeliveredTps, DeliveredTpsRawRow } from '../../utils/deliveredTpsProcessing';
import { rankEndpoints, WINDOW_DAYS } from '../../utils/endpointPublication';
import logger from '../../utils/logger';

// The publication window itself. Pulling less than this makes `official`
// unreachable by construction -- it requires a 96h span across 5 UTC dates --
// so a shorter default would silently cap every endpoint at preliminary.
const DEFAULT_DAYS = WINDOW_DAYS;
const MAX_DAYS = 30;

const parseDays = (param: string | string[] | undefined): number => {
    const raw = Array.isArray(param) ? param[0] : param;
    const parsed = raw ? parseInt(raw, 10) : NaN;
    if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_DAYS;
    return Math.min(parsed, MAX_DAYS);
};

const parseProvider = (param: string | string[] | undefined): string | undefined => {
    const raw = Array.isArray(param) ? param[0] : param;
    const trimmed = raw?.trim();
    return trimmed ? trimmed : undefined;
};

const deliveredTpsHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    const corsHandled = await corsMiddleware(req, res);
    if (corsHandled) return;

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const days = parseDays(req.query.days);
        const provider = parseProvider(req.query.provider);

        await connectToMongoDB();
        const dateFilter = new Date();
        dateFilter.setDate(dateFilter.getDate() - days);

        const query: Record<string, unknown> = { run_ts: { $gte: dateFilter } };
        if (provider) {
            query.provider = provider;
        }

        // Delivered TPS needs the 64th-visible-token timestamp, recorded on
        // every row that reached 64 visible tokens. Profile filtering is
        // delegated to processDeliveredTps; this pull keeps the field the
        // charts never read.
        const metrics = await CloudMetrics.find(query)
            .select(
                'model_name provider transport_provider benchmark_profile_id ' +
                'observed_provider observed_provider_slug ' +
                // Endpoint identity. A field the query does not select is a
                // field the grouping cannot see, which is how the serving
                // provider went unpublished for as long as it did.
                'route_endpoint_tag quantization ' +
                'time_to_64_visible_tokens_seconds tokens_per_second run_ts'
            )
            .batchSize(50000)
            .lean()
            .exec();

        const lookup = await getMetadataLookup();
        const rows = processDeliveredTps((metrics ?? []) as unknown as DeliveredTpsRawRow[], lookup);

        // Ranking is computed here, not in the component: only official rows
        // are rankable, and the tiers come from interval overlap rather than
        // from sorting a column. A renderer that sorts by value would quietly
        // reintroduce ordering between endpoints the measurement cannot
        // separate.
        const rankKey = (row: (typeof rows)[number]) =>
            `${row.providerCanonical}|${row.modelCanonical}|${row.endpointTag ?? ''}|${row.quantization}`;
        const tiers = new Map(
            rankEndpoints(
                rows
                    .filter(row => row.publicationState === 'official' && row.deliveredTps != null)
                    .map(row => ({
                        key: rankKey(row),
                        quantization: row.quantization,
                        deliveredTps: row.deliveredTps as number,
                        interval: row.interval,
                    }))
            ).map(ranked => [ranked.key, ranked])
        );
        const ranked = rows.map(row => {
            const tier = tiers.get(rankKey(row));
            return {
                ...row,
                tier: tier ? tier.tier : null,
                orderUnresolved: tier ? tier.orderUnresolved : false,
                rankEligible: Boolean(tier),
            };
        });

        res.setHeader('Cache-Control', 'public, s-maxage=300'); // 5 minute cache
        res.setHeader('Content-Type', 'application/json');

        // No rows with a time_to_64 field yet means every row has null
        // deliveredTps — a valid, expected state while the field accumulates.
        return res.status(200).json({
            generatedAt: new Date().toISOString(),
            days,
            ...(provider ? { provider } : {}),
            rowCount: ranked.length,
            publicationWindowDays: WINDOW_DAYS,
            counts: {
                official: ranked.filter(r => r.publicationState === 'official').length,
                preliminary: ranked.filter(r => r.publicationState === 'preliminary').length,
                insufficient: ranked.filter(r => r.publicationState === 'insufficient').length,
            },
            rows: ranked,
        });
    } catch (error) {
        logger.error(`Error computing Delivered TPS: ${error}`);
        return res.status(500).json({ error: 'Failed to compute Delivered TPS' });
    }
};

export default deliveredTpsHandler;
