#!/usr/bin/env node

/**
 * Benchmark client script for LLM Benchmarks Dashboard
 * 
 * This script calls the benchmark API endpoint and displays the results in an easy-to-read format.
 * 
 * Usage:
 *   node benchmark-client.js --days=3 --limit=5000 --url=http://localhost:3000
 */

// We need to use dynamic import for node-fetch since it's an ESM module
const colors = require('colors/safe');

// Parse command-line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.split('=');
  acc[key.replace(/^--/, '')] = value;
  return acc;
}, {});

// Set defaults
const days = parseInt(args.days || 3);
const limit = parseInt(args.limit || 10000);
const baseUrl = args.url || 'http://localhost:3000';
const includeData = args.includeData === 'true';

// Create a progress spinner
let spinnerInterval;
function startSpinner(message) {
  const spinnerChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  process.stdout.write(`${message} `);
  spinnerInterval = setInterval(() => {
    process.stdout.write(`\r${message} ${spinnerChars[i]} `);
    i = (i + 1) % spinnerChars.length;
  }, 100);
}

function stopSpinner() {
  clearInterval(spinnerInterval);
  process.stdout.write('\r\n');
}

// Format time to be more readable
function formatTime(ms) {
  if (ms < 1000) {
    return `${ms.toFixed(2)}ms`;
  } else {
    return `${(ms / 1000).toFixed(2)}s`;
  }
}

// Main function
async function runBenchmark() {
  console.log(colors.bold.blue('\n🔍 LLM Benchmarks Dashboard Performance Benchmark\n'));
  console.log(colors.gray(`Parameters: ${days} days, limit ${limit} documents`));

  try {
    // Dynamically import node-fetch
    const { default: fetch } = await import('node-fetch');
    
    const url = `${baseUrl}/api/benchmark?days=${days}&limit=${limit}&includeData=${includeData}`;
    
    startSpinner('Running benchmark...');
    
    const startTime = Date.now();
    const response = await fetch(url);
    const endTime = Date.now();
    const totalRoundTripTime = endTime - startTime;
    
    stopSpinner();
    
    if (!response.ok) {
      console.error(colors.red(`Error: HTTP ${response.status}`));
      const errorText = await response.text();
      console.error(colors.red(errorText));
      return;
    }
    
    const result = await response.json();
    
    console.log(colors.bold.green('\n✅ Benchmark completed successfully!\n'));
    
    // Display summary
    console.log(colors.bold.white('📊 Summary:'));
    console.log(colors.cyan(`  - Documents fetched: ${result.summary.documentsFetched}`));
    console.log(colors.cyan(`  - Models processed: ${result.summary.modelsProcessed}`));
    console.log(colors.cyan(`  - Response size: ${result.summary.responseSize}`));
    console.log(colors.cyan(`  - Total server processing time: ${formatTime(result.summary.totalTimeMs)}`));
    console.log(colors.cyan(`  - Total round trip time: ${formatTime(totalRoundTripTime)}`));
    console.log(colors.cyan(`  - Network overhead: ${formatTime(totalRoundTripTime - result.summary.totalTimeMs)}`));
    
    // Display timing breakdown
    console.log(colors.bold.white('\n⏱️  Timing Breakdown:'));
    
    // Calculate percentage of total time
    const serverTotalTime = result.summary.totalTimeMs;
    
    // Sort timings by duration (descending)
    const sortedTimings = [...result.timings].sort((a, b) => b.durationMs - a.durationMs);
    
    // Find the longest name for padding
    const maxNameLength = Math.max(...sortedTimings.map(t => t.name.length));
    
    // Display each timing
    sortedTimings.forEach(timing => {
      const percentage = (timing.durationMs / serverTotalTime) * 100;
      const barLength = Math.round(percentage / 2);
      const bar = '█'.repeat(Math.min(barLength, 40));
      
      const paddedName = timing.name.padEnd(maxNameLength);
      const paddedTime = formatTime(timing.durationMs).padStart(10);
      const paddedPercentage = `${percentage.toFixed(1)}%`.padStart(7);
      
      let color = colors.green;
      if (percentage > 30) color = colors.red;
      else if (percentage > 10) color = colors.yellow;
      
      console.log(`  ${paddedName} : ${paddedTime} (${paddedPercentage}) ${color(bar)}`);
    });
    
    console.log(colors.bold.blue('\n📝 Recommendations:'));
    
    // Look for bottlenecks
    const mongoTime = result.timings.find(t => t.name === 'MongoDB query')?.durationMs || 0;
    const transformTime = result.timings.find(t => t.name === 'Data transformation')?.durationMs || 0;
    const processingTime = result.timings.find(t => t.name === 'Total parallel processing')?.durationMs || 0;
    const serializationTime = result.timings.find(t => t.name === 'JSON serialization')?.durationMs || 0;
    const networkTime = totalRoundTripTime - serverTotalTime;
    
    // Analyze and make recommendations
    const bottlenecks = [];
    
    if (mongoTime > serverTotalTime * 0.3) {
      bottlenecks.push({
        area: 'MongoDB query',
        message: 'Consider adding more specific indexes or further limiting the data fetched.'
      });
    }
    
    if (transformTime > serverTotalTime * 0.3) {
      bottlenecks.push({
        area: 'Data transformation',
        message: 'Optimize the cleanTransformCloud function or pre-aggregate data in MongoDB.'
      });
    }
    
    if (processingTime > serverTotalTime * 0.3) {
      bottlenecks.push({
        area: 'Data processing',
        message: 'Optimize the processing functions or consider pre-computing some values.'
      });
    }
    
    if (serializationTime > serverTotalTime * 0.1) {
      bottlenecks.push({
        area: 'JSON serialization',
        message: 'Reduce the amount of data being returned or consider streaming responses.'
      });
    }
    
    if (networkTime > totalRoundTripTime * 0.5) {
      bottlenecks.push({
        area: 'Network transfer',
        message: 'Response size may be too large. Consider compressing responses or reducing the payload size.'
      });
    }
    
    if (bottlenecks.length === 0) {
      console.log(colors.green('  - No significant bottlenecks identified. The system appears well-balanced.'));
    } else {
      bottlenecks.forEach(bottleneck => {
        console.log(colors.yellow(`  - ${bottleneck.area}: ${bottleneck.message}`));
      });
    }
    
    console.log('\n');
    
  } catch (error) {
    stopSpinner();
    console.error(colors.red('\n❌ Error running benchmark:'));
    console.error(colors.red(error.stack || error.message || error));
  }
}

// Run the benchmark
runBenchmark(); 