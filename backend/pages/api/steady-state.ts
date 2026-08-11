import { NextApiRequest, NextApiResponse } from 'next';
import { CloudMetrics } from '../../models/BenchmarkMetrics';
import connectToMongoDB from '../../utils/connectToMongoDB';
import { corsMiddleware } from '../../utils/apiMiddleware';
import { getMetadataLookup } from '../../utils/modelMappingDB';
import { processSteadyState, SteadyStateRawRow } from '../../utils/steadyStateProcessing';
import logger from '../../utils/logger';

const DEFAULT_DAYS = 2;
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

const steadyStateHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  // Handle CORS preflight
  const corsHandled = await corsMiddleware(req, res);
  if (corsHandled) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const days = parseDays(req.query.days);
    // Canonical provider identifier (e.g. `vertex`), per the naming contract.
    const provider = parseProvider(req.query.provider);

    await connectToMongoDB();
    const dateFilter = new Date();
    dateFilter.setDate(dateFilter.getDate() - days);

    const query: Record<string, unknown> = { run_ts: { $gte: dateFilter } };
    if (provider) {
      query.provider = provider;
    }

    // Unlike the chart endpoints this pull keeps cloud-long-v1 rows: the
    // estimator needs both profiles. Profile filtering happens in
    // processSteadyState, which drops any other experiment's rows.
    const metrics = await CloudMetrics.find(query)
      .select(
        'model_name provider transport_provider benchmark_profile_id ' +
        'output_tokens generated_output_tokens generate_time tokens_per_second run_ts'
      )
      .batchSize(50000)
      .lean()
      .exec();

    const lookup = await getMetadataLookup();
    const rows = processSteadyState((metrics ?? []) as unknown as SteadyStateRawRow[], lookup);

    res.setHeader('Cache-Control', 'public, s-maxage=300'); // 5 minute cache
    res.setHeader('Content-Type', 'application/json');

    // No cloud-long-v1 rows yet means every row is "insufficient-data" — a
    // valid, expected response, not an error.
    return res.status(200).json({
      generatedAt: new Date().toISOString(),
      days,
      ...(provider ? { provider } : {}),
      rowCount: rows.length,
      rows,
    });
  } catch (error) {
    logger.error(`Error computing steady-state estimates: ${error}`);
    return res.status(500).json({ error: 'Failed to compute steady-state estimates' });
  }
};

export default steadyStateHandler;
