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
    const handled = corsMiddleware(req, res);
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

export function corsMiddleware(req: NextApiRequest, res: NextApiResponse) {
    setupCORS(req, res);

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return true;
    }
    return false;
}

function setupCORS(req: NextApiRequest, res: NextApiResponse) {
    const allowedOrigins = [
        'https://www.llm-benchmarks.com',
        'https://llm-benchmarks-backend.vercel.app',
        'http://localhost:3000',
        'http://localhost:3001',
    ];
    const origin = req.headers.origin;
    logger.info("Request Origin:", origin);
    if (origin && allowedOrigins.includes(origin)) {
        logger.info("Setting Access-Control-Allow-Origin for:", origin);
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    } else {
        logger.warn("Origin not allowed or not present in the request:", origin);
    }
}