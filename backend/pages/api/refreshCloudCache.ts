import { NextApiRequest, NextApiResponse } from 'next';
import { CloudMetrics } from '../../models/BenchmarkMetrics';
import { cleanTransformCloud } from '../../utils/processCloud';
import { refreshCache } from '../../utils/cacheUtils';
import { daysAgo } from './cloud';
import { CACHE_KEYS } from '../../utils/cacheUtils';

const refreshCloudCacheHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    await refreshCache(req, res, CloudMetrics, cleanTransformCloud, CACHE_KEYS.CLOUD_METRICS, daysAgo);
};

export default refreshCloudCacheHandler;