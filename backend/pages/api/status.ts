import { NextApiRequest, NextApiResponse } from 'next';
import { corsMiddleware } from '../../utils/apiMiddleware';
import { CloudMetrics } from '../../models/BenchmarkMetrics';
import connectToMongoDB from '../../utils/connectToMongoDB';
import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';

// Constants
const MAX_RUNS = 10;  // Match the Python code's default

// Helper: Convert timestamp to human-readable relative time
function getRelativeTime(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

// TypeScript interfaces for better type safety
interface ModelStatus {
    provider: string;
    model: string;
    last_run_timestamp: string;
    last_run_relative: string;
    runs: boolean[];
    status: 'healthy' | 'warning' | 'deprecated' | 'disabled';
    warnings: string[];
    enabled?: boolean;
    deprecated?: boolean;
    deprecation_date?: string;
    successor_model?: string;
    disabled_reason?: string;
}

interface StatusResponse {
    active: ModelStatus[];
    deprecated: ModelStatus[];
    disabled: ModelStatus[];
    summary: {
        active_count: number;
        deprecated_count: number;
        disabled_count: number;
        total_issues: number;
    };
}

async function generateStatusFromMongoDB(): Promise<StatusResponse> {
    await connectToMongoDB();

    // Step 1: Get run history from metrics_cloud_v2
    const pipeline: any[] = [
        {
            $sort: { run_ts: -1 as const }
        },
        {
            $group: {
                _id: {
                    provider: "$provider",
                    model_name: "$model_name"
                },
                runs: { $push: { $not: { $ifNull: ["$error", false] } } },
                last_run_timestamp: { $first: "$run_ts" }
            }
        },
        {
            $project: {
                provider: "$_id.provider",
                model: "$_id.model_name",
                last_run_timestamp: "$last_run_timestamp",
                runs: { $slice: ["$runs", MAX_RUNS] }
            }
        }
    ];

    const metricsResults = await CloudMetrics.aggregate(pipeline);

    // Step 2: Get model metadata from models collection
    const ModelsCollection = mongoose.connection.db.collection('models');
    const modelMetadata = await ModelsCollection.find({}).toArray();

    // Create lookup map for model metadata
    const metadataMap = new Map();
    modelMetadata.forEach((meta: any) => {
        const key = `${meta.provider}/${meta.model_id}`;
        metadataMap.set(key, {
            enabled: meta.enabled ?? true,
            deprecated: meta.deprecated ?? false,
            deprecation_date: meta.deprecation_date,
            successor_model: meta.successor_model,
            disabled_reason: meta.disabled_reason
        });
    });

    // Step 3: Enrich run data with metadata and calculate warnings
    const enrichedModels: ModelStatus[] = metricsResults.map((result: any) => {
        const key = `${result.provider}/${result.model}`;
        const metadata = metadataMap.get(key) || { enabled: true, deprecated: false };

        const runs = result.runs.map((run: any) => Boolean(run));
        const lastRunDate = result.last_run_timestamp ? new Date(result.last_run_timestamp) : new Date();
        const daysSinceLastRun = Math.floor((new Date().getTime() - lastRunDate.getTime()) / 86400000);
        const failureCount = runs.filter(r => !r).length;

        // Calculate warnings
        const warnings: string[] = [];
        if (daysSinceLastRun > 7) {
            warnings.push(`stale_${daysSinceLastRun}d`);
        } else if (daysSinceLastRun > 3) {
            warnings.push(`infrequent_${daysSinceLastRun}d`);
        }
        if (failureCount > 0) {
            warnings.push(`failures_${failureCount}`);
        }

        // Determine overall status
        let status: 'healthy' | 'warning' | 'deprecated' | 'disabled' = 'healthy';
        if (!metadata.enabled) {
            status = 'disabled';
        } else if (metadata.deprecated) {
            status = 'deprecated';
        } else if (warnings.length > 0) {
            status = 'warning';
        }

        return {
            provider: result.provider,
            model: result.model,
            last_run_timestamp: result.last_run_timestamp?.toISOString() || new Date().toISOString(),
            last_run_relative: getRelativeTime(lastRunDate),
            runs,
            status,
            warnings,
            enabled: metadata.enabled,
            deprecated: metadata.deprecated,
            deprecation_date: metadata.deprecation_date,
            successor_model: metadata.successor_model,
            disabled_reason: metadata.disabled_reason
        };
    });

    // Step 4: Get disabled models that have never run (in models DB but no metrics)
    const modelsWithRuns = new Set(enrichedModels.map(m => `${m.provider}/${m.model}`));
    const disabledModelsNeverRun = modelMetadata
        .filter((meta: any) => {
            const key = `${meta.provider}/${meta.model_id}`;
            return meta.enabled === false && !modelsWithRuns.has(key);
        })
        .map((meta: any) => ({
            provider: meta.provider,
            model: meta.model_id,
            last_run_timestamp: null,
            last_run_relative: 'never',
            runs: [],
            status: 'disabled' as const,
            warnings: [],
            enabled: false,
            deprecated: meta.deprecated ?? false,
            disabled_reason: meta.disabled_reason
        }));

    // Step 5: Split into sections
    const active = enrichedModels.filter(m => m.enabled && !m.deprecated);
    const deprecated = enrichedModels.filter(m => m.enabled && m.deprecated);
    const disabled = [
        ...enrichedModels.filter(m => !m.enabled),
        ...disabledModelsNeverRun
    ];

    // Calculate summary
    const issueCount = active.filter(m => m.warnings.length > 0).length;

    return {
        active,
        deprecated,
        disabled,
        summary: {
            active_count: active.length,
            deprecated_count: deprecated.length,
            disabled_count: disabled.length,
            total_issues: issueCount + deprecated.length
        }
    };
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