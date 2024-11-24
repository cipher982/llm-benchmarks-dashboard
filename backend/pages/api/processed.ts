import type { NextApiRequest, NextApiResponse } from "next";
import { CloudMetrics } from '../../models/BenchmarkMetrics';
import connectToMongoDB from '../../utils/connectToMongoDB';
import { processSpeedDistData, processTimeSeriesData, processRawTableData } from '../../utils/dataProcessing';
import { cleanTransformCloud } from '../../utils/processCloud';
import { corsMiddleware } from '../../utils/apiMiddleware';
import { CACHE_KEYS } from '../../utils/cacheUtils';
import redisClient from '../../utils/redisClient';
import logger from '../../utils/logger';
import { roundNumbers } from '../../utils/dataUtils';

const debug = false; // Set to true to disable cache
const useCache = !debug;
export const DEFAULT_DAYS = 14;

interface TimeRange {
    days: number;
}

function parseTimeRange(req: NextApiRequest): TimeRange {
    const days = req.query.days ? parseInt(req.query.days as string) : DEFAULT_DAYS;
    return { days: Math.min(Math.max(1, days), 90) }; // Limit between 1 and 90 days
}

async function processMetrics(rawMetrics: any[], days: number) {
    // Apply transformations and processing
    const startTime = process.hrtime.bigint();
    const transformedData = cleanTransformCloud(rawMetrics);
    const endTime = process.hrtime.bigint();
    logger.info(`cleanTransformCloud took ${(endTime - startTime) / 1000000n}ms`);

    const startTime2 = process.hrtime.bigint();
    const speedDistData = processSpeedDistData(transformedData);
    const endTime2 = process.hrtime.bigint();
    logger.info(`processSpeedDistData took ${(endTime2 - startTime2) / 1000000n}ms`);

    const startTime3 = process.hrtime.bigint();
    const timeSeriesData = processTimeSeriesData(transformedData, days);
    const endTime3 = process.hrtime.bigint();
    logger.info(`processTimeSeriesData took ${(endTime3 - startTime3) / 1000000n}ms`);

    const startTime4 = process.hrtime.bigint();
    const tableData = processRawTableData(transformedData);
    const endTime4 = process.hrtime.bigint();
    logger.info(`processRawTableData took ${(endTime4 - startTime4) / 1000000n}ms`);

    const response = {
        speedDistribution: speedDistData,
        timeSeries: timeSeriesData,
        table: tableData
    };

    // Log first item's density points for verification
    if (speedDistData.length > 0) {
        logger.info(`First model density points sample: ${
            JSON.stringify(speedDistData[0].density_points.slice(0, 3))
        }`);
    }

    // Log sizes for analysis
    console.log('Data sizes (KB):');
    console.log('Speed Distribution:', (JSON.stringify(speedDistData).length / 1024).toFixed(2));
    console.log('Time Series:', (JSON.stringify(timeSeriesData).length / 1024).toFixed(2));
    console.log('Table:', (JSON.stringify(tableData).length / 1024).toFixed(2));

    return roundNumbers(response);
}

async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    logger.info('=== Processing metrics ===');
    const timeRange = parseTimeRange(req);
    logger.info(`Fetching data for last ${timeRange.days} days`);

    try {
        // Check cache first if enabled
        if (useCache) {
            const cacheKey = `${CACHE_KEYS.RAW_MONGO_METRICS}_${timeRange.days}`;
            const startTime_cache = process.hrtime.bigint();
            const cachedData = await redisClient.get(cacheKey);
            if (cachedData) {
                logger.info('Serving raw metrics from cache');
                const rawMetrics = JSON.parse(cachedData);
                const endTime_cache = process.hrtime.bigint();
                logger.info(`Cache lookup took ${(endTime_cache - startTime_cache) / 1000000n}ms`);
                const processedResponse = await processMetrics(rawMetrics, timeRange.days);
                return res.status(200).json(processedResponse);
            }
        }

        const startTime_all = process.hrtime.bigint();

        // If not cached or cache disabled, fetch from MongoDB
        logger.info('Starting MongoDB fetch (no cache)');
        const startTime0 = process.hrtime.bigint();
        await connectToMongoDB();
        const dateFilter = new Date();
        dateFilter.setDate(dateFilter.getDate() - timeRange.days);
        const metrics = await CloudMetrics.find({
            run_ts: { $gte: dateFilter }
        }).select('-times_between_tokens');
        const rawMetrics = metrics.map(metric => metric.toObject());
        console.log('MongoDB Response - Raw metrics:', rawMetrics.length);
        const endTime0 = process.hrtime.bigint();
        logger.info(`MongoDB fetch took ${(endTime0 - startTime0) / 1000000n}ms`);

        // Cache the raw MongoDB data if caching is enabled
        if (useCache) {
            logger.info('Caching raw MongoDB metrics');
            await redisClient.set(
                `${CACHE_KEYS.RAW_MONGO_METRICS}_${timeRange.days}`,
                JSON.stringify(rawMetrics)
            );
            await redisClient.set(
                `${CACHE_KEYS.RAW_MONGO_METRICS_LAST_UPDATE}_${timeRange.days}`,
                Date.now().toString()
            );
        }

        const processedResponse = await processMetrics(rawMetrics, timeRange.days);

        const endTime_all = process.hrtime.bigint();
        logger.info(`Total processing took ${(endTime_all - startTime_all) / 1000000n}ms`);

        return res.status(200).json(processedResponse);
    } catch (error) {
        console.error('Error processing metrics:', error);
        return res.status(500).json({ error: 'Failed to process metrics' });
    }
}

// Wrap the handler with the existing CORS middleware
export default async function (req: NextApiRequest, res: NextApiResponse) {
    const handled = await corsMiddleware(req, res);
    if (handled) return;
    return handler(req, res);
}