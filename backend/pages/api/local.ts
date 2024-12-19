import { NextApiRequest, NextApiResponse } from 'next';
import { LocalMetrics } from '../../models/BenchmarkMetrics';
import { cleanTransformLocal } from '../../utils/processLocal';
import { handleCachedApiResponse } from '../../utils/cacheUtils';
import { CACHE_KEYS, DEFAULT_RANGES } from '../../utils/cacheUtils';
import { corsMiddleware } from '../../utils/apiMiddleware';

export const daysAgo = 1000;
const debug = false;
const useCache = !debug;

export default async function (req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight
  const corsHandled = await corsMiddleware(req, res);
  if (corsHandled) return;

  await handleCachedApiResponse(
    req, 
    res, 
    LocalMetrics, 
    cleanTransformLocal, 
    CACHE_KEYS.LOCAL_METRICS,
    DEFAULT_RANGES.LOCAL
  );
}