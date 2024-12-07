import { NextApiRequest, NextApiResponse } from 'next';
import { fetchAndProcessMetrics } from './apiMiddleware';
import logger from './logger';
import redisClient from './redisClient';

// Default date ranges for different metric types
export const DEFAULT_RANGES = {
    CLOUD: 14,  // 14 days for cloud metrics
    LOCAL: 1000, // 1000 days for local metrics
    PROCESSED: 3 // 3 days default for processed metrics
};

export const CACHE_KEYS = {
    // Base keys without date range
    CLOUD_METRICS: 'cloudMetrics',
    LOCAL_METRICS: 'localMetrics',
    PROCESSED_METRICS: 'processedMetrics',
};

// Helper to get cache key with date range
export function getCacheKey(baseKey: string, days: number): string {
    return `${baseKey}:${days}days`;
}

// Helper to get last update key
export function getLastUpdateKey(baseKey: string, days: number): string {
    return `${getCacheKey(baseKey, days)}:lastUpdate`;
}

async function shouldRefreshCache(cacheKey: string): Promise<boolean> {
    const lastUpdate = await redisClient.get(getLastUpdateKey(cacheKey, parseInt(cacheKey.split(':')[1].split('days')[0])));
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
    await redisClient.set(getLastUpdateKey(cacheKey, parseInt(cacheKey.split(':')[1].split('days')[0])), Date.now().toString());
    logger.info('Cache updated successfully');
}

export async function refreshCache(
    req: NextApiRequest,
    res: NextApiResponse,
    model: { find: (query?: any) => any },
    cleanTransform: (rawData: any[]) => Promise<any[] | { raw: any[]; [key: string]: any }> | any[] | { raw: any[]; [key: string]: any },
    baseKey: string,
    defaultDays: number
) {
    const { method } = req;
    if (method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }

    try {
        const days = req.query.days ? parseInt(req.query.days as string) : defaultDays;
        const cacheKey = getCacheKey(baseKey, days);

        // Check if we should refresh the cache
        if (!await shouldRefreshCache(cacheKey)) {
            logger.info('Cache is still fresh');
            return res.status(200).json({ message: 'Cache is fresh' });
        }

        // Fetch and process new metrics
        const processedMetrics = await fetchAndProcessMetrics(model, days, cleanTransform);
        // Normalize to object with raw property if it's an array
        const normalizedMetrics = Array.isArray(processedMetrics) ? { raw: processedMetrics } : processedMetrics;
        
        if (!normalizedMetrics.raw?.length) {
            logger.info('No new metrics found for cache update');
            return res.status(404).json({ message: 'No metrics found' });
        }
        logger.info(`Updating cache with ${normalizedMetrics.raw.length} metrics`);

        await updateCache(cacheKey, normalizedMetrics);

        const details = {
            totalMetrics: normalizedMetrics.raw.length,
        };

        return res.status(200).json({
            message: 'Cache refreshed successfully',
            details
        });
    } catch (error) {
        logger.error(`Error refreshing cache: ${error}`);
        return res.status(500).json({ message: 'Error refreshing cache' });
    }
}

export async function handleCachedApiResponse(
    req: NextApiRequest,
    res: NextApiResponse,
    model: { find: (query?: any) => any },
    cleanTransform: (rawData: any[]) => Promise<any[] | { raw: any[]; [key: string]: any }> | any[] | { raw: any[]; [key: string]: any },
    baseKey: string,
    defaultDays: number
) {
    // Get days from query param or use default
    const days = req.query.days ? parseInt(req.query.days as string) : defaultDays;
    const cacheKey = getCacheKey(baseKey, days);
    
    // First try to serve from cache
    const cached = await serveCachedData(res, cacheKey);
    
    if (!cached) {
        // If no cache exists, fetch and cache data synchronously for first request
        logger.info('No cache exists, fetching data synchronously');
        const processedMetrics = await fetchAndUpdateCache(model, days, cleanTransform, cacheKey);
        if (!processedMetrics.raw?.length) {
            return res.status(404).json({ message: 'No metrics found' });
        }
        res.status(200).json(processedMetrics);
    } else {
        // Always trigger a background refresh after serving from cache
        logger.info('Triggering background cache refresh');
        fetchAndUpdateCache(model, days, cleanTransform, cacheKey).catch((error) =>
            logger.error(`Background cache refresh error: ${error}`)
        );
    }
}

async function fetchAndUpdateCache(
    model: { find: (query?: any) => any },
    days: number,
    cleanTransform: (rawData: any[]) => Promise<any[] | { raw: any[]; [key: string]: any }> | any[] | { raw: any[]; [key: string]: any },
    cacheKey: string
) {
    const processedMetrics = await fetchAndProcessMetrics(model, days, cleanTransform);
    const metricsLength = Array.isArray(processedMetrics) ? processedMetrics.length : processedMetrics.raw?.length || 0;
    
    // If array, wrap it in an object with raw property
    const metricsToCache = Array.isArray(processedMetrics) ? { raw: processedMetrics } : processedMetrics;
    
    await updateCache(cacheKey, metricsToCache);
    return metricsToCache;
}