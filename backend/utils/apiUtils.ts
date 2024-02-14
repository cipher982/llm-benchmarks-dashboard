import { NextApiRequest, NextApiResponse } from 'next';
import logger from './logger';
import connectToMongoDB from './connectToMongoDB';
import redisClient from './redisClient';

export async function handleApiRequest(
    req: NextApiRequest,
    res: NextApiResponse,
    model: { find: (query?: any) => any },
    cleanTransform: (rawData: any[]) => any[],
    cacheKey: string,
    daysAgo: number = 365
) {
    if (req.method !== "GET") {
        logger.warn(`Method ${req.method} not allowed`);
        res.setHeader("Allow", ["GET"]);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        let processedMetrics: any[];

        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            logger.info("Serving from cache");
            processedMetrics = JSON.parse(cachedData);
        } else {
            await connectToMongoDB();
            logger.info("Fetching data from database");
            const dateFilter = new Date();
            dateFilter.setDate(dateFilter.getDate() - daysAgo);
            const metrics = await model.find({ run_ts: { $gte: dateFilter } }).select('-times_between_tokens');
            const rawMetrics = metrics.map((metric: any) => metric.toObject());

            if (rawMetrics.length === 0) {
                return res.status(404).json({ message: "No metrics found" });
            }

            processedMetrics = cleanTransform(rawMetrics);
            await redisClient.set(cacheKey, JSON.stringify(processedMetrics), "EX", 3600);
        }

        res.status(200).json(processedMetrics);
    } catch (error) {
        logger.error(`Error: ${error}`);
        res.status(500).end("Internal Server Error");
    }
}