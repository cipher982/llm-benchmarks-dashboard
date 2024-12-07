import { NextApiRequest, NextApiResponse } from 'next';
import { CloudMetrics } from '../../models/BenchmarkMetrics';
import { processSpeedDistData, processTimeSeriesData, processRawTableData } from '../../utils/dataProcessing';
import { cleanTransformCloud } from '../../utils/processCloud';
import { corsMiddleware } from '../../utils/apiMiddleware';
import { CACHE_KEYS, DEFAULT_RANGES } from '../../utils/cacheUtils';
import { handleCachedApiResponse } from '../../utils/cacheUtils';
import logger from '../../utils/logger';
import { roundNumbers } from '../../utils/dataUtils';

// Default time range in days
const DEFAULT_DAYS = 3;

function parseTimeRange(req: NextApiRequest) {
    const days = req.query.days ? parseInt(req.query.days as string) : DEFAULT_DAYS;
    return {
        days: Math.min(Math.max(days, 1), 90) // Limit between 1-90 days
    };
}

async function processMetrics(rawMetrics: any[], days: number) {
    // Log initial data
    
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

    // Log sizes for analysis
    if (speedDistData.length > 0) {
        logger.info(`First model density points sample: ${
            JSON.stringify(speedDistData[0].density_points.slice(0, 3))
        }`);
    }
    console.log('Data sizes (KB):');
    console.log('Speed Distribution:', (JSON.stringify(speedDistData).length / 1024).toFixed(2));
    console.log('Time Series:', (JSON.stringify(timeSeriesData).length / 1024).toFixed(2));
    console.log('Table:', (JSON.stringify(tableData).length / 1024).toFixed(2));

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
        await handleCachedApiResponse(
            req,
            res,
            CloudMetrics,
            async (rawMetrics: any[]) => {
                const timeRange = parseTimeRange(req);
                return await processMetrics(rawMetrics, timeRange.days);
            },
            CACHE_KEYS.PROCESSED_METRICS,
            DEFAULT_RANGES.PROCESSED
        );
    } catch (error) {
        console.error('Error processing metrics:', error);
        return res.status(500).json({ error: 'Failed to process metrics' });
    }
}

// Wrap the handler with the existing CORS middleware
export default async function (req: NextApiRequest, res: NextApiResponse) {
    // Handle CORS preflight
    const corsHandled = await corsMiddleware(req, res);
    if (corsHandled) return;

    // Handle the actual request
    return handler(req, res);
}