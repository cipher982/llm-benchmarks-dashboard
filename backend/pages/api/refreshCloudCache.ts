import { NextApiRequest, NextApiResponse } from 'next';
import { CloudMetrics } from '../../models/BenchmarkMetrics';
import { cleanTransformCloud } from '../../utils/processCloud';
import { refreshCache } from '../../utils/cacheUtils';
import { daysAgo } from './cloud';

const refreshCloudCacheHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    await refreshCache(req, res, CloudMetrics, cleanTransformCloud, 'cloudMetrics:365days', daysAgo);
};

export default refreshCloudCacheHandler;