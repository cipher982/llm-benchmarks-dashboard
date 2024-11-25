import { NextApiRequest, NextApiResponse } from 'next';
import { handleCachedApiResponse } from './cacheUtils';
import connectToMongoDB from './connectToMongoDB';
import logger from './logger';
import { processSpeedDistData } from './dataProcessing';

export async function fetchAndProcessMetrics(model: { find: (query?: any) => any }, daysAgo: number, cleanTransform: (rawData: any[]) => any[]) {
    await connectToMongoDB();
    const dateFilter = new Date();
    dateFilter.setDate(dateFilter.getDate() - daysAgo);
    logger.info(`Fetching metrics since: ${dateFilter}`);
    const metrics = await model.find({ run_ts: { $gte: dateFilter } }).select('-times_between_tokens');
    logger.info(`Fetched ${metrics.length} metrics`);
    const rawMetrics = metrics.map((metric: any) => metric.toObject());
    const processedMetrics = cleanTransform(rawMetrics);
    logger.info(`Processed ${processedMetrics.length} metrics`);

    // Additional processing for charts
    const speedDistData = processSpeedDistData(processedMetrics);
    
    return {
        raw: processedMetrics,
        speedDistribution: speedDistData
    };
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
            return res.status(200).json(processedMetrics);
        }
    } catch (error) {
        logger.error(`Error handling request: ${error}`);
        res.status(500).end('Internal Server Error');
    }
}

export async function corsMiddleware(req: NextApiRequest, res: NextApiResponse): Promise<boolean> {
    // Allow requests from localhost during development
    const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://llm-benchmarks-dashboard.vercel.app',
        'https://www.llm-benchmarks.com',
        'https://llm-benchmarks-backend.vercel.app'
    ];

    const origin = req.headers.origin;
    
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return true;
    }

    return false;
}