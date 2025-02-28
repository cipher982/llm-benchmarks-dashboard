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
const endpoint = args.endpoint || 'benchmark';

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
  console.log(colors.gray(`Parameters: ${days} days, limit ${limit} documents, endpoint: ${endpoint}`));

  try {
    // Dynamically import node-fetch
    const { default: fetch } = await import('node-fetch');
    
    let url;
    if (endpoint === 'refreshCloudCache') {
      url = `${baseUrl}/api/refreshCloudCache?days=${days}&force=true&ts=${Date.now()}`;
    } else {
      url = `${baseUrl}/api/${endpoint}?days=${days}&limit=${limit}&includeData=${includeData}`;
    }
    
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
    console.log(colors.cyan(`  - Total round trip time: ${formatTime(totalRoundTripTime)}`));
    
    if (endpoint === 'refreshCloudCache') {
      console.log(colors.cyan(`  - Message: ${result.message}`));
      if (result.details) {
        console.log(colors.cyan(`  - Total metrics: ${result.details.totalMetrics || 'N/A'}`));
      }
    } else {
      console.log(colors.cyan(`  - Documents fetched: ${result.summary?.documentsFetched || 'N/A'}`));
      console.log(colors.cyan(`  - Models processed: ${result.summary?.modelsProcessed || 'N/A'}`));
      console.log(colors.cyan(`  - Response size: ${result.summary?.responseSize || 'N/A'}`));
      console.log(colors.cyan(`  - Total server processing time: ${result.summary?.totalTimeMs ? formatTime(result.summary.totalTimeMs) : 'N/A'}`));
      console.log(colors.cyan(`  - Network overhead: ${result.summary?.totalTimeMs ? formatTime(totalRoundTripTime - result.summary.totalTimeMs) : 'N/A'}`));
      
      // Display timing breakdown
      if (result.timings && result.timings.length > 0) {
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
      }
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