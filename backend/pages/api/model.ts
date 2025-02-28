import { NextApiRequest, NextApiResponse } from 'next';
import { CloudMetrics } from '../../models/BenchmarkMetrics';
import { corsMiddleware } from '../../utils/apiMiddleware';
import { 
    DEFAULT_RANGES, 
    filterProcessedDataForModel, 
    handleModelSpecificApiRequest 
} from '../../utils/cacheUtils';
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
function filterForModel(processedData: any, provider: string, modelName: string, days: number) {
    return filterProcessedDataForModel(processedData, provider, modelName);
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
        // Use the new optimized handler for model-specific requests
        await handleModelSpecificApiRequest(
            req,
            res,
            CloudMetrics,
            (rawData) => processAllMetrics(rawData, timeRange.days),
            filterForModel,
            providerStr,
            modelStr,
            timeRange.days
        );
    } catch (error) {
        console.error('Error processing model metrics:', error);
        return res.status(500).json({ error: 'Failed to process model metrics' });
    }
}

// Wrap the handler with CORS middleware
export default async function (req: NextApiRequest, res: NextApiResponse) {
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