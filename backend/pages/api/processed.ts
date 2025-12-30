import { NextApiRequest, NextApiResponse } from 'next';
import { CloudMetrics } from '../../models/BenchmarkMetrics';
import { processSpeedDistData, processTimeSeriesData, processRawTableData, TableFilterOptions } from '../../utils/dataProcessing';
import { cleanTransformCloud } from '../../utils/processCloud';
import { corsMiddleware, fetchAndProcessMetrics } from '../../utils/apiMiddleware';
import logger from '../../utils/logger';
import { roundNumbers } from '../../utils/dataUtils';
import fs from 'fs/promises';
import path from 'path';

// Default time range in days
const DEFAULT_DAYS = 3;
const FLAGGED_STATUSES = new Set([
    'likely_deprecated',
    'deprecated',
    'failing',
    'stale',
    'never_succeeded',
    'disabled'
]);

function parseBoolParam(value: string | string[] | undefined): boolean {
    if (Array.isArray(value)) {
        return value.some(item => parseBoolParam(item));
    }
    if (!value) return false;
    const normalized = value.toString().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

function parseLifecycleFilters(req: NextApiRequest): TableFilterOptions | undefined {
    const filters: TableFilterOptions = {};

    const statusParam = req.query.status;
    const statuses: string[] = [];

    if (Array.isArray(statusParam)) {
        statusParam.forEach(item => {
            if (typeof item === 'string') {
                item.split(',').forEach(token => {
                    const trimmed = token.trim();
                    if (trimmed) statuses.push(trimmed);
                });
            }
        });
    } else if (typeof statusParam === 'string') {
        statusParam.split(',').forEach(token => {
            const trimmed = token.trim();
            if (trimmed) statuses.push(trimmed);
        });
    }

    if (statuses.length > 0) {
        filters.allowedStatuses = new Set(statuses);
    }

    if (parseBoolParam(req.query.hideFlagged)) {
        filters.hideFlagged = true;
    }

    if (!filters.allowedStatuses && !filters.hideFlagged) {
        return undefined;
    }

    return filters;
}

function buildCacheKey(days: number, filters?: TableFilterOptions, include?: string[]): string {
    const allowedKey = filters?.allowedStatuses
        ? Array.from(filters.allowedStatuses).sort().join('|')
        : 'all';
    const hideKey = filters?.hideFlagged ? 'hide' : 'show';
    const includeKey = include ? [...include].sort().join(',') : 'all';
    return `processed-${days}days-${allowedKey}-${hideKey}-${includeKey}`;
}

// Request deduplication cache to prevent multiple identical expensive requests
const requestCache = new Map<string, Promise<any>>();

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
            res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
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
export async function processAllMetrics(
    rawMetrics: any[], 
    days: number, 
    options?: { 
        tableFilters?: TableFilterOptions,
        include?: string[] // Optional projections: 'table', 'dist', 'series'
    }
) {
    const pipelineStartTime = process.hrtime.bigint();
    logger.info(`🚀 processAllMetrics started with ${rawMetrics.length} raw metrics for ${days} days`);
    
    // Determine which projections to run
    const include = options?.include || ['table', 'dist', 'series'];
    const shouldRunDist = include.includes('dist');
    const shouldRunSeries = include.includes('series');
    const shouldRunTable = include.includes('table');

    // Transform data first since other operations depend on it
    const startTime = process.hrtime.bigint();
    logger.info(`🔄 Starting cleanTransformCloud on ${rawMetrics.length} metrics...`);
    const transformedData = cleanTransformCloud(rawMetrics);
    const endTime = process.hrtime.bigint();
    logger.info(`✅ cleanTransformCloud took ${(endTime - startTime) / 1000000n}ms`);
    logger.info(`📊 Transformed data length: ${transformedData.length}`);

    // Apply model mapping to ALL data BEFORE processing (not just timeSeriesData)
    const mappingStartTime = process.hrtime.bigint();
    const useDbModels = process.env.USE_DATABASE_MODELS === 'true';
    logger.info(`🔧 APPLYING MODEL MAPPING: useDbModels=${useDbModels}, transformedDataLength=${transformedData.length}`);
    
    const { mapModelNames } = await import('../../utils/modelMappingDB');
    logger.info(`📦 modelMappingDB module imported successfully`);
    let mappedData;
    try {
        mappedData = await mapModelNames(transformedData, useDbModels);
        const mappingEndTime = process.hrtime.bigint();
        logger.info(`🔧 Model mapping took ${(mappingEndTime - mappingStartTime) / 1000000n}ms, mappedDataLength=${mappedData.length}`);
    } catch (mappingError) {
        logger.error(`❌ Model mapping failed: ${mappingError}`);
        logger.error(`📍 Mapping error stack: ${mappingError instanceof Error ? mappingError.stack : 'No stack available'}`);
        throw mappingError;
    }

    // Run the processing operations in parallel
    // IMPORTANT: These three data structures serve different UI purposes:
    // - speedDistData: ALL provider-model combinations - each gets own distribution curve
    // - timeSeriesData: UNIQUE models only - each gets chart with multiple provider lines  
    // - tableData: ALL provider-model combinations - raw data table with clean names
    const startTimeParallel = process.hrtime.bigint();
    logger.info(`🚀 Starting parallel processing with ${mappedData.length} mapped metrics (include: ${include.join(',')})...`);
    
    const tableFilters = options?.tableFilters;

    let speedDistData: any[] = [];
    let timeSeriesData: any = { timestamps: [], models: [] };
    let tableData: any[] = [];

    try {
        const tasks: Promise<any>[] = [];
        
        if (shouldRunDist) {
            tasks.push((async () => {
                const start = process.hrtime.bigint();
                logger.info(`🔄 Starting processSpeedDistData...`);
                speedDistData = await processSpeedDistData(mappedData);
                const end = process.hrtime.bigint();
                logger.info(`✅ processSpeedDistData took ${(end - start) / 1000000n}ms, result length: ${speedDistData.length}`);
            })());
        }

        if (shouldRunSeries) {
            tasks.push((async () => {
                const start = process.hrtime.bigint();
                logger.info(`🔄 Starting processTimeSeriesData...`);
                timeSeriesData = await processTimeSeriesData(mappedData, days);
                const end = process.hrtime.bigint();
                logger.info(`✅ processTimeSeriesData took ${(end - start) / 1000000n}ms, models: ${timeSeriesData.models?.length || 0}`);
            })());
        }

        if (shouldRunTable) {
            tasks.push((async () => {
                const start = process.hrtime.bigint();
                logger.info(`🔄 Starting processRawTableData...`);
                tableData = await processRawTableData(mappedData, tableFilters);
                const end = process.hrtime.bigint();
                logger.info(`✅ processRawTableData took ${(end - start) / 1000000n}ms, rows: ${tableData.length}`);
            })());
        }

        await Promise.all(tasks);
        const endTimeParallel = process.hrtime.bigint();
        logger.info(`🎯 All parallel processing took ${(endTimeParallel - startTimeParallel) / 1000000n}ms`);
    } catch (parallelError) {
        logger.error(`❌ Parallel processing failed: ${parallelError}`);
        logger.error(`📍 Parallel error stack: ${parallelError instanceof Error ? parallelError.stack : 'No stack available'}`);
        throw parallelError;
    }

    // Centralized data validation: ensure timestamps and values align
    const validateTimeSeriesData = (ts: any) => {
        if (!shouldRunSeries) return;
        const timestamps = ts?.timestamps || [];
        const expected = timestamps.length;
        const errors: string[] = [];
        (ts?.models || []).forEach((model: any) => {
            (model?.providers || []).forEach((provider: any) => {
                const actual = (provider?.values || []).length;
                if (actual !== expected) {
                    errors.push(`${model.model_name}/${provider.provider}: values=${actual}, timestamps=${expected}`);
                }
            });
        });
        if (errors.length) {
            logger.error('❌ Time series validation failed. Mismatches:');
            errors.forEach(e => logger.error(`  ${e}`));
            throw new Error(`Time series validation failed with ${errors.length} mismatches`);
        }
    };

    validateTimeSeriesData(timeSeriesData);

    // Log sizes for analysis
    if (shouldRunDist && speedDistData.length > 0) {
        logger.info(`First model density points sample: ${
            JSON.stringify(speedDistData[0].density_points.slice(0, 3))
        }`);
    }
    logger.info('📏 Data sizes (KB):');
    if (shouldRunDist) logger.info(`Speed Distribution: ${(JSON.stringify(speedDistData).length / 1024).toFixed(2)}`);
    if (shouldRunSeries) logger.info(`Time Series: ${(JSON.stringify(timeSeriesData).length / 1024).toFixed(2)}`);
    if (shouldRunTable) logger.info(`Table: ${(JSON.stringify(tableData).length / 1024).toFixed(2)}`);

    const appliedFilters = tableFilters
        ? {
            allowedStatuses: tableFilters.allowedStatuses
                ? Array.from(tableFilters.allowedStatuses).sort()
                : undefined,
            hideFlagged: tableFilters.hideFlagged ?? undefined
        }
        : undefined;

    const resultPayload: any = {
        meta: {
            table: {
                totalRows: mappedData.length,
                filteredRows: shouldRunTable ? tableData.length : 0,
                flaggedStatuses: Array.from(FLAGGED_STATUSES),
                appliedFilters
            }
        }
    };

    if (shouldRunDist) resultPayload.speedDistribution = speedDistData;
    if (shouldRunSeries) resultPayload.timeSeries = timeSeriesData;
    if (shouldRunTable) resultPayload.table = tableData;

    const finalResult = roundNumbers(resultPayload);
    
    const pipelineEndTime = process.hrtime.bigint();
    logger.info(`🏁 Total processAllMetrics pipeline took ${(pipelineEndTime - pipelineStartTime) / 1000000n}ms`);
    
    return finalResult;
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
        const lifecycleFilters = parseLifecycleFilters(req);
        
        // Parse include projections
        const includeParam = req.query.include;
        let include: string[] | undefined;
        if (typeof includeParam === 'string') {
            include = includeParam.split(',').map(token => token.trim().toLowerCase()).filter(Boolean);
        } else if (Array.isArray(includeParam)) {
            include = includeParam.join(',').split(',').map(token => token.trim().toLowerCase()).filter(Boolean);
        }
        if (include && include.length > 0) {
            const allowed = new Set(['table', 'dist', 'series']);
            include = include.filter(token => allowed.has(token));
            if (include.length === 0) {
                include = undefined;
            }
        } else {
            include = undefined;
        }

        // Check if static file serving should be bypassed
        // Static only when unfiltered AND all projections included (or default)
        const isFullRequest = !include || (
            include.includes('table') && 
            include.includes('dist') && 
            include.includes('series')
        );
        const useStatic = req.query.bypass_static !== "true" && !lifecycleFilters && isFullRequest;
        
        // First priority: Try to serve static file (unless bypassed)
        if (useStatic) {
            const staticServed = await tryServeStaticFile(days, res);
            if (staticServed) {
                return; // Response already sent
            }
        }
        
        // If we reach here, static file was not available - generate dynamically
        logger.info(`Static file not available for days=${days}, generating dynamically`);
        
        // Implement request deduplication to prevent race conditions
        const cacheKey = buildCacheKey(days, lifecycleFilters, include);
        
        if (requestCache.has(cacheKey)) {
            logger.info(`🔄 Request deduplication: using cached promise for ${cacheKey}`);
            const cachedPromise = requestCache.get(cacheKey)!;
            const processedData = await cachedPromise;
            
            // Add debugging headers
            res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
            res.setHeader("X-Cache-Status", "DEDUPLICATION-CACHE");
            res.setHeader("X-Model-Mapping", process.env.USE_DATABASE_MODELS === 'true' ? "database" : "hardcoded");
            res.setHeader("X-Processing-Time", `${Date.now() - requestStartTime}ms`);

            return res.status(200).json(processedData);
        }

        // Create new request promise with timeout and cache it
        const requestPromise = (async () => {
            try {
                // Add timeout for large datasets (5 minutes max)
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Request timeout after 5 minutes')), 5 * 60 * 1000);
                });
                
                const dataPromise = (async () => {
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
                        throw new Error('No metrics found');
                    }
                    
                    logger.info(`Processing ${metricsArray.length} metrics`);
                    if (lifecycleFilters?.allowedStatuses) {
                        logger.info(`Applying lifecycle status filter: ${Array.from(lifecycleFilters.allowedStatuses).join(',')}`);
                    }
                    if (lifecycleFilters?.hideFlagged) {
                        logger.info(`Applying lifecycle hideFlagged filter`);
                    }
                    return await processAllMetrics(metricsArray, days, {
                        tableFilters: lifecycleFilters,
                        include: include
                    });
                })();
                
                // Race between data processing and timeout
                return await Promise.race([dataPromise, timeoutPromise]);
            } finally {
                // Clean up cache after processing (success or failure)
                requestCache.delete(cacheKey);
            }
        })();
        
        // Cache the promise
        requestCache.set(cacheKey, requestPromise);
        logger.info(`🔄 Request deduplication: cached new promise for ${cacheKey}`);
        
        // Wait for the result
        const processedData = await requestPromise;
        
        // Add debugging headers
        res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
        res.setHeader("X-Cache-Status", "DYNAMIC-GENERATION");
        res.setHeader("X-Model-Mapping", process.env.USE_DATABASE_MODELS === 'true' ? "database" : "hardcoded");
        res.setHeader("X-Processing-Time", `${Date.now() - requestStartTime}ms`);

        // Return the processed data
        return res.status(200).json(processedData);
    } catch (error) {
        logger.error(`Error processing metrics: ${error}`);
        
        // Clean up cache on error if needed
        const timeRange = parseTimeRange(req);
        const lifecycleFilters = parseLifecycleFilters(req);

        const includeParam = req.query.include;
        let include: string[] | undefined;
        if (typeof includeParam === 'string') {
            include = includeParam.split(',').map(token => token.trim().toLowerCase()).filter(Boolean);
        } else if (Array.isArray(includeParam)) {
            include = includeParam.join(',').split(',').map(token => token.trim().toLowerCase()).filter(Boolean);
        }
        if (include && include.length > 0) {
            const allowed = new Set(['table', 'dist', 'series']);
            include = include.filter(token => allowed.has(token));
            if (include.length === 0) {
                include = undefined;
            }
        } else {
            include = undefined;
        }

        const cacheKey = buildCacheKey(timeRange.days, lifecycleFilters, include);
        if (requestCache.has(cacheKey)) {
            requestCache.delete(cacheKey);
        }
        
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
