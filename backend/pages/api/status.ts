import { NextApiRequest, NextApiResponse } from 'next';
import { corsMiddleware } from '../../utils/apiMiddleware';
import { CloudMetrics } from '../../models/BenchmarkMetrics';
import connectToMongoDB from '../../utils/connectToMongoDB';
import fs from 'fs/promises';
import path from 'path';

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

async function generateStatusFromMongoDB(): Promise<StatusData> {
    await connectToMongoDB();
    
    // Get the last 10 runs for each model to determine status
    const pipeline = [
        {
            $sort: { timestamp: -1 }
        },
        {
            $group: {
                _id: {
                    provider: "$provider", 
                    model: "$model"
                },
                runs: { $push: { $ne: ["$error", null] } }, // true if error exists (failed), false if successful
                last_run_timestamp: { $first: "$timestamp" }
            }
        },
        {
            $project: {
                provider: "$_id.provider",
                model: "$_id.model", 
                last_run_timestamp: "$last_run_timestamp",
                runs: { $slice: ["$runs", MAX_RUNS] } // Limit to last MAX_RUNS
            }
        }
    ];
    
    const results = await CloudMetrics.aggregate(pipeline);
    
    const statusData: StatusData = {};
    for (const result of results) {
        const key = result.model;
        statusData[key] = {
            provider: result.provider,
            model: result.model,
            last_run_timestamp: result.last_run_timestamp?.toISOString() || new Date().toISOString(),
            runs: result.runs.map((run: any) => Boolean(run))
        };
    }
    
    return statusData;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    corsMiddleware(req, res);
    if (req.method === 'OPTIONS') return;

    if (req.method === 'GET') {
        try {
            // Try to serve from static file first
            const statusFilePath = path.join(process.cwd(), 'public', 'api', 'status.json');
            
            try {
                const stats = await fs.stat(statusFilePath);
                const ageMinutes = (Date.now() - stats.mtime.getTime()) / (1000 * 60);
                
                // Serve static file if less than 30 minutes old
                if (ageMinutes < 30) {
                    const data = await fs.readFile(statusFilePath, 'utf8');
                    const parsedData = JSON.parse(data);
                    
                    res.setHeader('Content-Type', 'application/json');
                    res.setHeader('Cache-Control', 'public, s-maxage=300'); // 5 minute cache
                    res.setHeader('X-Cache-Status', 'STATIC-FILE');
                    res.status(200).json(parsedData);
                    return;
                }
            } catch {
                // Static file doesn't exist or is inaccessible, generate from MongoDB
            }
            
            // Generate status from MongoDB
            const statusData = await generateStatusFromMongoDB();
            
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'public, s-maxage=60'); // 1 minute cache for dynamic
            res.setHeader('X-Cache-Status', 'MONGODB-DYNAMIC');
            res.status(200).json(statusData);
            
        } catch (error) {
            console.error('Failed to fetch status data:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    } else {
        res.status(405).json({ error: 'Method Not Allowed' });
    }
}