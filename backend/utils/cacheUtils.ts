import { NextApiRequest, NextApiResponse } from 'next';
import logger from './logger';
import connectToMongoDB from './connectToMongoDB';
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

async function fetchAndProcessMetrics(model: { find: (query?: any) => any }, daysAgo: number, cleanTransform: (rawData: any[]) => any[]) {
    await connectToMongoDB();
    const dateFilter = new Date();
    dateFilter.setDate(dateFilter.getDate() - daysAgo);
    const metrics = await model.find({ run_ts: { $gte: dateFilter } }).select('-times_between_tokens');
    const rawMetrics = metrics.map((metric: any) => metric.toObject());
    return rawMetrics.length === 0 ? null : cleanTransform(rawMetrics);
}

async function updateCache(cacheKey: string, processedMetrics: any) {
    await redisClient.set(cacheKey, JSON.stringify(processedMetrics));
    await redisClient.set(`${cacheKey}_lastUpdate`, Date.now().toString());
    logger.info('Cache updated successfully');
}

export async function refreshCache(req: NextApiRequest, res: NextApiResponse, model: { find: (query?: any) => any }, cleanTransform: (rawData: any[]) => any[], cacheKey: string, daysAgo: number = 365) {
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

        await updateCache(cacheKey, processedMetrics);

        const details = {
            totalMetrics: processedMetrics.length,
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

export async function handleCachedApiResponse(req: NextApiRequest, res: NextApiResponse, model: { find: (query?: any) => any }, cleanTransform: (rawData: any[]) => any[], cacheKey: string, daysAgo: number = 365) {
    const { method } = req;
    if (method !== 'GET') {
        logger.warn(`Method ${method} not allowed`);
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }

    try {
        const cached = await serveCachedData(res, cacheKey);
        if (!cached) {
            logger.info('Cache miss, fetching data and updating cache');
            const processedMetrics = await fetchAndProcessMetrics(model, daysAgo, cleanTransform);
            if (!processedMetrics) {
                return res.status(404).json({ message: 'No metrics found' });
            }
            await updateCache(cacheKey, processedMetrics);
            await serveCachedData(res, cacheKey);
        } else if (await shouldRefreshCache(cacheKey)) {
            fetchAndProcessMetrics(model, daysAgo, cleanTransform)
                .then((processedMetrics) => {
                    if (processedMetrics) {
                        updateCache(cacheKey, processedMetrics);
                    }
                })
                .catch((error) => logger.error(`Async cache update error: ${error}`));
        }
    } catch (error) {
        logger.error(`Error handling request: ${error}`);
        res.status(500).end('Internal Server Error');
    }
}