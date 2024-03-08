import { NextApiRequest, NextApiResponse } from 'next';
import { handleCachedApiResponse } from './cacheUtils';

export async function setupApiEndpoint(req: NextApiRequest, res: NextApiResponse, MetricsModel: any, transformFunction: any, cacheKey: any) {
    console.log("CORS Debug: Setting CORS headers");

    const allowedOrigins = [
        'https://www.llm-benchmarks.com',
        'https://llm-benchmarks-backend.vercel.app',
        'http://localhost:3000',
        'http://localhost:3001',
    ];
    const origin = req.headers.origin;
    console.log("Request Origin:", origin); // Log the request origin
    if (origin && allowedOrigins.includes(origin)) {
        console.log("Setting Access-Control-Allow-Origin for:", origin); // Log when setting the header
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        console.log("Origin not allowed or not present in the request:", origin); // Log if the origin is not allowed or not present
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

    if (req.method === 'OPTIONS') {
        console.log("CORS Debug: Handling OPTIONS request");
        return res.status(200).end();
    }
    if (req.method !== 'OPTIONS') {
        await handleCachedApiResponse(req, res, MetricsModel, transformFunction, cacheKey);
    }
}