import { NextApiRequest, NextApiResponse } from 'next';
import { CloudMetrics } from '../../models/BenchmarkMetrics';
import { cleanTransformCloud } from '../../utils/processCloud';
import { setupApiEndpoint } from '../../utils/apiMiddleware';
import { CACHE_KEYS } from '../../utils/cacheUtils';

export default async (req: NextApiRequest, res: NextApiResponse) => {
  await setupApiEndpoint(req, res, CloudMetrics, cleanTransformCloud, CACHE_KEYS.CLOUD_METRICS);
};