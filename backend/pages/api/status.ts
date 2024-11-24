import { NextApiRequest, NextApiResponse } from 'next';
import Redis from 'ioredis';
import { corsMiddleware } from '../../utils/apiMiddleware';

// Constants
const MAX_RUNS = 10;  // Match the Python code's default

// TypeScript interfaces for better type safety
interface ModelStatus {
    provider: string;
    model: string;
    last_run_timestamp: string;
    runs: boolean[];  // Now explicitly boolean array
}

interface StatusData {
    [key: string]: ModelStatus;
}

const redis = new Redis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD,
    db: Number(process.env.REDIS_DB)
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    corsMiddleware(req, res);
    if (req.method === 'OPTIONS') return;

    if (req.method === 'GET') {
        try {
            const statusData = await redis.get('cloud_log_status');
            if (statusData) {
                const parsedData = JSON.parse(statusData);
                
                // Keep the data structure but ensure runs array is limited to last N entries
                const optimizedData = Object.entries(parsedData).reduce((acc, [compositeKey, value]: [string, any]) => {
                    // Handle both old and new format
                    const isNewFormat = compositeKey.includes(':');
                    const [provider, ...modelParts] = isNewFormat ? compositeKey.split(':') : [value.provider, compositeKey];
                    const model = isNewFormat ? modelParts.join(':') : compositeKey;
                    
                    // Ensure runs are boolean values
                    const runs = Array.isArray(value.runs) 
                        ? value.runs.slice(-MAX_RUNS).map((run: unknown) => Boolean(run))
                        : [];
                        
                    acc[model] = {
                        provider: provider || value.provider || 'unknown',
                        model: value.model || model,
                        last_run_timestamp: value.last_run_timestamp,
                        runs
                    };
                    return acc;
                }, {} as StatusData);

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