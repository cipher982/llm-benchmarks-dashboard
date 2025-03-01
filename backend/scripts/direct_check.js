require('dotenv').config({ path: '../.env' });
const { MongoClient } = require('mongodb');
const Redis = require('ioredis');

// Set up MongoDB
const uri = process.env.MONGODB_URI;
console.log('MongoDB URI:', uri.replace(/\/\/.*?:.*?@/, "//[CREDENTIALS_HIDDEN]@"));
const client = new MongoClient(uri);

// Connect to Redis
const redisClient = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
  db: Number(process.env.REDIS_DB || "0")
});

async function directCheck() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const database = client.db('llm-bench');
    const collection = database.collection('metrics_cloud_v2');
    
    // Get recent document count
    const totalCount = await collection.countDocuments();
    console.log(`Total documents in metrics_cloud_v2: ${totalCount}`);
    
    if (totalCount === 0) {
      console.error('No documents found in metrics_cloud_v2!');
      return;
    }
    
    // Check the timestamp field format
    const sampleDoc = await collection.findOne();
    console.log('Sample document run_ts:', sampleDoc.run_ts);
    console.log('Type of run_ts:', typeof sampleDoc.run_ts);
    
    // Get data for all day ranges from 1 to 60
    const dayRanges = Array.from({ length: 60 }, (_, i) => i + 1);
    
    for (const days of dayRanges) {
      // Get timestamp from X days ago
      const dateFilter = new Date();
      dateFilter.setDate(dateFilter.getDate() - days);
      
      console.log(`\nChecking data for ${days} days (since ${dateFilter})...`);
      const count = await collection.countDocuments({ run_ts: { $gte: dateFilter } });
      console.log(`Found ${count} documents for ${days} days`);
      
      if (count > 0) {
        // Get the data
        const metrics = await collection.find({ run_ts: { $gte: dateFilter } })
          .project({
            model_name: 1,
            provider: 1,
            tokens_per_second: 1,
            time_to_first_token: 1,
            run_ts: 1,
            display_name: 1,
            gpu_mem_usage: 1,
            framework: 1,
            quantization_method: 1,
            quantization_bits: 1,
            model_dtype: 1
          })
          .toArray();
          
        console.log(`Retrieved ${metrics.length} documents for ${days} days`);
        
        // Create simplified sample data (we're not doing full processing)
        const sampleData = {
          speedDistribution: [
            {
              provider: metrics[0].provider,
              model_name: metrics[0].model_name,
              mean_tokens_per_second: metrics[0].tokens_per_second,
              density_points: [{ x: 0, y: 0 }]
            }
          ],
          timeSeries: [],
          table: []
        };
        
        // Cache directly in Redis
        const cacheKey = `processedMetrics:${days}days`;
        await redisClient.set(cacheKey, JSON.stringify(sampleData));
        await redisClient.set(`${cacheKey}:lastUpdate`, Date.now().toString());
        
        console.log(`Cached sample data for ${days} days in Redis`);
      }
    }
    
    console.log('\nVerifying Redis cache:');
    const keys = await redisClient.keys('processedMetrics*');
    console.log(`Found ${keys.length} cache keys in Redis db${process.env.REDIS_DB || "0"}`);
    keys.forEach(key => console.log(` - ${key}`));
    
  } finally {
    await client.close();
    redisClient.quit();
    console.log('Connections closed');
  }
}

directCheck().catch(console.error); 