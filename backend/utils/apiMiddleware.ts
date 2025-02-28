import { NextApiRequest, NextApiResponse } from 'next';
import { handleCachedApiResponse } from './cacheUtils';
import connectToMongoDB from './connectToMongoDB';
import logger from './logger';
import { processSpeedDistData } from './dataProcessing';

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
        
        // Optimized query: select only needed fields and use lean() for better memory efficiency
        const metrics = await model.find({ run_ts: { $gte: dateFilter } })
            .select("model_name provider tokens_per_second time_to_first_token run_ts display_name gpu_mem_usage framework quantization_method quantization_bits model_dtype")
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

export async function setupApiEndpoint(
    req: NextApiRequest,
    res: NextApiResponse,
    MetricsModel: any,
    transformFunction: any,
    cacheKey: any,
    daysAgo: number,
    useCache: boolean
) {
    const handled = await corsMiddleware(req, res);
    if (handled) return;

    if (req.method !== 'GET') {
        logger.warn(`Method ${req.method} not allowed`);
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        if (useCache) {
            await handleCachedApiResponse(req, res, MetricsModel, transformFunction, cacheKey, daysAgo);
        } else {
            logger.info('Cache disabled, fetching data directly');
            const processedMetrics = await fetchAndProcessMetrics(MetricsModel, daysAgo, transformFunction);
            if (!processedMetrics) {
                return res.status(404).json({ message: 'No metrics found' });
            }
            return res.status(200).json({ raw: processedMetrics });
        }
    } catch (error) {
        logger.error(`Error handling request: ${error}`);
        res.status(500).end('Internal Server Error');
    }
}

export async function corsMiddleware(req: NextApiRequest, res: NextApiResponse): Promise<boolean> {
    const origin = req.headers.origin;
    
    console.log('CORS Debug:', {
        origin,
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
        method: req.method,
        url: req.url
    });
    
    // List of allowed origins
    const allowedOrigins = [
        'https://llm-benchmarks-dashboard.vercel.app',
        'https://www.llm-benchmarks.com',
        'http://localhost:3000'
    ];
    
    // Always set CORS headers if origin is in allowed list
    if (origin) {
        if (process.env.NODE_ENV !== 'production' || process.env.VERCEL_ENV === 'preview' || allowedOrigins.includes(origin)) {
            console.log(`Setting CORS headers for origin: ${origin}`);
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            res.setHeader('Access-Control-Allow-Credentials', 'true');
        } else {
            console.log(`Origin not allowed: ${origin}`);
        }
    } else {
        console.log('No origin header present in request');
    }

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        console.log('Handling OPTIONS preflight request');
        res.status(200).end();
        return true;
    }

    return false;
}