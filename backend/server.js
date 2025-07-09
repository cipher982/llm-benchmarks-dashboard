const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '5000', 10);

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
    
    // Generate data for different time ranges by calling our own API
    const timeRanges = [3, 7, 14];
    
    for (const days of timeRanges) {
      console.log(`📊 Generating data for ${days} days...`);
      
      try {
        // Make internal HTTP call to our own API (bypass static file check)
        const response = await fetch(`http://localhost:${port}/api/processed?days=${days}&bypass_static=true`);
        
        if (!response.ok) {
          throw new Error(`API call failed: ${response.status}`);
        }
        
        const processedData = await response.json();
        
        // Write static file
        const filename = `processed-${days}days.json`;
        const filepath = path.join(apiDir, filename);
        
        console.log(`📝 Writing to: ${filepath}`);
        await fs.writeFile(filepath, JSON.stringify(processedData));
        
        // Verify file was written
        const stats = await fs.stat(filepath);
        console.log(`✅ Generated ${filename} (${Math.round(stats.size/1024)}KB)`);
        
      } catch (dayError) {
        console.error(`❌ Failed to generate ${days}-day data:`, dayError.message);
      }
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
    
    // Generate data on startup
    console.log('🚀 Generating initial static data...');
    setTimeout(generateStaticData, 2000); // Wait 2 seconds for server to be fully ready
  });
}); 