import { NextApiRequest, NextApiResponse } from 'next';
import { LocalMetrics } from '../../models/BenchmarkMetrics';
import { cleanTransformLocal } from '../../utils/processLocal';
import { setupApiEndpoint } from '../../utils/apiMiddleware';
import { CACHE_KEYS } from '../../utils/cacheUtils';

export default async (req: NextApiRequest, res: NextApiResponse) => {
  await setupApiEndpoint(req, res, LocalMetrics, cleanTransformLocal, CACHE_KEYS.LOCAL_METRICS);
};