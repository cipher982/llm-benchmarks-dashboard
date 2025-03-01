require('dotenv').config({ path: '../.env' });
const fetch = require('node-fetch');

async function testModelMapping() {
  try {
    console.log('Testing model mapping in the data processing pipeline');
    
    // First, get the raw cloud data
    console.log('Fetching raw cloud data...');
    const cloudResponse = await fetch('https://api.llm-benchmarks.com/api/cloud?days=3');
    const cloudData = await cloudResponse.json();
    
    // Get the raw models
    const rawModels = cloudData.raw || [];
    console.log(`Raw cloud data contains ${rawModels.length} models`);
    
    // Now, get the processed data with cache bypass
    console.log('Fetching processed data with cache bypass...');
    const processedResponse = await fetch('https://api.llm-benchmarks.com/api/processed?days=3&bypass_cache=true');
    const processedData = await processedResponse.json();
    
    // Check speed distribution models
    const speedDistModels = processedData.speedDistribution || [];
    console.log(`Processed data contains ${speedDistModels.length} models in speed distribution`);
    
    // Compare counts
    if (speedDistModels.length < rawModels.length * 0.5) {
      console.warn(`WARNING: Speed distribution models count (${speedDistModels.length}) is much less than raw models count (${rawModels.length})`);
      console.log('This suggests a potential issue with model mapping or data processing');
    } else {
      console.log('Model counts look reasonable');
    }
    
    // Get unique raw model providers and names
    const uniqueRawModels = new Set();
    const uniqueProviders = new Set();
    const uniqueModelNames = new Set();
    
    rawModels.forEach(model => {
      uniqueRawModels.add(`${model.provider}-${model.model_name}`);
      uniqueProviders.add(model.provider);
      uniqueModelNames.add(model.model_name);
    });
    
    console.log(`Raw data contains ${uniqueRawModels.size} unique models from ${uniqueProviders.size} providers`);
    console.log('Providers:', Array.from(uniqueProviders));
    console.log('Sample raw model names:', Array.from(uniqueModelNames).slice(0, 10));
    
    // Get unique processed model providers and names
    const uniqueProcessedModels = new Set();
    const uniqueProcessedProviders = new Set();
    const uniqueProcessedModelNames = new Set();
    
    speedDistModels.forEach(model => {
      uniqueProcessedModels.add(`${model.provider}-${model.model_name}`);
      uniqueProcessedProviders.add(model.provider);
      uniqueProcessedModelNames.add(model.model_name);
    });
    
    console.log(`Processed data contains ${uniqueProcessedModels.size} unique models from ${uniqueProcessedProviders.size} providers`);
    console.log('Processed providers:', Array.from(uniqueProcessedProviders));
    console.log('Sample processed model names:', Array.from(uniqueProcessedModelNames).slice(0, 10));
    
  } catch (error) {
    console.error('Error testing model mapping:', error);
  }
}

testModelMapping(); 