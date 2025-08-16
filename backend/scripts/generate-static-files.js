require('dotenv').config({ path: '../.env' });
const fs = require('fs/promises');
const path = require('path');

// Simple HTTP-based static file generation
async function generateStaticFiles() {
    console.log('🚀 Starting static file generation...');
    const startTime = Date.now();
    
    try {
        // Define the day ranges to generate
        const dayRanges = [1, 2, 3, 4, 5, 7, 10, 14, 30];
        
        // Ensure output directory exists
        const outputDir = path.join(__dirname, '..', 'public', 'api');
        await fs.mkdir(outputDir, { recursive: true });
        console.log(`📁 Output directory: ${outputDir}`);
        
        // Wait for the main app to be ready
        console.log('⏳ Waiting for main app to be ready...');
        await waitForApp();
        
        // Generate static files for each day range by calling the API
        for (const days of dayRanges) {
            console.log(`\n🔄 Processing ${days} days...`);
            const dayStartTime = Date.now();
            
            try {
                // Make HTTP call to our own API with bypass_static=true to force regeneration
                console.log(`  📡 Calling API: /api/processed?days=${days}&bypass_static=true`);
                
                const response = await fetch(`http://localhost:3000/api/processed?days=${days}&bypass_static=true`);
                
                if (!response.ok) {
                    throw new Error(`API call failed: ${response.status} ${response.statusText}`);
                }
                
                const processedData = await response.json();
                
                // Write static file
                const filename = `processed-${days}days.json`;
                const filepath = path.join(outputDir, filename);
                
                console.log(`  📝 Writing to: ${filepath}`);
                await fs.writeFile(filepath, JSON.stringify(processedData));
                
                // Verify file was written
                const stats = await fs.stat(filepath);
                const sizeKB = (stats.size / 1024).toFixed(2);
                const dayTime = Date.now() - dayStartTime;
                
                console.log(`  ✅ ${filename} (${sizeKB} KB) - Generated in ${dayTime}ms`);
                
            } catch (error) {
                console.error(`  ❌ Error processing ${days} days:`, error.message);
                // Continue with other ranges even if one fails
            }
        }
        
        const totalTime = Date.now() - startTime;
        console.log(`\n🎉 Static file generation completed in ${totalTime}ms`);
        
    } catch (error) {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    }
}

// Helper function to wait for the main app to be ready
async function waitForApp() {
    const maxRetries = 30; // Wait up to 30 seconds
    const retryDelay = 1000; // 1 second between retries
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch('http://localhost:3000/api/health');
            if (response.ok) {
                console.log('✅ Main app is ready');
                return;
            }
        } catch (error) {
            // App not ready yet, continue waiting
        }
        
        console.log(`⏳ Waiting for app... (attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
    
    throw new Error('Main app failed to become ready within timeout');
}

// Polyfill fetch for older Node.js versions
if (typeof fetch === 'undefined') {
    global.fetch = require('node-fetch');
}

// Run the generation
generateStaticFiles().catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
});