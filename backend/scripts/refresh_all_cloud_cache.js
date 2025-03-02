require("dotenv").config({ path: "../../.env" });

const path = require('path');
const fs = require('fs');
const Redis = require('ioredis');
const axios = require('axios');

// Use environment variables
const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379");
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const REDIS_DB = parseInt(process.env.REDIS_DB || "1");
const API_BASE_URL = process.env.BACKEND_URL;

// Connect to Redis
const redisClient = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  db: REDIS_DB,
});

console.log(`Connecting to Redis at ${REDIS_HOST}:${REDIS_PORT} (DB: ${REDIS_DB})`);
console.log(`Using API URL: ${API_BASE_URL}`);

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function clearCache() {
  try {
    console.log('Connecting to Redis...');
    
    // Check connection
    await redisClient.ping();
    console.log('Connected to Redis successfully');
    
    // Get all metrics keys (both processed and cloud)
    const allKeys = await redisClient.keys('*Metrics:*');
    console.log(`Found ${allKeys.length} total metrics keys in Redis`);
    
    // Log keys found for debugging
    if (allKeys.length > 0) {
      console.log('Found keys:', allKeys);
    }
    
    // Delete all metrics keys
    if (allKeys.length > 0) {
      const result = await redisClient.del(...allKeys);
      console.log(`Successfully deleted ${result} metrics keys from Redis`);
    } else {
      console.log('No metrics keys to delete');
    }

    console.log('Cache cleared successfully');
    return true;
  } catch (error) {
    console.error('Error clearing cache:', error);
    return false;
  }
}

async function refreshCacheForDay(day) {
  try {
    console.log(`Refreshing cache for days=${day}...`);
    const response = await axios.get(`${API_BASE_URL}/api/refreshCloudCache?days=${day}`);
    
    if (response.status === 200) {
      console.log(`Successfully refreshed cache for days=${day}`);
      console.log(`Details:`, response.data.details);
      return true;
    } else {
      console.error(`Failed to refresh cache for days=${day}: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.error(`Error refreshing cache for days=${day}:`, error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

async function main() {
  try {
    // Step 1: Clear cache
    const cleared = await clearCache();
    if (!cleared) {
      console.error('Failed to clear cache, aborting refresh');
      redisClient.quit();
      return;
    }
    
    // Step 2: Refresh cache for days 1-30
    console.log('Starting cache refresh for days 1-30...');
    
    const daysToRefresh = [1, 3, 7, 14, 30]; // Most important days to refresh
    
    for (const day of daysToRefresh) {
      await refreshCacheForDay(day);
      // Add a small delay between requests to prevent overloading
      await sleep(2000);
    }
    
    console.log('Completed refreshing all cloud caches');
  } catch (error) {
    console.error('Unexpected error:', error);
  } finally {
    // Close Redis connection
    redisClient.quit();
  }
}

main(); 