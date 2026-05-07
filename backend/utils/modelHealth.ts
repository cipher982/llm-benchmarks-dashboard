import { BenchModelHealth } from '../models/BenchmarkMetrics';
import { CloudBenchmark } from '../types/CloudData';
import connectToMongoDB from './connectToMongoDB';
import logger from './logger';

type HealthDoc = {
    provider?: string;
    model_id?: string;
    last_success_at?: Date | string;
    freshness_status?: string;
    staleness_seconds?: number;
    last_error_kind?: string;
    consecutive_failures?: number;
};

const healthKey = (provider: string, modelId: string) => `${provider}:${modelId}`;

export async function applyHealthMetadata(data: CloudBenchmark[]): Promise<CloudBenchmark[]> {
    if (!data.length) {
        return data;
    }

    const keys = Array.from(
        new Map(
            data.map(item => [
                healthKey(item.providerCanonical, item.modelCanonical),
                { provider: item.providerCanonical, model_id: item.modelCanonical },
            ])
        ).values()
    );

    try {
        await connectToMongoDB();
        const healthDocs = await BenchModelHealth.find({ $or: keys })
            .select(
                'provider model_id last_success_at freshness_status staleness_seconds ' +
                'last_error_kind consecutive_failures'
            )
            .lean();

        const healthByKey = new Map<string, HealthDoc>();
        for (const doc of healthDocs as HealthDoc[]) {
            if (!doc.provider || !doc.model_id) {
                continue;
            }
            healthByKey.set(healthKey(doc.provider, doc.model_id), doc);
        }

        return data.map(item => {
            const health = healthByKey.get(healthKey(item.providerCanonical, item.modelCanonical));
            if (!health) {
                return item;
            }
            const lastSuccess = health.last_success_at
                ? new Date(health.last_success_at).toISOString()
                : item.last_benchmark_date;

            return {
                ...item,
                last_benchmark_date: lastSuccess,
                freshness_status: health.freshness_status,
                staleness_seconds: health.staleness_seconds,
                last_error_kind: health.last_error_kind,
                consecutive_failures: health.consecutive_failures,
            };
        });
    } catch (error) {
        logger.error(`Failed to join bench_model_health metadata: ${error}`);
        return data;
    }
}
