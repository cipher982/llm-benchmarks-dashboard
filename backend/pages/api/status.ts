import { NextApiRequest, NextApiResponse } from 'next';
import Redis from 'ioredis';

const redis = new Redis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    console.log("Making redis connnection for /api/status:", redis.options);
    if (req.method === 'GET') {
        try {
            const statusData = await redis.get('cloud_log_status');
            console.log("Fetched statusData:", statusData);
            if (statusData) {
                res.status(200).json(JSON.parse(statusData));
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