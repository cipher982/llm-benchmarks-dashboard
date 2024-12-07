import { NextApiRequest, NextApiResponse } from 'next';
import { LocalMetrics } from '../../models/BenchmarkMetrics';
import { cleanTransformLocal } from '../../utils/processLocal';
import { handleCachedApiResponse } from '../../utils/cacheUtils';
import { CACHE_KEYS, DEFAULT_RANGES } from '../../utils/cacheUtils';

export const daysAgo = 1000;
const debug = false;
const useCache = !debug;

export default async (req: NextApiRequest, res: NextApiResponse) => {
  await handleCachedApiResponse(
    req, 
    res, 
    LocalMetrics, 
    cleanTransformLocal, 
    CACHE_KEYS.LOCAL_METRICS,
    DEFAULT_RANGES.LOCAL
  );
};