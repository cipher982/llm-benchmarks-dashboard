import { NextApiRequest, NextApiResponse } from 'next';
import { CloudMetrics } from '../../models/BenchmarkMetrics';
import { refreshCache } from '../../utils/cacheUtils';
import { daysAgo } from './cloud';
import { CACHE_KEYS } from '../../utils/cacheUtils';
import { processAllMetrics } from './processed';
import redisClient from '../../utils/redisClient';
import logger from '../../utils/logger';
import { fetchAndProcessMetrics } from '../../utils/apiMiddleware';
import { getCacheKey, getLastUpdateKey } from '../../utils/cacheUtils';

const refreshCloudCacheHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    try {
        // Get days parameter
        const days = req.query?.days ? parseInt(req.query.days as string) : daysAgo;
        
        // Get cache key
        const cacheKey = getCacheKey(CACHE_KEYS.CLOUD_METRICS, days);
        
        // Fetch raw data from MongoDB
        logger.info(`Fetching cloud metrics for last ${days} days`);
        const rawData = await fetchAndProcessMetrics(
            CloudMetrics,
            days,
            (data: any[]) => data // Just return the raw data
        );
        
        if (!rawData || (Array.isArray(rawData) && !rawData.length) || 
            (!Array.isArray(rawData) && (!rawData.raw || !rawData.raw.length))) {
            logger.warn('No cloud metrics found');
            return res.status(404).json({ message: 'No metrics found' });
        }
        
        // Process the data for frontend
        const metricsArray = Array.isArray(rawData) ? rawData : rawData.raw;
        logger.info(`Processing ${metricsArray.length} metrics`);
        const processedData = await processAllMetrics(metricsArray, days);
        
        // Cache the processed data
        await redisClient.set(cacheKey, JSON.stringify(processedData));
        await redisClient.set(getLastUpdateKey(cacheKey, days), Date.now().toString());
        
        logger.info(`Cached ${metricsArray.length} metrics to ${cacheKey}`);
        
        return res.status(200).json({
            message: 'Cache refreshed successfully',
            details: {
                totalMetrics: metricsArray.length
            }
        });
    } catch (error) {
        logger.error(`Error refreshing cache: ${error}`);
        return res.status(500).json({ message: 'Error refreshing cache', error: String(error) });
    }
};

export default refreshCloudCacheHandler;