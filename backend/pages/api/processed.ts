import type { NextApiRequest, NextApiResponse } from "next";
import { CloudMetrics } from '../../models/BenchmarkMetrics';
import connectToMongoDB from '../../utils/connectToMongoDB';
import { processSpeedDistData, processTimeSeriesData, processRawTableData } from '../../utils/dataProcessing';
import { cleanTransformCloud } from '../../utils/processCloud';
import { corsMiddleware } from '../../utils/apiMiddleware';
import { CACHE_KEYS } from '../../utils/cacheUtils';
import redisClient from '../../utils/redisClient';
import logger from '../../utils/logger';

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

        // If not cached or cache disabled, compute the data
        await connectToMongoDB();
        const dateFilter = new Date();
        dateFilter.setDate(dateFilter.getDate() - daysAgo);
        const metrics = await CloudMetrics.find({ 
            run_ts: { $gte: dateFilter } 
        }).select('-times_between_tokens');
        const rawMetrics = metrics.map(metric => metric.toObject());

        // Apply transformations and processing
        const transformedData = cleanTransformCloud(rawMetrics);
        const speedDistData = processSpeedDistData(transformedData);
        
        console.log('API Response - First model speed dist data:', {
            modelName: speedDistData[0]?.model_name,
            hasDensityPoints: Boolean(speedDistData[0]?.density_points),
            densityPointsLength: speedDistData[0]?.density_points?.length,
            firstDensityPoint: speedDistData[0]?.density_points?.[0]
        });
        
        const timeSeriesData = processTimeSeriesData(transformedData);
        const tableData = processRawTableData(transformedData);
        
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

        // Cache the processed data if caching is enabled
        if (useCache) {
            logger.info('Updating processed metrics cache');
            await redisClient.set(CACHE_KEYS.PROCESSED_METRICS, JSON.stringify(response));
            await redisClient.set(CACHE_KEYS.PROCESSED_METRICS_LAST_UPDATE, Date.now().toString());
        }
        
        // Log sizes for analysis
        console.log('Data sizes (KB):');
        console.log('Speed Distribution:', JSON.stringify(speedDistData).length / 1024);
        console.log('Time Series:', JSON.stringify(timeSeriesData).length / 1024);
        console.log('Table:', JSON.stringify(tableData).length / 1024);
        console.log('Total:', JSON.stringify(response).length / 1024);
        
        return res.status(200).json(response);
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