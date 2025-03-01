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
    
    // Get all metrics keys (both processed and cloud)
    const allKeys = await redisClient.keys('*Metrics:*');
    console.log(`Found ${allKeys.length} total metrics keys in Redis`);
    
    // Log keys found for debugging
    if (allKeys.length > 0) {
      console.log('Found keys:', allKeys);
    }
    
    // Check specifically for cloud metrics keys
    const cloudKeysPattern = 'cloudMetrics:*';
    const cloudKeys = await redisClient.keys(cloudKeysPattern);
    console.log(`Found ${cloudKeys.length} cloud metrics keys in Redis`);
    
    // Check specifically for processed metrics keys
    const processedKeysPattern = 'processedMetrics:*';
    const processedKeys = await redisClient.keys(processedKeysPattern);
    console.log(`Found ${processedKeys.length} processed metrics keys in Redis`);
    
    // Delete all metrics keys
    if (allKeys.length > 0) {
      const result = await redisClient.del(...allKeys);
      console.log(`Successfully deleted ${result} metrics keys from Redis`);
    } else {
      console.log('No metrics keys to delete');
    }
    
  } catch (error) {
    console.error('Error clearing cache:', error);
  } finally {
    // Close Redis connection
    redisClient.quit();
  }
}

clearCache(); 