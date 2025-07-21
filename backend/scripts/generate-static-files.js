require('dotenv').config({ path: '../.env' });
const fs = require('fs/promises');
const path = require('path');
const mongoose = require('mongoose');

// Import the processing functions directly
async function generateStaticFiles() {
    console.log('🚀 Starting static file generation...');
    const startTime = Date.now();
    
    try {
        // Connect to MongoDB
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Import required modules after connection
        const { CloudMetrics } = require('../models/BenchmarkMetrics');
        const { processSpeedDistData, processTimeSeriesData, processRawTableData } = require('../utils/dataProcessing');
        const { cleanTransformCloud } = require('../utils/processCloud');
        const { roundNumbers } = require('../utils/dataUtils');
        
        // Define the day ranges to generate
        const dayRanges = [1, 2, 3, 4, 5, 7, 10, 14, 30];
        
        // Ensure output directory exists
        const outputDir = path.join(__dirname, '..', 'public', 'api');
        await fs.mkdir(outputDir, { recursive: true });
        console.log(`📁 Output directory: ${outputDir}`);
        
        // Generate static files for each day range
        for (const days of dayRanges) {
            console.log(`\n🔄 Processing ${days} days...`);
            const dayStartTime = Date.now();
            
            try {
                // Fetch raw metrics directly from MongoDB (same logic as benchmark.ts)
                const dateFilter = new Date();
                dateFilter.setDate(dateFilter.getDate() - days);
                
                console.log(`  📊 Fetching raw data for ${days} days (since ${dateFilter.toISOString()})...`);
                const rawMetrics = await CloudMetrics.find({ run_ts: { $gte: dateFilter } })
                    .select("model_name provider tokens_per_second time_to_first_token run_ts display_name")
                    .lean()
                    .exec();
                
                console.log(`  📊 Found ${rawMetrics.length} raw metrics`);
                
                if (rawMetrics.length === 0) {
                    console.log(`  ⚠️  No data found for ${days} days, skipping...`);
                    continue;
                }
                
                // Process the data using the same logic as the API
                console.log(`  🔄 Processing data...`);
                
                // Transform data first
                const transformedData = cleanTransformCloud(rawMetrics);
                
                // Apply model mapping
                const { mapModelNames } = require('../utils/modelMappingDB');
                const mappedData = await mapModelNames(transformedData, process.env.USE_DATABASE_MODELS === 'true');
                
                // Run the processing operations in parallel
                const [speedDistData, timeSeriesData, tableData] = await Promise.all([
                    processSpeedDistData(mappedData),
                    processTimeSeriesData(mappedData, days),
                    processRawTableData(mappedData)
                ]);

                const processedData = roundNumbers({
                    speedDistribution: speedDistData,
                    timeSeries: timeSeriesData,
                    table: tableData
                });
                
                // Save to static file
                const filename = `processed-${days}days.json`;
                const filepath = path.join(outputDir, filename);
                
                // Add metadata
                const output = {
                    ...processedData,
                    metadata: {
                        generated_at: new Date().toISOString(),
                        days_requested: days,
                        raw_records_count: rawMetrics.length,
                        processing_time_ms: Date.now() - dayStartTime,
                        cache_type: 'STATIC-FILE'
                    }
                };
                
                await fs.writeFile(filepath, JSON.stringify(output, null, 2));
                
                const processingTime = Date.now() - dayStartTime;
                const fileSizeKB = Math.round((await fs.stat(filepath)).size / 1024);
                
                console.log(`  ✅ Generated ${filename} (${fileSizeKB}KB) in ${processingTime}ms`);
                
            } catch (error) {
                console.error(`  ❌ Error processing ${days} days:`, error.message);
                // Continue with other day ranges even if one fails
            }
        }
        
        // Generate status data static file
        console.log(`\n🔄 Generating status data...`);
        try {
            // Import status processing logic
            const { default: StatusModel } = require('../models/Status');
            
            // Fetch status data
            const statusData = await StatusModel.find({}).lean().exec();
            
            if (statusData.length > 0) {
                const statusOutput = {
                    data: statusData,
                    metadata: {
                        generated_at: new Date().toISOString(),
                        record_count: statusData.length,
                        cache_type: 'STATIC-FILE'
                    }
                };
                
                const statusFilepath = path.join(outputDir, 'status.json');
                await fs.writeFile(statusFilepath, JSON.stringify(statusOutput, null, 2));
                
                const statusSizeKB = Math.round((await fs.stat(statusFilepath)).size / 1024);
                console.log(`  ✅ Generated status.json (${statusSizeKB}KB)`);
            } else {
                console.log(`  ⚠️  No status data found`);
            }
        } catch (error) {
            console.error(`  ❌ Error generating status data:`, error.message);
        }
        
        const totalTime = Date.now() - startTime;
        console.log(`\n🎉 Static file generation completed in ${totalTime}ms`);
        
        // List all generated files
        console.log('📋 Generated files:');
        const files = await fs.readdir(outputDir);
        for (const file of files.filter(f => f.endsWith('.json'))) {
            const filePath = path.join(outputDir, file);
            const stats = await fs.stat(filePath);
            const sizeKB = Math.round(stats.size / 1024);
            const age = Math.round((Date.now() - stats.mtime.getTime()) / 1000);
            console.log(`  📄 ${file} (${sizeKB}KB, ${age}s old)`);
        }
        
    } catch (error) {
        console.error('❌ Fatal error:', error);
        process.exit(1);
        
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    await mongoose.disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    await mongoose.disconnect();
    process.exit(0);
});

// Run the generation
generateStaticFiles().catch(console.error);