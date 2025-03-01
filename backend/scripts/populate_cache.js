require('dotenv').config({ path: '../.env' });
const fetch = require('node-fetch');
const Redis = require('ioredis');

// Connect to Redis
const redisClient = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
  db: Number(process.env.REDIS_DB),
});

async function populateCache() {
  try {
    console.log('Connecting to Redis...');
    
    // First clear all processedMetrics keys
    console.log('Clearing existing cache...');
    const keys = await redisClient.keys('processedMetrics*');
    if (keys.length > 0) {
      await redisClient.del(keys);
      console.log(`Cleared ${keys.length} cache keys`);
    } else {
      console.log('No existing cache keys found');
    }
    
    // Days to populate cache for
    const days = [1, 2, 3, 4, 5, 7, 10, 14, 30];
    
    console.log('Populating cache for all day ranges...');
    for (const day of days) {
      try {
        console.log(`Fetching data for ${day} days...`);
        
        // Fetch with bypass_cache to ensure we get fresh data
        const url = `https://api.llm-benchmarks.com/api/processed?days=${day}&bypass_cache=true`;
        const response = await fetch(url);
        
        if (!response.ok) {
          console.error(`Error fetching ${day} days: ${response.status} ${response.statusText}`);
          continue;
        }
        
        const data = await response.json();
        
        if (data && (data.speedDistribution || data.message)) {
          console.log(`Successfully populated cache for ${day} days`);
        } else {
          console.warn(`Received empty or invalid data for ${day} days`);
        }
      } catch (error) {
        console.error(`Error processing ${day} days:`, error);
      }
      
      // Wait a bit between requests to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('Cache population complete!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    redisClient.quit();
  }
}

populateCache().catch(console.error); 