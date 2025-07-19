import Redis from "ioredis";

// Redis is optional now - we use static files for performance
let redisClient: Redis | null = null;

try {
    if (process.env.REDIS_HOST) {
        redisClient = new Redis({
            host: process.env.REDIS_HOST,
            port: Number(process.env.REDIS_PORT) || 6379,
            password: process.env.REDIS_PASSWORD || undefined,
            db: Number(process.env.REDIS_DB) || 0,
            // Prevent error spam in development
            retryDelayOnFailure: 1000,
            maxRetriesPerRequest: 1,
            lazyConnect: true,
        });
    }
} catch (error) {
    console.warn('Redis connection failed, continuing without Redis:', error.message);
    redisClient = null;
}

export default redisClient;