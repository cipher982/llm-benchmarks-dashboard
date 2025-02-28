import { NextApiRequest, NextApiResponse } from 'next';
import { CloudMetrics } from '../../models/BenchmarkMetrics';
import { processSpeedDistData, processTimeSeriesData, processRawTableData } from '../../utils/dataProcessing';
import { cleanTransformCloud, RawData } from '../../utils/processCloud';
import { corsMiddleware } from '../../utils/apiMiddleware';
import connectToMongoDB from '../../utils/connectToMongoDB';
import logger from '../../utils/logger';
import { roundNumbers } from '../../utils/dataUtils';

/**
 * Benchmark timing utility function
 */
async function timeOperation<T>(name: string, operation: () => Promise<T> | T): Promise<{ result: T, timings: { name: string, durationMs: number } }> {
  const start = process.hrtime.bigint();
  const result = await operation();
  const end = process.hrtime.bigint();
  const durationMs = Number(end - start) / 1_000_000;
  logger.info(`${name} took ${durationMs.toFixed(2)}ms`);
  return { result, timings: { name, durationMs } };
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Default time range in days
  const days = req.query.days ? parseInt(req.query.days as string) : 3;
  const MAX_RECORDS = req.query.limit ? parseInt(req.query.limit as string) : 10000;
  
  logger.info(`Starting benchmark with days=${days}, limit=${MAX_RECORDS}`);
  
  // Store all timing info
  const timings: Array<{ name: string, durationMs: number }> = [];
  let totalDocuments = 0;
  let responseSize = 0;
  
  try {
    // Step 1: MongoDB Connection
    const { timings: connectionTiming } = await timeOperation('MongoDB connection', async () => {
      await connectToMongoDB();
    });
    timings.push(connectionTiming);

    // Step 2: MongoDB Query
    const { result: metrics, timings: queryTiming } = await timeOperation('MongoDB query', async () => {
      const dateFilter = new Date();
      dateFilter.setDate(dateFilter.getDate() - days);
      
      // Use the optimized query
      return CloudMetrics.find({ run_ts: { $gte: dateFilter } })
        .select("model_name provider tokens_per_second time_to_first_token run_ts display_name")
        .lean()
        .limit(MAX_RECORDS)
        .exec();
    });
    timings.push(queryTiming);
    totalDocuments = metrics.length;
    
    // Step 3: Data Transformation (cleanTransformCloud)
    const { result: transformedData, timings: transformTiming } = await timeOperation('Data transformation', () => {
      // Cast the metrics to RawData[] to satisfy TypeScript
      return cleanTransformCloud(metrics as RawData[]);
    });
    timings.push(transformTiming);
    
    // Step 4-6: Data Processing (Run in parallel for performance but time separately)
    const processingStart = process.hrtime.bigint();
    
    const [
      { result: speedDistData, timings: speedDistTiming },
      { result: timeSeriesData, timings: timeSeriesTiming },
      { result: tableData, timings: tableTiming }
    ] = await Promise.all([
      timeOperation('Speed distribution processing', () => processSpeedDistData(transformedData)),
      timeOperation('Time series processing', () => processTimeSeriesData(transformedData, days)),
      timeOperation('Table data processing', () => processRawTableData(transformedData))
    ]);
    
    const processingEnd = process.hrtime.bigint();
    const totalProcessingMs = Number(processingEnd - processingStart) / 1_000_000;
    
    timings.push(speedDistTiming, timeSeriesTiming, tableTiming);
    timings.push({ name: 'Total parallel processing', durationMs: totalProcessingMs });
    
    // Step 7: Final Data Assembly
    const { result: finalData, timings: assemblyTiming } = await timeOperation('Data assembly', () => {
      return roundNumbers({
        speedDistribution: speedDistData,
        timeSeries: timeSeriesData,
        table: tableData
      });
    });
    timings.push(assemblyTiming);
    
    // Step 8: JSON Serialization
    const { result: jsonString, timings: jsonTiming } = await timeOperation('JSON serialization', () => {
      return JSON.stringify(finalData);
    });
    timings.push(jsonTiming);
    responseSize = jsonString.length;
    
    // Step 9: Response sending (can't measure this directly, but we can approximate)
    // Calculate total time
    const totalTimeMs = timings.reduce((sum, timing) => {
      // Only count the main operations, not the parallel breakdown 
      if (!['Speed distribution processing', 'Time series processing', 'Table data processing'].includes(timing.name)) {
        return sum + timing.durationMs;
      }
      return sum;
    }, 0);
    
    // Add summary info
    const summary = {
      totalTimeMs,
      documentsFetched: totalDocuments,
      modelsProcessed: transformedData.length,
      responseSize: `${(responseSize / 1024 / 1024).toFixed(2)} MB`,
      daysRequested: days,
      timestamp: new Date().toISOString()
    };
    
    // Return all the timing information
    return res.status(200).json({
      timings,
      summary,
      // Include full data if requested
      ...(req.query.includeData === 'true' ? { data: finalData } : {}),
    });
    
  } catch (error) {
    console.error('Error in benchmark:', error);
    return res.status(500).json({ 
      error: 'Benchmark failed',
      message: error instanceof Error ? error.message : String(error),
      timings // Return timings up to the point of failure
    });
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