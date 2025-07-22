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
      // Step 1: Direct MongoDB query (no HTTP request)
      const queryStart = Date.now();
      console.log(`🔍 Fetching ${maxDays} days of data from MongoDB...`);
      
      // Enable TypeScript support for requiring .ts files
      require('ts-node').register({
        transpileOnly: true,
        compilerOptions: {
          module: 'commonjs',
          moduleResolution: 'node',
          target: 'es2017',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true
        }
      });
      
      // Import the raw data utility
      const { generateRawData } = require('./utils/staticGeneration');
      
      // Get raw data from MongoDB
      const rawMetrics = await generateRawData(maxDays);
      
      // Process using existing API logic
      const { processAllMetrics } = require('./pages/api/processed.ts');
      
      const maxData = await processAllMetrics(rawMetrics, maxDays);
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
      console.error(`❌ Static data generation failed:`, error.message);
      throw error; // No fallback - fix the real issue
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

// Verify all required static files exist
async function verifyStaticFiles() {
  const requiredFiles = [
    'processed-3days.json',
    'processed-7days.json', 
    'processed-12days.json',
    'processed-14days.json'
  ];
  
  for (const filename of requiredFiles) {
    const filepath = path.join(__dirname, 'public', 'api', filename);
    try {
      await fs.access(filepath);
      console.log(`✅ ${filename} exists`);
    } catch {
      throw new Error(`❌ Required static file missing: ${filename}`);
    }
  }
}

// Bootstrap application - static files MUST exist before serving
async function bootstrap() {
  console.log('\n🚀 BOOTSTRAPPING APPLICATION...');
  console.log('📊 Static files are the core of this application');
  console.log('⏳ Generating static files before serving requests...\n');
  
  try {
    // Generate all static files
    await generateStaticData();
    
    // Verify they exist
    await verifyStaticFiles();
    
    console.log('\n🎉 STATIC FILES READY - APPLICATION IS READY TO SERVE');
    console.log('⚡ All requests will be instant (serving static files)');
    
    return true;
  } catch (error) {
    console.error('\n❌ BOOTSTRAP FAILED:', error.message);
    console.error('🚨 Application cannot start without static files');
    process.exit(1);
  }
}

app.prepare().then(async () => {
  // CRITICAL: Don't start server until static files are ready
  await bootstrap();
  
  const server = createServer((req, res) => {
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
  });
  
  server.listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`\n🌐 SERVER READY: http://${hostname}:${port}`);
    console.log(`📦 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔄 Static files refresh every 30 minutes`);
    
    // Schedule static data generation every 30 minutes
    cron.schedule('*/30 * * * *', () => {
      console.log('⏰ Refreshing static files (30min interval)');
      generateStaticData();
    });
  });
}); 