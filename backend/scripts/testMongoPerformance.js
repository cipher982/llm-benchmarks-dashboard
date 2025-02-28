/**
 * Simple script to test MongoDB query performance optimization
 * 
 * This script compares:
 * 1. Original approach: select('-times_between_tokens') + toObject()
 * 2. Optimized approach: explicit field selection + lean()
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI environment variable");
  process.exit(1);
}

// Simple memory usage formatter
function formatMemoryUsage(memoryUsage) {
  return `${Math.round(memoryUsage / 1024 / 1024 * 100) / 100} MB`;
}

// Performance test function
async function testMongoPerformance() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Reference to the collection
    const CloudMetrics = mongoose.connection.collection("metrics_cloud_v2");
    
    // Setup test parameters
    const daysAgo = 7; // Test with 7 days of data
    const dateFilter = new Date();
    dateFilter.setDate(dateFilter.getDate() - daysAgo);
    
    console.log(`Fetching metrics since: ${dateFilter}`);
    console.log("-".repeat(60));

    // Test 1: Original approach (excluding one field)
    console.log("TEST 1: Original approach (select('-times_between_tokens'))");
    const memoryBefore1 = process.memoryUsage().heapUsed;
    const startTime1 = process.hrtime.bigint();
    
    // Create a model for the original approach test
    const OriginalModel = mongoose.model(
      "original_test", 
      new mongoose.Schema({}),
      "metrics_cloud_v2"
    );
    
    const originalResults = await OriginalModel.find({ run_ts: { $gte: dateFilter } })
      .select('-times_between_tokens');
    
    // Convert to plain objects (as in the original code)
    const rawOriginalResults = originalResults.map(doc => doc.toObject());
    
    const endTime1 = process.hrtime.bigint();
    const memoryAfter1 = process.memoryUsage().heapUsed;
    const memoryUsed1 = memoryAfter1 - memoryBefore1;
    const timeElapsed1 = Number(endTime1 - startTime1) / 1_000_000; // Convert to ms
    
    console.log(`Documents fetched: ${originalResults.length}`);
    console.log(`Time taken: ${timeElapsed1.toFixed(2)} ms`);
    console.log(`Memory used: ${formatMemoryUsage(memoryUsed1)}`);
    console.log(`Average document size: ${(memoryUsed1 / (originalResults.length || 1)).toFixed(2)} bytes`);
    
    // Test 2: Optimized approach (explicit field selection + lean)
    console.log("\nTEST 2: Optimized approach (explicit fields + lean())");
    const memoryBefore2 = process.memoryUsage().heapUsed;
    const startTime2 = process.hrtime.bigint();
    
    // Create a model for the optimized approach test
    const OptimizedModel = mongoose.model(
      "optimized_test", 
      new mongoose.Schema({}),
      "metrics_cloud_v2"
    );
    
    const optimizedResults = await OptimizedModel.find({ run_ts: { $gte: dateFilter } })
      .select("model_name provider tokens_per_second time_to_first_token run_ts display_name")
      .lean();
    
    const endTime2 = process.hrtime.bigint();
    const memoryAfter2 = process.memoryUsage().heapUsed;
    const memoryUsed2 = memoryAfter2 - memoryBefore2;
    const timeElapsed2 = Number(endTime2 - startTime2) / 1_000_000; // Convert to ms
    
    console.log(`Documents fetched: ${optimizedResults.length}`);
    console.log(`Time taken: ${timeElapsed2.toFixed(2)} ms`);
    console.log(`Memory used: ${formatMemoryUsage(memoryUsed2)}`);
    console.log(`Average document size: ${(memoryUsed2 / (optimizedResults.length || 1)).toFixed(2)} bytes`);
    
    // Comparison and summary
    console.log("\nPERFORMANCE COMPARISON");
    console.log("-".repeat(60));
    const timeImprovement = ((timeElapsed1 - timeElapsed2) / timeElapsed1 * 100).toFixed(2);
    const memoryImprovement = ((memoryUsed1 - memoryUsed2) / memoryUsed1 * 100).toFixed(2);
    
    console.log(`Time improvement: ${timeImprovement}%`);
    console.log(`Memory improvement: ${memoryImprovement}%`);
    
    // Sample document comparison
    if (originalResults.length > 0 && optimizedResults.length > 0) {
      console.log("\nSAMPLE DOCUMENT COMPARISON");
      console.log("-".repeat(60));
      console.log("Original document keys:", Object.keys(rawOriginalResults[0]).length, "properties");
      console.log("Optimized document keys:", Object.keys(optimizedResults[0]).length, "properties");
    }
    
  } catch (error) {
    console.error("Error running performance test:", error);
  } finally {
    await mongoose.connection.close();
    console.log("MongoDB connection closed");
    process.exit(0);
  }
}

// Run the test
testMongoPerformance(); 