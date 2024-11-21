import { NextApiRequest, NextApiResponse } from 'next';
import { fetchAndProcessMetrics } from './apiMiddleware';
import logger from './logger';
import redisClient from './redisClient';

export const CACHE_KEYS = {
    CLOUD_METRICS: 'cloudMetrics:365days',
    CLOUD_METRICS_LAST_UPDATE: 'cloudMetrics:365days:lastUpdate',
    LOCAL_METRICS: 'localMetrics:365days',
    LOCAL_METRICS_LAST_UPDATE: 'localMetrics:365days:lastUpdate',
};

async function shouldRefreshCache(cacheKey: string): Promise<boolean> {
    const lastUpdate = await redisClient.get(cacheKey);
    return !lastUpdate || Date.now() - parseInt(lastUpdate) > 3600000; // 1 hour
}

async function serveCachedData(res: NextApiResponse, cacheKey: string) {
    const cachedData = await redisClient.get(cacheKey);
    if (!cachedData) return false;
    logger.info('Serving from cache');
    res.status(200).json(JSON.parse(cachedData));
    return true;
}

async function updateCache(cacheKey: string, processedMetrics: any) {
    await redisClient.set(cacheKey, JSON.stringify(processedMetrics));
    await redisClient.set(`${cacheKey}_lastUpdate`, Date.now().toString());
    logger.info('Cache updated successfully');
}

export async function refreshCache(req: NextApiRequest, res: NextApiResponse, model: { find: (query?: any) => any }, cleanTransform: (rawData: any[]) => any[], cacheKey: string, daysAgo: number) {
    const { method } = req;
    if (method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }

    try {
        const processedMetrics = await fetchAndProcessMetrics(model, daysAgo, cleanTransform);
        if (!processedMetrics) {
            logger.info('No new metrics found for cache update');
            return res.status(404).json({ message: 'No metrics found' });
        }
        logger.info(`Updating cache with ${processedMetrics.raw.length} metrics`);

        await updateCache(cacheKey, processedMetrics);

        const details = {
            totalMetrics: processedMetrics.raw.length,
        };

        res.status(200).json({
            message: 'Cache refreshed successfully',
            details: details,
        });
    } catch (error) {
        logger.error(`Error refreshing cache: ${error}`);
        res.status(500).end('Internal Server Error');
    }
}

export async function handleCachedApiResponse(
    req: NextApiRequest,
    res: NextApiResponse,
    model: { find: (query?: any) => any },
    cleanTransform: (rawData: any[]) => any[],
    cacheKey: string,
    daysAgo: number
) {
    const cached = await serveCachedData(res, cacheKey);
    if (!cached) {
        logger.info('Cache miss, fetching data and updating cache');
        await fetchAndUpdateCache(model, daysAgo, cleanTransform, cacheKey);
        await serveCachedData(res, cacheKey);
    } else if (await shouldRefreshCache(cacheKey)) {
        fetchAndUpdateCache(model, daysAgo, cleanTransform, cacheKey).catch((error) =>
            logger.error(`Async cache update error: ${error}`)
        );
    }
}

async function fetchAndUpdateCache(
    model: { find: (query?: any) => any },
    daysAgo: number,
    cleanTransform: (rawData: any[]) => any[],
    cacheKey: string
) {
    const processedMetrics = await fetchAndProcessMetrics(model, daysAgo, cleanTransform);
    if (processedMetrics) {
        await updateCache(cacheKey, processedMetrics);
    }
}