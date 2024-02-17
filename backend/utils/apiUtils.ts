import { NextApiRequest, NextApiResponse } from 'next';
import logger from './logger';
import connectToMongoDB from './connectToMongoDB';
import redisClient from './redisClient';

async function shouldRefreshCache(cacheKey: string): Promise<boolean> {
    const lastUpdateKey = `${cacheKey}_lastUpdate`;
    const lastUpdate = await redisClient.get(lastUpdateKey);
    return !lastUpdate || Date.now() - parseInt(lastUpdate) > 3600000; // 1 hour
}

async function serveCachedData(res: NextApiResponse, cacheKey: string) {
    const cachedData = await redisClient.get(cacheKey);
    if (!cachedData) return false;
    logger.info("Serving from cache");
    const processedMetrics = JSON.parse(cachedData);
    res.status(200).json(processedMetrics);
    return true;
}

export async function handleApiRequest(
    req: NextApiRequest,
    res: NextApiResponse,
    model: { find: (query?: any) => any },
    cleanTransform: (rawData: any[]) => any[],
    cacheKey: string,
    daysAgo: number = 365
) {
    if (req.method !== "GET") {
        logger.warn(`Method ${req.method} not allowed`);
        res.setHeader("Allow", ["GET"]);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const serveAndCacheData = async () => {
        await connectToMongoDB();
        const dateFilter = new Date();
        dateFilter.setDate(dateFilter.getDate() - daysAgo);
        const metrics = await model.find({ run_ts: { $gte: dateFilter } }).select('-times_between_tokens');
        const rawMetrics = metrics.map((metric: any) => metric.toObject());

        if (rawMetrics.length === 0) {
            logger.info("No new metrics found for cache update");
            return;
        }

        const processedMetrics = cleanTransform(rawMetrics);
        await redisClient.set(cacheKey, JSON.stringify(processedMetrics));
        await redisClient.set(`${cacheKey}_lastUpdate`, Date.now().toString());
        logger.info("Cache updated successfully");
    };

    try {
        const cached = await serveCachedData(res, cacheKey);
        if (!cached) {
            logger.info("Cache miss, fetching data and updating cache");
            await serveAndCacheData();
            await serveCachedData(res, cacheKey) || res.status(404).json({ message: "No metrics found" });
        } else if (await shouldRefreshCache(cacheKey)) {
            serveAndCacheData().catch(error => logger.error(`Async cache update error: ${error}`));
        }
    } catch (error) {
        logger.error(`Error handling request: ${error}`);
        res.status(500).end("Internal Server Error");
    }
}