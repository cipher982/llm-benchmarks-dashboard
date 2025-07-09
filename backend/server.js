const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '5000', 10);

// Static data generation
async function generateStaticData() {
  console.log('🔄 Starting static data generation...');
  const startTime = Date.now();
  
  try {
    // Import modules dynamically to avoid issues with Next.js compilation
    const { CloudMetrics } = require('./models/BenchmarkMetrics');
    const { fetchAndProcessMetrics } = require('./utils/apiMiddleware');
    const { processAllMetrics } = require('./pages/api/processed');
    
    // Ensure public/api directory exists
    const publicDir = path.join(__dirname, 'public');
    const apiDir = path.join(publicDir, 'api');
    
    await fs.mkdir(publicDir, { recursive: true });
    await fs.mkdir(apiDir, { recursive: true });
    
    // Generate data for different time ranges
    const timeRanges = [3, 7, 14];
    
    for (const days of timeRanges) {
      console.log(`📊 Generating data for ${days} days...`);
      
      // Fetch raw data (same logic as processed.ts)
      const rawData = await fetchAndProcessMetrics(
        CloudMetrics,
        days,
        (data) => data
      );
      
      const metricsArray = Array.isArray(rawData) ? rawData : (rawData.raw || []);
      
      if (metricsArray.length === 0) {
        console.warn(`⚠️  No metrics found for ${days} days`);
        continue;
      }
      
      // Process the data (same logic as processed.ts)
      const processedData = await processAllMetrics(metricsArray, days);
      
      // Write static file
      const filename = `processed-${days}days.json`;
      const filepath = path.join(apiDir, filename);
      
      console.log(`📝 Writing to: ${filepath}`);
      await fs.writeFile(filepath, JSON.stringify(processedData));
      
      // Verify file was written
      const stats = await fs.stat(filepath);
      console.log(`✅ Generated ${filename} (${metricsArray.length} metrics, ${Math.round(stats.size/1024)}KB)`);
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
    
    // Generate data on startup
    console.log('🚀 Generating initial static data...');
    setTimeout(generateStaticData, 2000); // Wait 2 seconds for server to be fully ready
  });
}); 