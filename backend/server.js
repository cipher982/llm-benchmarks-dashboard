const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');

// Enforce explicit environment via NODE_ENV only
const NODE_ENV = process.env.NODE_ENV;
if (!NODE_ENV || !['production', 'development'].includes(NODE_ENV)) {
  console.error('NODE_ENV must be set to "production" or "development". Refusing to start.');
  process.exit(1);
}

// In production, require ADMIN_API_KEY to be set
if (NODE_ENV === 'production' && !process.env.ADMIN_API_KEY) {
  console.error('ADMIN_API_KEY must be set in production. Refusing to start.');
  process.exit(1);
}

// Drive Next dev mode from NODE_ENV
const dev = NODE_ENV === 'development';

function isAuthorizedAdmin(req) {
  if (dev) return true; // allow in development
  const token = req.headers['x-admin-key'];
  const expected = process.env.ADMIN_API_KEY;
  return Boolean(expected && token === expected);
}
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

// Static data generation - SIMPLIFIED: Direct generation for each range
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
    
    const timeRanges = [3, 7, 12, 14];
    console.log(`🎯 Generating ${timeRanges.length} static files...`);
    
    // Simple approach: Generate each file independently
    const results = [];
    
    for (const days of timeRanges) {
      const fileStart = Date.now();
      console.log(`📊 Generating ${days}-day file...`);
      
      try {
        // Direct API call for the exact range needed
        const response = await fetch(`http://localhost:${port}/api/processed?days=${days}&bypass_static=true`);
        if (!response.ok) {
          throw new Error(`API call failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Write static file
        const filename = `processed-${days}days.json`;
        const filepath = path.join(apiDir, filename);
        
        console.log(`  📝 Writing ${filename}...`);
        await fs.writeFile(filepath, JSON.stringify(data));
        
        // Verify file was written
        const stats = await fs.stat(filepath);
        const duration = Date.now() - fileStart;
        
        console.log(`  ✅ Generated ${filename} (${Math.round(stats.size/1024)}KB) in ${duration}ms`);
        console.log(`  📊 ${data.timeSeries?.models?.length || 0} models, ${data.table?.length || 0} table rows`);
        
        results.push({ days, success: true, duration, size: stats.size });
        
      } catch (error) {
        const duration = Date.now() - fileStart;
        console.error(`  ❌ Failed to generate ${days}-day file:`, error.message);
        results.push({ days, success: false, error: error.message, duration });
      }
    }
    
    // Log summary
    const successful = results.filter(r => r.success).length;
    console.log(`\n📊 Generation Summary: ${successful}/${timeRanges.length} files generated successfully`);
    
    // Generate local data static file
    console.log(`\n🔄 Processing local data...`);
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
      if (!isAuthorizedAdmin(req)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Forbidden' }));
        return;
      }
      generateStaticData();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'triggered', timestamp: new Date() }));
      return;
    }
    
    // Diagnostic endpoint
    if (parsedUrl.pathname === '/admin/debug' && req.method === 'GET') {
      if (!isAuthorizedAdmin(req)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Forbidden' }));
        return;
      }
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
    console.log(`> Environment: NODE_ENV=${process.env.NODE_ENV}`);
    console.log(`> Coolify URL: ${process.env.COOLIFY_URL || 'not set'}`);
    console.log(`> Node version: ${process.versions.node}`);
    console.log(`> fetch available: ${typeof fetch !== 'undefined'}`);
    
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
