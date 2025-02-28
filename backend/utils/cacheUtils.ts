import { NextApiRequest, NextApiResponse } from 'next';
import { fetchAndProcessMetrics } from './apiMiddleware';
import logger from './logger';
import redisClient from './redisClient';

// Default date ranges for different metric types
export const DEFAULT_RANGES = {
    CLOUD: 10,  // 14 days for cloud metrics
    LOCAL: 1000, // 1000 days for local metrics
    PROCESSED: 3 // 3 days default for processed metrics
};

export const CACHE_KEYS = {
    // Base keys without date range
    CLOUD_METRICS: 'cloudMetrics',
    LOCAL_METRICS: 'localMetrics',
    PROCESSED_METRICS: 'processedMetrics',
    MODEL_METRICS: 'modelMetrics',
};

// Helper to get cache key with date range
export function getCacheKey(baseKey: string, days: number): string {
    return `${baseKey}:${days}days`;
}

// Helper to get last update key
export function getLastUpdateKey(baseKey: string, days: number): string {
    return `${getCacheKey(baseKey, days)}:lastUpdate`;
}

// Helper to get model-specific cache key
export function getModelCacheKey(provider: string, modelName: string, days: number): string {
    return `${CACHE_KEYS.MODEL_METRICS}:${provider}:${modelName}:${days}days`;
}

async function shouldRefreshCache(cacheKey: string): Promise<boolean> {
    const lastUpdate = await redisClient.get(getLastUpdateKey(cacheKey, parseInt(cacheKey.split(':')[1].split('days')[0])));
    return !lastUpdate || Date.now() - parseInt(lastUpdate) > 3600000; // 1 hour
}

async function serveCachedData(res: NextApiResponse, cacheKey: string) {
    const cachedData = await redisClient.get(cacheKey);
    if (!cachedData) return false;
    logger.info(`Serving ${cacheKey} from cache`);
    res.status(200).json(JSON.parse(cachedData));
    return true;
}

async function updateCache(cacheKey: string, processedMetrics: any) {
    await redisClient.set(cacheKey, JSON.stringify(processedMetrics));
    await redisClient.set(getLastUpdateKey(cacheKey, parseInt(cacheKey.split(':')[1].split('days')[0])), Date.now().toString());
    logger.info(`Cache updated successfully for ${cacheKey}`);
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

// NEW FUNCTIONS FOR TIERED CACHING SYSTEM

/**
 * Get processed data from cache or fetch and process it if needed
 * @param days Number of days to look back
 * @returns Processed metrics
 */
export async function getProcessedDataFromCache(days: number): Promise<any> {
    const cacheKey = getCacheKey(CACHE_KEYS.PROCESSED_METRICS, days);
    
    // Try to get from cache first
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
        logger.info(`Retrieved processed data from cache (${cacheKey})`);
        return JSON.parse(cachedData);
    }
    
    // If not in cache, return null - the caller should handle fetching the raw data
    logger.info(`No processed data in cache for ${cacheKey}`);
    return null;
}

/**
 * Filter processed data for a specific model
 * @param processedData Full processed data
 * @param provider Provider name
 * @param modelName Model name (can be a slug or original name)
 * @returns Filtered model data
 */
export function filterProcessedDataForModel(processedData: any, provider: string, modelName: string): any {
    if (!processedData || !processedData.speedDistribution || !processedData.timeSeries || !processedData.table) {
        logger.error('Invalid processed data format for filtering');
        return null;
    }
    
    logger.info(`Filtering data for ${provider}/${modelName}`);
    
    // Create slug-friendly versions for comparison
    const normalizeForComparison = (text: string): string => {
        return text.toLowerCase().replace(/[^\w ]+/g, "").replace(/ +/g, "-");
    };
    
    const modelSlug = normalizeForComparison(modelName);
    const providerSlug = normalizeForComparison(provider);
    
    // Filter speed distribution data
    const speedDistData = processedData.speedDistribution.filter((item: any) => {
        const itemProviderSlug = normalizeForComparison(item.provider);
        const itemModelSlug = normalizeForComparison(item.model_name);
        return itemProviderSlug === providerSlug && itemModelSlug === modelSlug;
    });
    
    // Filter time series data
    const timeSeriesData = {
        timestamps: processedData.timeSeries.timestamps,
        models: processedData.timeSeries.models.filter((model: any) => {
            const itemModelSlug = normalizeForComparison(model.model_name);
            return itemModelSlug === modelSlug;
        })
    };
    
    // Filter table data
    const tableData = processedData.table.filter((item: any) => {
        const itemProviderSlug = normalizeForComparison(item.provider);
        const itemModelSlug = normalizeForComparison(item.model_name);
        return itemProviderSlug === providerSlug && itemModelSlug === modelSlug;
    });
    
    // If no data found, return null
    if (speedDistData.length === 0 && timeSeriesData.models.length === 0 && tableData.length === 0) {
        logger.info(`No data found for ${provider}/${modelName}`);
        return null;
    }
    
    // Debug log
    logger.info(`Found data: ${speedDistData.length} speed points, ${timeSeriesData.models.length} time series, ${tableData.length} table rows`);
    
    // Construct and return the filtered data
    const displayName = speedDistData[0]?.display_name || modelName;
    
    return {
        speedDistribution: speedDistData,
        timeSeries: timeSeriesData,
        table: tableData,
        model: {
            provider: provider,
            model_name: modelName,
            display_name: displayName
        }
    };
}

