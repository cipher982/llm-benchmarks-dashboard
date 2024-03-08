import { NextApiRequest, NextApiResponse } from 'next';
import { handleCachedApiResponse } from './cacheUtils';

function setupCORS(req: NextApiRequest, res: NextApiResponse) {
    const allowedOrigins = [
        'https://www.llm-benchmarks.com',
        'https://llm-benchmarks-backend.vercel.app',
        'http://localhost:3000',
        'http://localhost:3001',
    ];
    const origin = req.headers.origin;
    console.log("Request Origin:", origin);
    if (origin && allowedOrigins.includes(origin)) {
        console.log("Setting Access-Control-Allow-Origin for:", origin);
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    } else {
        console.log("Origin not allowed or not present in the request:", origin);
    }
}

export async function setupApiEndpoint(req: NextApiRequest, res: NextApiResponse, MetricsModel: any, transformFunction: any, cacheKey: any) {
    console.log("CORS Debug: Setting CORS headers");
    setupCORS(req, res);

    if (req.method === 'OPTIONS') {
        console.log("CORS Debug: Handling OPTIONS request");
        return res.status(200).end();
    }
    if (req.method !== 'OPTIONS') {
        await handleCachedApiResponse(req, res, MetricsModel, transformFunction, cacheKey);
    }
}

export function corsMiddleware(req: NextApiRequest, res: NextApiResponse) {
    setupCORS(req, res);

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
}