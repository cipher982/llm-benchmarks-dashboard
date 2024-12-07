import { NextApiRequest, NextApiResponse } from 'next';
import { CloudMetrics } from '../../models/BenchmarkMetrics';
import { cleanTransformCloud } from '../../utils/processCloud';
import { handleCachedApiResponse } from '../../utils/cacheUtils';
import { CACHE_KEYS, DEFAULT_RANGES } from '../../utils/cacheUtils';

export const daysAgo = 14;
const debug = false;
const useCache = !debug;

export default async (req: NextApiRequest, res: NextApiResponse) => {
  await handleCachedApiResponse(
    req, 
    res, 
    CloudMetrics, 
    cleanTransformCloud, 
    CACHE_KEYS.CLOUD_METRICS,
    DEFAULT_RANGES.CLOUD
  );
};