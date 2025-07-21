import { NextApiRequest, NextApiResponse } from 'next';
import { CloudMetrics } from '../../models/BenchmarkMetrics';
import { corsMiddleware, fetchAndProcessMetrics } from '../../utils/apiMiddleware';
import { processAllMetrics } from './processed';

// Default time range in days
const DEFAULT_DAYS = 14;

function parseTimeRange(req: NextApiRequest) {
    const days = req.query.days ? parseInt(req.query.days as string) : DEFAULT_DAYS;
    return {
        days: Math.min(Math.max(days, 1), 90) // Limit between 1-90 days
    };
}

// Filter processed data for a specific model
function filterForModel(processedData: any, provider: string, modelName: string) {
    const filteredData = {
        speedDistribution: processedData.speedDistribution?.filter((item: any) => 
            item.provider === provider && item.model === modelName
        ) || [],
        timeSeries: {
            timestamps: processedData.timeSeries?.timestamps || [],
            models: processedData.timeSeries?.models?.filter((model: any) => 
                model.provider === provider && model.model === modelName
            ) || []
        },
        table: processedData.table?.filter((row: any) => 
            row.provider === provider && row.model === modelName
        ) || []
    };

    return filteredData;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    // Extract provider and model name from query
    const { provider, model } = req.query;
    
    if (!provider || !model) {
        return res.status(400).json({ error: "Provider and model parameters are required" });
    }

    const providerStr = Array.isArray(provider) ? provider[0] : provider;
    const modelStr = Array.isArray(model) ? model[0] : model;
    const timeRange = parseTimeRange(req);

    try {
        // Fetch raw data from MongoDB
        const rawData = await fetchAndProcessMetrics(
            CloudMetrics,
            timeRange.days,
            (data: any[]) => data
        );
        
        // Process the data
        const metricsArray = Array.isArray(rawData) ? rawData : (rawData.raw || []);
        
        if (!metricsArray.length) {
            return res.status(404).json({ error: 'No metrics found for this model' });
        }

        const processedData = await processAllMetrics(metricsArray, timeRange.days);
        
        // Filter for specific model
        const filteredData = filterForModel(processedData, providerStr, modelStr);
        
        // Check if model exists
        if (!filteredData.table?.length && !filteredData.speedDistribution?.length) {
            return res.status(404).json({ error: `Model ${providerStr}/${modelStr} not found` });
        }

        // Set cache headers
        res.setHeader('Cache-Control', 'public, s-maxage=300'); // 5 minute cache
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('X-Data-Source', 'MONGODB-MODEL-SPECIFIC');
        
        return res.status(200).json(filteredData);
    } catch (error) {
        console.error('Error processing model metrics:', error);
        return res.status(500).json({ error: 'Failed to process model metrics' });
    }
}

// Wrap the handler with CORS middleware
export default async function modelHandler(req: NextApiRequest, res: NextApiResponse) {
    // Handle CORS preflight
    console.log(`Received API request for model: ${req.url}`);
    
    try {
        const corsHandled = await corsMiddleware(req, res);
        console.log(`CORS middleware result: ${corsHandled ? 'preflight handled' : 'proceeding with request'}`);
        
        if (corsHandled) return;

        // Handle the actual request
        return handler(req, res);
    } catch (error) {
        console.error('Unexpected error in model API route:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
} 