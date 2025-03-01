require('dotenv').config({ path: '../.env' });
const Redis = require('ioredis');

// Connect to Redis
const redisClient = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
  db: Number(process.env.REDIS_DB),
});

async function clearCache() {
  try {
    console.log('Connecting to Redis...');
    
    // Check connection
    await redisClient.ping();
    console.log('Connected to Redis successfully');
    
    // Get all processed metrics keys
    const processedKeysPattern = 'processedMetrics:*';
    const processedKeys = await redisClient.keys(processedKeysPattern);
    console.log(`Found ${processedKeys.length} processed metrics keys in Redis`);
    
    // Delete all processed metrics keys
    if (processedKeys.length > 0) {
      const result = await redisClient.del(...processedKeys);
      console.log(`Successfully deleted ${result} processed metrics keys from Redis`);
    } else {
      console.log('No processed metrics keys to delete');
    }
    
  } catch (error) {
    console.error('Error clearing cache:', error);
  } finally {
    // Close Redis connection
    redisClient.quit();
  }
}

clearCache(); 