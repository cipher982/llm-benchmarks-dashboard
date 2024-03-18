import { NextApiRequest, NextApiResponse } from 'next';
import { LocalMetrics } from '../../models/BenchmarkMetrics';
import { cleanTransformLocal } from '../../utils/processLocal';
import { setupApiEndpoint } from '../../utils/apiMiddleware';
import { CACHE_KEYS } from '../../utils/cacheUtils';

export const daysAgo = 1000;
const debug = false;
const useCache = !debug;

export default async (req: NextApiRequest, res: NextApiResponse) => {
  await setupApiEndpoint(req, res, LocalMetrics, cleanTransformLocal, CACHE_KEYS.LOCAL_METRICS, daysAgo, useCache);
};