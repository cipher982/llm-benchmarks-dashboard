import { NextApiRequest, NextApiResponse } from 'next';
import { CloudMetrics } from '../../models/BenchmarkMetrics';
import { processSpeedDistData, processTimeSeriesData, processRawTableData } from '../../utils/dataProcessing';
import { cleanTransformCloud } from '../../utils/processCloud';
import { corsMiddleware, fetchAndProcessMetrics } from '../../utils/apiMiddleware';
import { CACHE_KEYS, DEFAULT_RANGES, getCacheKey, getLastUpdateKey } from '../../utils/cacheUtils';
import { handleCachedApiResponse } from '../../utils/cacheUtils';
import logger from '../../utils/logger';
import { roundNumbers } from '../../utils/dataUtils';
import redisClient from '../../utils/redisClient';

// Default time range in days
const DEFAULT_DAYS = 3;

function parseTimeRange(req: NextApiRequest) {
    const days = req.query.days ? parseInt(req.query.days as string) : DEFAULT_DAYS;
    return {
        days: Math.min(Math.max(days, 1), 90) // Limit between 1-90 days
    };
}

// This is the shared processing function used by both processed.ts and model.ts endpoints
// Performance optimization metrics are added here
export async function processAllMetrics(rawMetrics: any[], days: number) {
    // Transform data first since other operations depend on it
    const startTime = process.hrtime.bigint();
    const transformedData = cleanTransformCloud(rawMetrics);
    const endTime = process.hrtime.bigint();
    logger.info(`cleanTransformCloud took ${(endTime - startTime) / 1000000n}ms`);

    // Run the processing operations in parallel
    const startTimeParallel = process.hrtime.bigint();
    const [speedDistData, timeSeriesData, tableData] = await Promise.all([
        (async () => {
            const start = process.hrtime.bigint();
            const result = await processSpeedDistData(transformedData);
            const end = process.hrtime.bigint();
            logger.info(`processSpeedDistData took ${(end - start) / 1000000n}ms`);
            return result;
        })(),
        (async () => {
            const start = process.hrtime.bigint();
            const result = await processTimeSeriesData(transformedData, days);
            const end = process.hrtime.bigint();
            logger.info(`processTimeSeriesData took ${(end - start) / 1000000n}ms`);
            return result;
        })(),
        (async () => {
            const start = process.hrtime.bigint();
            const result = await processRawTableData(transformedData);
            const end = process.hrtime.bigint();
            logger.info(`processRawTableData took ${(end - start) / 1000000n}ms`);
            return result;
        })()
    ]);
    const endTimeParallel = process.hrtime.bigint();
    logger.info(`All parallel processing took ${(endTimeParallel - startTimeParallel) / 1000000n}ms`);

    // Log sizes for analysis
    if (speedDistData.length > 0) {
        logger.info(`First model density points sample: ${
            JSON.stringify(speedDistData[0].density_points.slice(0, 3))
        }`);
    }
    logger.info('Data sizes (KB):');
    logger.info(`Speed Distribution: ${(JSON.stringify(speedDistData).length / 1024).toFixed(2)}`);
    logger.info(`Time Series: ${(JSON.stringify(timeSeriesData).length / 1024).toFixed(2)}`);
    logger.info(`Table: ${(JSON.stringify(tableData).length / 1024).toFixed(2)}`);

    return roundNumbers({
        speedDistribution: speedDistData,
        timeSeries: timeSeriesData,
        table: tableData
    });
}

async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        // Parse time range
        const timeRange = parseTimeRange(req);
        const days = timeRange.days;
        const cacheKey = getCacheKey(CACHE_KEYS.CLOUD_METRICS, days);
        
        // Check if bypass_cache parameter is present
        const bypassCache = req.query.bypass_cache === "true";
        
        // Try to get from cache first (unless bypassing cache)
        if (!bypassCache) {
            const cachedData = await redisClient.get(cacheKey);
            if (cachedData) {
                logger.info(`Serving processed data from cache for days=${days}`);
                res.setHeader("Content-Type", "application/json");
                res.write(cachedData);
                res.end();
                return;
            }
        }
        
        // If we reach here, either cache bypass was requested or cache missed
        logger.info(`Cache ${bypassCache ? 'bypass' : 'miss'} for days=${days}`);
        
        // Fetch raw data from MongoDB
        const rawData = await fetchAndProcessMetrics(
            CloudMetrics,
            days,
            (data: any[]) => data
        );
        
        // Process the data
        const metricsArray = Array.isArray(rawData) ? rawData : (rawData.raw || []);
        
        if (!metricsArray.length) {
            logger.warn(`No metrics found for days=${days}`);
            return res.status(404).json({ message: 'No metrics found' });
        }
        
        logger.info(`Processing ${metricsArray.length} metrics`);
        const processedData = await processAllMetrics(metricsArray, days);
        
        // Cache the processed data (unless bypass was requested)
        if (!bypassCache) {
            await redisClient.set(cacheKey, JSON.stringify(processedData));
            await redisClient.set(getLastUpdateKey(cacheKey, days), Date.now().toString());
            logger.info(`Cached ${metricsArray.length} metrics to ${cacheKey}`);
        }
        
        // Return the processed data
        return res.status(200).json(processedData);
    } catch (error) {
        logger.error(`Error processing metrics: ${error}`);
        return res.status(500).json({ error: 'Failed to process metrics' });
    }
}

// Wrap the handler with the existing CORS middleware
export default async function processedHandler(req: NextApiRequest, res: NextApiResponse) {
    // Handle CORS preflight
    const corsHandled = await corsMiddleware(req, res);
    if (corsHandled) return;

    // Handle the actual request
    return handler(req, res);
}