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
            const result = processSpeedDistData(transformedData);
            const end = process.hrtime.bigint();
            logger.info(`processSpeedDistData took ${(end - start) / 1000000n}ms`);
            return result;
        })(),
        (async () => {
            const start = process.hrtime.bigint();
            const result = processTimeSeriesData(transformedData, days);
            const end = process.hrtime.bigint();
            logger.info(`processTimeSeriesData took ${(end - start) / 1000000n}ms`);
            return result;
        })(),
        (async () => {
            const start = process.hrtime.bigint();
            const result = processRawTableData(transformedData);
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
        await handleCachedApiResponse(
            req,
            res,
            CloudMetrics,
            (rawMetrics: any[]) => {
                const timeRange = parseTimeRange(req);
                return processAllMetrics(rawMetrics, timeRange.days);
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