import { NextApiRequest, NextApiResponse } from 'next';
import { CloudMetrics } from '../../models/BenchmarkMetrics';
import { refreshCache } from '../../utils/cacheUtils';
import { daysAgo } from './cloud';
import { CACHE_KEYS } from '../../utils/cacheUtils';
import { processAllMetrics } from './processed';

const refreshCloudCacheHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    // Add forceRefresh property to the existing request object
    (req as NextApiRequest & { forceRefresh: boolean }).forceRefresh = true;
    // Use CLOUD_METRICS with full processing
    await refreshCache(
        req as NextApiRequest & { forceRefresh: boolean }, 
        res, 
        CloudMetrics, 
        async (rawData: any[]) => {
            const days = req.query?.days ? parseInt(req.query.days as string) : daysAgo;
            return processAllMetrics(rawData, days);
        }, 
        CACHE_KEYS.CLOUD_METRICS, 
        daysAgo
    );
};

export default refreshCloudCacheHandler;