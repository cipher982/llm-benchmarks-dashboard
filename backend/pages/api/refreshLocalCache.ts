import { NextApiRequest, NextApiResponse } from 'next';
import { LocalMetrics } from '../../models/BenchmarkMetrics';
import { cleanTransformLocal } from '../../utils/processLocal';
import { refreshCache } from '../../utils/cacheUtils';
import { daysAgo } from './local';

const refreshLocalCacheHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    await refreshCache(req, res, LocalMetrics, cleanTransformLocal, 'localMetrics:365days', daysAgo);
};

export default refreshLocalCacheHandler;