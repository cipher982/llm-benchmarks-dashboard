require('dotenv').config({ path: '../.env' });
const Redis = require('ioredis');

// Connect to Redis
const redisClient = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
  db: Number(process.env.REDIS_DB),
});

async function inspectCache() {
  try {
    console.log('Connecting to Redis...');
    
    // Check connection
    await redisClient.ping();
    console.log('Connected to Redis successfully');
    
    // Specific keys we want to check
    const specificKeys = [
      'processedMetrics:3days',
      'processedMetrics:12days',
      'cloudMetrics:3days',
      'cloudMetrics:12days'
    ];
    
    for (const key of specificKeys) {
      console.log(`\nChecking key: ${key}`);
      const exists = await redisClient.exists(key);
      
      if (exists) {
        console.log(`Key ${key} exists in Redis`);
        const data = await redisClient.get(key);
        
        try {
          const parsedData = JSON.parse(data);
          console.log('Data structure:', Object.keys(parsedData));
          
          if (key.startsWith('processedMetrics')) {
            if (parsedData.speedDistribution) {
              console.log(`Speed distribution models count: ${parsedData.speedDistribution.length}`);
              if (parsedData.speedDistribution.length > 0) {
                console.log(`First model: ${parsedData.speedDistribution[0].model_name} from ${parsedData.speedDistribution[0].provider}`);
              }
            }
            
            if (parsedData.timeSeries && parsedData.timeSeries.models) {
              console.log(`Time series models count: ${parsedData.timeSeries.models.length}`);
            }
            
            if (parsedData.table) {
              console.log(`Table data count: ${parsedData.table.length}`);
            }
          } else if (key.startsWith('cloudMetrics')) {
            if (parsedData.raw) {
              console.log(`Raw models count: ${parsedData.raw.length}`);
              const uniqueModels = new Set();
              parsedData.raw.forEach(item => {
                uniqueModels.add(`${item.provider}-${item.model_name}`);
              });
              console.log(`Unique models in cloudMetrics: ${uniqueModels.size}`);
              console.log('Sample models:', Array.from(uniqueModels).slice(0, 5));
            }
          }
        } catch (err) {
          console.error(`Error parsing data for key ${key}:`, err);
          console.log('Data length:', data.length);
          console.log('Data preview:', data.substring(0, 200) + '...');
        }
      } else {
        console.log(`Key ${key} does not exist in Redis`);
      }
    }
    
    // Check the last update timestamps
    for (const key of specificKeys) {
      const lastUpdateKey = `${key}:lastUpdate`;
      console.log(`\nChecking last update key: ${lastUpdateKey}`);
      const lastUpdate = await redisClient.get(lastUpdateKey);
      
      if (lastUpdate) {
        const timestamp = parseInt(lastUpdate);
        const date = new Date(timestamp);
        console.log(`Last update: ${date.toISOString()} (${(Date.now() - timestamp) / 1000 / 60} minutes ago)`);
      } else {
        console.log(`No last update timestamp found for ${key}`);
      }
    }
    
  } catch (error) {
    console.error('Error inspecting cache:', error);
  } finally {
    // Close Redis connection
    redisClient.quit();
  }
}

inspectCache(); 