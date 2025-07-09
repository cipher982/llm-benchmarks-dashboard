import { NextApiRequest, NextApiResponse } from 'next';
import { CloudMetrics } from '../../models/BenchmarkMetrics';
import { processSpeedDistData, processTimeSeriesData, processRawTableData } from '../../utils/dataProcessing';
import { cleanTransformCloud } from '../../utils/processCloud';
import { corsMiddleware, fetchAndProcessMetrics } from '../../utils/apiMiddleware';
import logger from '../../utils/logger';
import { roundNumbers } from '../../utils/dataUtils';
import fs from 'fs/promises';
import path from 'path';

// Default time range in days
const DEFAULT_DAYS = 3;

// Static file serving
async function tryServeStaticFile(days: number, res: NextApiResponse): Promise<boolean> {
    const filename = `processed-${days}days.json`;
    const filepath = path.join(process.cwd(), 'public', 'api', filename);
    
    // Add debug header with file path attempt
    res.setHeader('X-Static-Path-Attempted', filepath);
    
    try {
        // Check if file exists and get its stats
        const stats = await fs.stat(filepath);
        const ageMinutes = (Date.now() - stats.mtime.getTime()) / (1000 * 60);
        
        // Add debug headers
        res.setHeader('X-Static-File-Found', 'true');
        res.setHeader('X-Static-File-Age-Minutes', Math.floor(ageMinutes).toString());
        
        // Serve file if it's less than 2 hours old
        if (ageMinutes < 120) {
            const data = await fs.readFile(filepath, 'utf8');
            const parsedData = JSON.parse(data);
            
            // Add headers to indicate static file serving
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('X-Cache-Status', 'STATIC-FILE');
            res.setHeader('X-Processing-Time', '1ms'); // Static files are instant
            
            logger.info(`📄 Served static file: ${filename} (${Math.floor(ageMinutes)}min old)`);
            res.status(200).json(parsedData);
            return true;
        } else {
            res.setHeader('X-Static-File-Status', 'STALE');
            logger.info(`⏰ Static file ${filename} is stale (${Math.floor(ageMinutes)}min old), using dynamic`);
        }
    } catch (error: any) {
        // File doesn't exist or other error - fall back to dynamic
        res.setHeader('X-Static-File-Found', 'false');
        res.setHeader('X-Static-File-Error', error.code || 'UNKNOWN');
        logger.info(`📄 Static file error for ${days} days: ${error.message}`);
    }
    
    return false;
}

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

    // Apply model mapping to ALL data BEFORE processing (not just timeSeriesData)
    const mappingStartTime = process.hrtime.bigint();
    const useDbModels = process.env.USE_DATABASE_MODELS === 'true';
    logger.info(`🔧 APPLYING MODEL MAPPING: useDbModels=${useDbModels}, transformedDataLength=${transformedData.length}`);
    const { mapModelNames } = await import('../../utils/modelMappingDB');
    const mappedData = await mapModelNames(transformedData, useDbModels);
    const mappingEndTime = process.hrtime.bigint();
    logger.info(`🔧 Model mapping took ${(mappingEndTime - mappingStartTime) / 1000000n}ms, mappedDataLength=${mappedData.length}`);

    // Run the processing operations in parallel
    // IMPORTANT: These three data structures serve different UI purposes:
    // - speedDistData: ALL provider-model combinations - each gets own distribution curve
    // - timeSeriesData: UNIQUE models only - each gets chart with multiple provider lines  
    // - tableData: ALL provider-model combinations - raw data table with clean names
    const startTimeParallel = process.hrtime.bigint();
    const [speedDistData, timeSeriesData, tableData] = await Promise.all([
        (async () => {
            const start = process.hrtime.bigint();
            const result = await processSpeedDistData(mappedData);
            const end = process.hrtime.bigint();
            logger.info(`processSpeedDistData took ${(end - start) / 1000000n}ms`);
            return result;
        })(),
        (async () => {
            const start = process.hrtime.bigint();
            const result = await processTimeSeriesData(mappedData, days);
            const end = process.hrtime.bigint();
            logger.info(`processTimeSeriesData took ${(end - start) / 1000000n}ms`);
            return result;
        })(),
        (async () => {
            const start = process.hrtime.bigint();
            const result = await processRawTableData(mappedData);
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

    const requestStartTime = Date.now();
    
    try {
        // Parse time range
        const timeRange = parseTimeRange(req);
        const days = timeRange.days;
        
        // Check if static file serving should be bypassed
        const useStatic = req.query.bypass_static !== "true"; // Static enabled by default
        
        // First priority: Try to serve static file (unless bypassed)
        if (useStatic) {
            const staticServed = await tryServeStaticFile(days, res);
            if (staticServed) {
                return; // Response already sent
            }
        }
        
        // If we reach here, static file was not available - generate dynamically
        logger.info(`Static file not available for days=${days}, generating dynamically`);
        
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
        
        // Add debugging headers
        res.setHeader("X-Cache-Status", "DYNAMIC-GENERATION");
        res.setHeader("X-Model-Mapping", process.env.USE_DATABASE_MODELS === 'true' ? "database" : "hardcoded");
        res.setHeader("X-Processing-Time", `${Date.now() - requestStartTime}ms`);
        
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