/**
 * Cache and return model-specific data
 * @param cacheKey Cache key for model-specific data
 * @param modelData Filtered model data
 * @param res Response object
 */
export async function cacheAndReturnModelData(cacheKey: string, modelData: any, res: NextApiResponse): Promise<void> {
    if (!modelData) {
        res.status(404).json({ error: 'No data found for this model' });
        return;
    }
    
    // Cache the model-specific data
    await updateCache(cacheKey, modelData);
    
    // Return the data
    res.status(200).json(modelData);
}

/**
 * Handle model-specific API requests with tiered caching
 */
export async function handleModelSpecificApiRequest(
    req: NextApiRequest,
    res: NextApiResponse,
    model: { find: (query?: any) => any },
    processRawData: (rawData: any[], days: number) => Promise<any> | any,
    filterModelFn: (processedData: any, provider: string, modelName: string, days: number) => any,
    provider: string,
    modelName: string,
    days: number
) {
    // Log request details
    logger.info(`Model request: ${provider}/${modelName} (${days} days)`);
    
    // 1. Try to get cached model-specific data first
    const modelCacheKey = getModelCacheKey(provider, modelName, days);
    const cachedModelData = await redisClient.get(modelCacheKey);
    
    if (cachedModelData) {
        logger.info(`Serving model-specific data from cache for ${provider}/${modelName}`);
        res.status(200).json(JSON.parse(cachedModelData));
        return;
    }
    
    // 2. If no model cache, try to get processed data cache
    const processedCacheKey = getCacheKey(CACHE_KEYS.PROCESSED_METRICS, days);
    const cachedProcessedData = await redisClient.get(processedCacheKey);
    
    if (cachedProcessedData) {
        // Filter the processed data for this model
        logger.info(`Filtering processed data for ${provider}/${modelName}`);
        const processedData = JSON.parse(cachedProcessedData);
        const modelData = filterModelFn(processedData, provider, modelName, days);
        
        if (modelData) {
            // Cache and return the filtered data
            await updateCache(modelCacheKey, modelData);
            res.status(200).json(modelData);
            return;
        } else {
            logger.info(`No data found for ${provider}/${modelName} in processed data`);
        }
    }
    
    // 3. If no processed data cache or model not found, fetch raw data and process
    logger.info(`No cache available for ${provider}/${modelName}, fetching raw data`);
    try {
        // Fetch raw data
        const rawMetricsResult = await fetchAndProcessMetrics(model, days, (rawData) => rawData);
        const rawMetrics = Array.isArray(rawMetricsResult) ? rawMetricsResult : (rawMetricsResult.raw || []);
        
        // Process the raw data fully
        const processedData = await processRawData(rawMetrics, days);
        
        // Cache the processed data
        await updateCache(processedCacheKey, processedData);
        
        // Filter for this model
        const modelData = filterModelFn(processedData, provider, modelName, days);
        
        if (!modelData) {
            logger.warn(`Model not found: ${provider}/${modelName}`);
            res.status(404).json({ 
                error: 'No data found for this model',
                message: `No data available for ${provider}/${modelName}`
            });
            return;
        }
        
        // Cache and return the model data
        await updateCache(modelCacheKey, modelData);
        res.status(200).json(modelData);
    } catch (error) {
        logger.error(`Error processing model-specific data: ${error}`);
        res.status(500).json({ error: 'Failed to process model metrics' });
    }
}