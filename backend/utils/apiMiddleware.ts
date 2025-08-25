import { NextApiRequest, NextApiResponse } from 'next';
import connectToMongoDB from './connectToMongoDB';
import logger from './logger';

export async function fetchAndProcessMetrics(
    model: { find: (query?: any) => any },
    daysAgo: number,
    cleanTransform: (rawData: any[]) => Promise<any[] | { raw: any[]; [key: string]: any }> | any[] | { raw: any[]; [key: string]: any }
) {
    try {
        await connectToMongoDB();
        const dateFilter = new Date();
        dateFilter.setDate(dateFilter.getDate() - daysAgo);
        logger.info(`Fetching metrics since: ${dateFilter}`);
        
        const metrics = await model.find({ run_ts: { $gte: dateFilter } })
            .select("model_name provider tokens_per_second time_to_first_token run_ts display_name gpu_mem_usage framework quantization_method quantization_bits model_dtype")
            .batchSize(50000)  // Force MongoDB to send all data in fewer batches
            .lean()
            .exec();
        
        if (!metrics || !Array.isArray(metrics)) {
            logger.warn(`No metrics found or invalid result: ${typeof metrics}`);
            return { raw: [] };
        }
        
        logger.info(`Fetched ${metrics.length} metrics`);
        
        try {
            const processedMetrics = await Promise.resolve(cleanTransform(metrics));
            
            // Handle various return types consistently
            if (!processedMetrics) {
                logger.warn("cleanTransform returned null or undefined");
                return { raw: [] };
            }
            
            const metricsLength = Array.isArray(processedMetrics) 
                ? processedMetrics.length 
                : processedMetrics.raw?.length || 0;
                
            logger.info(`Processed ${metricsLength} metrics`);
            
            // Ensure consistent return format: always return {raw: [...]}
            if (Array.isArray(processedMetrics)) {
                return { raw: processedMetrics };
            }
            
            return processedMetrics;
        } catch (transformError) {
            logger.error(`Error in transformation function: ${transformError}`);
            return { raw: [] };
        }
    } catch (error) {
        logger.error(`Error fetching metrics: ${error}`);
        return { raw: [] };
    }
}



export async function corsMiddleware(req: NextApiRequest, res: NextApiResponse): Promise<boolean> {
    const origin = req.headers.origin;
    
    console.log('CORS Debug:', {
        origin,
        nodeEnv: process.env.NODE_ENV,
        disableCors: process.env.DISABLE_CORS,
        method: req.method,
        url: req.url
    });
    
    // If DISABLE_CORS env var is set to true, allow all origins regardless of environment
    if (process.env.DISABLE_CORS === 'true') {
        console.log(`DISABLE_CORS is set: allowing all origins`);
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    // In development mode, allow all origins
    else if (process.env.NODE_ENV === 'development') {
        if (origin) {
            console.log(`Development mode: allowing origin ${origin}`);
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            res.setHeader('Access-Control-Allow-Credentials', 'true');
        }
    } else {
        // In production, use a whitelist approach
        // List of allowed origins
        const allowedOrigins = [
            'https://www.llm-benchmarks.com',
            'https://llm-benchmarks.com',
            'https://api.llm-benchmarks.com'
        ];
        
        // Check if the origin is in our allowed list
        if (origin && allowedOrigins.includes(origin)) {
            console.log(`Setting CORS headers for origin: ${origin}`);
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            res.setHeader('Access-Control-Allow-Credentials', 'true');
        } else if (origin) {
            console.log(`Origin not allowed: ${origin}`);
        }
    }

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        console.log('Handling OPTIONS preflight request');
        res.status(200).end();
        return true;
    }

    return false;
}
