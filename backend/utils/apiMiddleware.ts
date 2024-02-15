import { NextApiRequest, NextApiResponse } from 'next';
import { handleApiRequest } from './apiUtils';

export async function setupApiEndpoint(req: NextApiRequest, res: NextApiResponse, MetricsModel: any, transformFunction: any, cacheKey: any) {
    console.log("CORS Debug: Setting CORS headers");

    const allowedOrigins = [
        'https://www.llm-benchmarks.com',
        'https://llm-benchmarks-backend.vercel.app',
        'http://localhost:3000',
        'http://localhost:3001',
    ];
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

    if (req.method === 'OPTIONS') {
        console.log("CORS Debug: Handling OPTIONS request");
        return res.status(200).end();
    }
    if (req.method !== 'OPTIONS') {
        await handleApiRequest(req, res, MetricsModel, transformFunction, cacheKey);
    }
}