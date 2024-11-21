import type { NextApiRequest, NextApiResponse } from "next";
import { CloudMetrics } from '../../models/BenchmarkMetrics';
import connectToMongoDB from '../../utils/connectToMongoDB';
import { processSpeedDistData, processTimeSeriesData, processRawTableData } from '../../utils/dataProcessing';
import { cleanTransformCloud } from '../../utils/processCloud';
import { corsMiddleware } from '../../utils/apiMiddleware';

export const daysAgo = 14;
const debug = false;
const useCache = !debug;

async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        // 1. Get raw data from MongoDB
        await connectToMongoDB();
        const dateFilter = new Date();
        dateFilter.setDate(dateFilter.getDate() - daysAgo);
        const metrics = await CloudMetrics.find({ 
            run_ts: { $gte: dateFilter } 
        }).select('-times_between_tokens');
        const rawMetrics = metrics.map(metric => metric.toObject());

        // 2. Apply base transformation
        const transformedData = cleanTransformCloud(rawMetrics);

        // 3. Process data for each visualization
        const speedDistData = processSpeedDistData(transformedData);
        const timeSeriesData = processTimeSeriesData(transformedData);
        const tableData = processRawTableData(transformedData);
        
        // Log sizes for analysis
        const response = {
            speedDistribution: speedDistData,
            timeSeries: timeSeriesData,
            table: tableData
        };
        
        console.log('Data sizes (KB):');
        console.log('Speed Distribution:', JSON.stringify(speedDistData).length / 1024);
        console.log('Time Series:', JSON.stringify(timeSeriesData).length / 1024);
        console.log('Table:', JSON.stringify(tableData).length / 1024);
        console.log('Total:', JSON.stringify(response).length / 1024);
        
        // 4. Return only the processed data
        return res.status(200).json(response);
    } catch (error) {
        console.error("Error processing data:", error);
        res.status(500).json({ error: "Failed to process data" });
    }
}

// Wrap the handler with the existing CORS middleware
export default async function (req: NextApiRequest, res: NextApiResponse) {
    const handled = await corsMiddleware(req, res);
    if (handled) return;
    return handler(req, res);
}