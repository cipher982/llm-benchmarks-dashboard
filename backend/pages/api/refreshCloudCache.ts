import { NextApiRequest, NextApiResponse } from 'next';
import { CloudMetrics } from '../../models/BenchmarkMetrics';
import { cleanTransformCloud } from '../../utils/processCloud';
import { refreshCache } from '../../utils/cacheUtils';
import { daysAgo } from './cloud';
import { CACHE_KEYS } from '../../utils/cacheUtils';

const refreshCloudCacheHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    // Add forceRefresh property to the existing request object
    (req as NextApiRequest & { forceRefresh: boolean }).forceRefresh = true;
    await refreshCache(req as NextApiRequest & { forceRefresh: boolean }, res, CloudMetrics, cleanTransformCloud, CACHE_KEYS.CLOUD_METRICS, daysAgo);
};

export default refreshCloudCacheHandler;