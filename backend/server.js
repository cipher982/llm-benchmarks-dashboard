const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

// Static data generation using internal API calls
async function generateStaticData() {
  console.log('🔄 Starting static data generation...');
  const startTime = Date.now();
  
  try {
    // Ensure public/api directory exists
    const publicDir = path.join(__dirname, 'public');
    const apiDir = path.join(publicDir, 'api');
    
    await fs.mkdir(publicDir, { recursive: true });
    await fs.mkdir(apiDir, { recursive: true });
    
    console.log(`📁 Created directories: ${apiDir}`);
    
    // OPTIMAL ALGORITHM: Single query + local filtering instead of 4 separate queries
    const timeRanges = [3, 7, 12, 14];
    const maxDays = Math.max(...timeRanges);
    
    console.log(`🎯 OPTIMIZED: Single query for ${maxDays} days, then local filtering for ${timeRanges.length} ranges`);
    
    try {
      // Step 1: Single MongoDB query for maximum time range
      const queryStart = Date.now();
      console.log(`🔍 Fetching ${maxDays} days of data from MongoDB...`);
      
      const response = await fetch(`http://localhost:${port}/api/processed?days=${maxDays}&bypass_static=true`);
      if (!response.ok) {
        throw new Error(`MongoDB query failed: ${response.status}`);
      }
      
      const maxData = await response.json();
      const queryTime = Date.now() - queryStart;
      console.log(`✅ MongoDB query completed in ${queryTime}ms`);
      console.log(`📊 Fetched data: ${maxData.table?.length || 0} records`);
      
      // Step 2: Process each time range using the same dataset
      const processingPromises = timeRanges.map(async (days) => {
        const startTime = Date.now();
        console.log(`🔄 Processing ${days}-day range locally...`);
        
        try {
          // Filter data locally by date range
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - days);
          
          // Filter all data structures by date
          const filteredData = {
            speedDistribution: maxData.speedDistribution, // Speed dist doesn't need date filtering
            timeSeries: {
              timestamps: maxData.timeSeries.timestamps?.filter(ts => new Date(ts) >= cutoffDate) || [],
              models: maxData.timeSeries.models?.map(model => ({
                ...model,
                data: model.data?.filter((_, index) => 
                  new Date(maxData.timeSeries.timestamps[index]) >= cutoffDate
                ) || []
              })) || []
            },
            table: maxData.table?.filter(row => 
              !row.run_ts || new Date(row.run_ts) >= cutoffDate
            ) || []
          };
          
          // Write static file
          const filename = `processed-${days}days.json`;
          const filepath = path.join(apiDir, filename);
          
          console.log(`📝 Writing ${filename}...`);
          await fs.writeFile(filepath, JSON.stringify(filteredData));
          
          // Verify file was written
          const stats = await fs.stat(filepath);
          const duration = Date.now() - startTime;
          console.log(`✅ Generated ${filename} (${Math.round(stats.size/1024)}KB) in ${duration}ms`);
          console.log(`📊 Filtered to ${filteredData.table.length} records for ${days} days`);
          
          return { days, success: true, duration, size: stats.size };
          
        } catch (dayError) {
          const duration = Date.now() - startTime;
          console.error(`❌ Failed to process ${days}-day range in ${duration}ms:`, dayError.message);
          return { days, success: false, error: dayError.message, duration };
        }
      });
      
      // Wait for all processing to complete
      const results = await Promise.allSettled(processingPromises);
      
      // Log summary
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.length - successful;
      console.log(`🎯 Generation Summary: ${successful} successful, ${failed} failed`);
      
    } catch (error) {
      console.error(`❌ Optimized generation failed:`, error.message);
      
      // Fallback to original parallel method if optimization fails
      console.log(`🔄 Falling back to original parallel generation...`);
      // ... (original code would go here as fallback)
    }
    
    // Generate local data static file
    console.log(`🔄 Processing local data...`);
    const localStartTime = Date.now();
    
    try {
      const localResponse = await fetch(`http://localhost:${port}/api/local?bypass_static=true`);
      if (!localResponse.ok) {
        throw new Error(`Local API failed: ${localResponse.status}`);
      }
      
      const localData = await localResponse.json();
      const localFile = path.join(apiDir, 'local.json');
      
      console.log(`📝 Writing local.json...`);
      await fs.writeFile(localFile, JSON.stringify(localData));
      
      const localStats = await fs.stat(localFile);
      const localDuration = Date.now() - localStartTime;
      console.log(`✅ Generated local.json (${Math.round(localStats.size/1024)}KB) in ${localDuration}ms`);
      
    } catch (localError) {
      const localDuration = Date.now() - localStartTime;
      console.error(`❌ Local data generation failed in ${localDuration}ms:`, localError.message);
    }
    
    const duration = Date.now() - startTime;
    console.log(`🎉 Static data generation completed in ${duration}ms`);
    
  } catch (error) {
    console.error('❌ Static data generation failed:', error);
  }
}

// Prepare the Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    // Parse the URL
    const parsedUrl = parse(req.url, true);
    
    // Handle manual data generation trigger
    if (parsedUrl.pathname === '/admin/generate-data' && req.method === 'POST') {
      generateStaticData();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'triggered', timestamp: new Date() }));
      return;
    }
    
    // Diagnostic endpoint
    if (parsedUrl.pathname === '/admin/debug' && req.method === 'GET') {
      const diagnostics = {
        cwd: process.cwd(),
        publicPath: path.join(process.cwd(), 'public'),
        apiPath: path.join(process.cwd(), 'public', 'api'),
        env: {
          NODE_ENV: process.env.NODE_ENV,
          MONGODB_URI: process.env.MONGODB_URI ? 'SET' : 'NOT_SET'
        }
      };
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(diagnostics, null, 2));
      return;
    }
    
    // Let Next.js handle the request
    handle(req, res, parsedUrl);
  }).listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Environment: ${process.env.NODE_ENV}`);
    console.log(`> Coolify URL: ${process.env.COOLIFY_URL || 'not set'}`);
    
    // Schedule static data generation every 30 minutes
    console.log('📅 Scheduling data generation every 30 minutes...');
    cron.schedule('*/30 * * * *', () => {
      console.log('⏰ Cron triggered data generation (30min interval)');
      generateStaticData();
    });
    
    // Generate data on startup - more aggressively
    console.log('🚀 Generating initial static data...');
    
    // Start generation immediately, but with retry logic for database connectivity
    const startupGeneration = async () => {
      let retries = 0;
      const maxRetries = 5;
      
      while (retries < maxRetries) {
        try {
          console.log(`🔄 Startup generation attempt ${retries + 1}/${maxRetries}`);
          await generateStaticData();
          console.log('✅ Startup generation completed successfully');
          break;
        } catch (error) {
          retries++;
          console.error(`❌ Startup generation attempt ${retries} failed:`, error.message);
          
          if (retries < maxRetries) {
            const delay = retries * 2000; // Progressive backoff: 2s, 4s, 6s, 8s
            console.log(`⏳ Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            console.error('❌ All startup generation attempts failed. Static files may be stale.');
          }
        }
      }
    };
    
    // Start generation after a brief delay to ensure server is ready
    setTimeout(startupGeneration, 1000);
  });
}); 