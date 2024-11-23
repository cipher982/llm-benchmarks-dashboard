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

export const daysAgo = 14;
const debug = true; // Set to true to disable cache
const useCache = !debug;

async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        // Check cache first if enabled
        if (useCache) {
            const cachedData = await redisClient.get(CACHE_KEYS.PROCESSED_METRICS);
            if (cachedData) {
                logger.info('Serving processed metrics from cache');
                return res.status(200).json(JSON.parse(cachedData));
            }
        }

        const startTime_all = process.hrtime.bigint();

        // If not cached or cache disabled, compute the data
        logger.info('Starting MongoDB fetch');
        const startTime0 = process.hrtime.bigint();
        await connectToMongoDB();
        const dateFilter = new Date();
        dateFilter.setDate(dateFilter.getDate() - daysAgo);
        const metrics = await CloudMetrics.find({
            run_ts: { $gte: dateFilter }
        }).select('-times_between_tokens');
        const rawMetrics = metrics.map(metric => metric.toObject());
        console.log('MongoDB Response - Raw metrics:', rawMetrics.length);
        const endTime0 = process.hrtime.bigint();
        logger.info(`MongoDB fetch took ${(endTime0 - startTime0) / 1000000n}ms`);

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
        const timeSeriesData = processTimeSeriesData(transformedData);
        const endTime3 = process.hrtime.bigint();
        logger.info(`processTimeSeriesData took ${(endTime3 - startTime3) / 1000000n}ms`);

        const startTime4 = process.hrtime.bigint();
        const tableData = processRawTableData(transformedData);
        const endTime4 = process.hrtime.bigint();
        logger.info(`processRawTableData took ${(endTime4 - startTime4) / 1000000n}ms`);

        // Log first item's density points for verification
        if (speedDistData.length > 0) {
            logger.info(`First model density points sample: ${
                JSON.stringify(speedDistData[0].density_points.slice(0, 3))
            }`);
        }
        
        const response = {
            speedDistribution: speedDistData,
            timeSeries: timeSeriesData,
            table: tableData
        };

        // Round all numbers in the response to 3 significant digits
        const roundedResponse = roundNumbers(response);

        // Cache the processed data if caching is enabled
        if (useCache) {
            logger.info('Updating processed metrics cache');
            await redisClient.set(
                CACHE_KEYS.PROCESSED_METRICS,
                JSON.stringify(roundedResponse)
            );
            await redisClient.set(
                CACHE_KEYS.PROCESSED_METRICS_LAST_UPDATE,
                Date.now().toString()
            );
        }
        
        // Log sizes for analysis
        console.log('Data sizes (KB):');
        console.log('Speed Distribution:', (JSON.stringify(speedDistData).length / 1024).toFixed(2));
        console.log('Time Series:', (JSON.stringify(timeSeriesData).length / 1024).toFixed(2));
        console.log('Table:', (JSON.stringify(tableData).length / 1024).toFixed(2));
        console.log('Total:', (JSON.stringify(response).length / 1024).toFixed(2));

        const endTime_all = process.hrtime.bigint();
        logger.info(`Total processing took ${(endTime_all - startTime_all) / 1000000n}ms`);
        
        return res.status(200).json(roundedResponse);
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