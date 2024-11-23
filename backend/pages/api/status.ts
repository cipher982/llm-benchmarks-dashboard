import { NextApiRequest, NextApiResponse } from 'next';
import Redis from 'ioredis';
import { corsMiddleware } from '../../utils/apiMiddleware';

const redis = new Redis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    corsMiddleware(req, res);
    if (req.method === 'OPTIONS') return;

    if (req.method === 'GET') {
        try {
            const statusData = await redis.get('cloud_log_status');
            if (statusData) {
                const parsedData = JSON.parse(statusData);
                
                // Keep the data structure but ensure runs array is limited to last 10 entries
                const optimizedData = Object.entries(parsedData).reduce((acc, [key, value]: [string, any]) => {
                    acc[key] = {
                        provider: value.provider,
                        model: value.model,
                        last_run_timestamp: value.last_run_timestamp,
                        runs: Array.isArray(value.runs) ? value.runs.slice(-10) : []
                    };
                    return acc;
                }, {} as Record<string, any>);

                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Cache-Control', 'public, s-maxage=10');
                res.status(200).json(optimizedData);
            } else {
                res.status(404).json({ error: 'Status data not found' });
            }
        } catch (error) {
            console.error('Failed to fetch status data from Redis:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    } else {
        res.status(405).json({ error: 'Method Not Allowed' });
    }
}