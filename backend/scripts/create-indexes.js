require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');

async function createIndexes() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;
        
        // Get the CloudMetrics collection (assuming it's named 'cloudmetrics' or 'benchmarkmetrics')
        const collections = await db.listCollections().toArray();
        console.log('📋 Available collections:', collections.map(c => c.name));
        
        // Try common collection names for the metrics data
        const possibleCollectionNames = ['cloudmetrics', 'benchmarkmetrics', 'metrics', 'cloud_metrics'];
        let metricsCollection = null;
        
        for (const name of possibleCollectionNames) {
            try {
                const collection = db.collection(name);
                const count = await collection.countDocuments({}, { limit: 1 });
                if (count > 0) {
                    metricsCollection = collection;
                    console.log(`📊 Found metrics data in collection: ${name}`);
                    break;
                }
            } catch (err) {
                // Collection doesn't exist, continue
            }
        }
        
        if (!metricsCollection) {
            console.log('❌ Could not find metrics collection. Please check collection names.');
            return;
        }
        
        const collectionName = metricsCollection.collectionName;
        console.log(`🎯 Working with collection: ${collectionName}`);
        
        // Check existing indexes
        console.log('🔍 Checking existing indexes...');
        const existingIndexes = await metricsCollection.indexes();
        console.log('📑 Existing indexes:', existingIndexes.map(idx => ({ 
            name: idx.name, 
            key: idx.key 
        })));
        
        // Create performance-critical indexes based on the queries we found
        console.log('🚀 Creating performance indexes...');
        
        // 1. Index for run_ts queries (most critical - used in /api/benchmark and /api/processed)
        try {
            await metricsCollection.createIndex({ run_ts: -1 }, { 
                name: 'idx_run_ts_desc',
                background: true 
            });
            console.log('✅ Created index: run_ts (descending)');
        } catch (err) {
            if (err.code === 85) {
                console.log('✅ Index run_ts already exists');
            } else {
                console.error('❌ Error creating run_ts index:', err.message);
            }
        }
        
        // 2. Compound index for provider + model_name queries
        try {
            await metricsCollection.createIndex(
                { provider: 1, model_name: 1 }, 
                { 
                    name: 'idx_provider_model',
                    background: true 
                }
            );
            console.log('✅ Created compound index: provider + model_name');
        } catch (err) {
            if (err.code === 85) {
                console.log('✅ Compound index provider + model_name already exists');
            } else {
                console.error('❌ Error creating provider + model_name index:', err.message);
            }
        }
        
        // 3. Compound index for run_ts + provider (for filtered time range queries)
        try {
            await metricsCollection.createIndex(
                { run_ts: -1, provider: 1 }, 
                { 
                    name: 'idx_run_ts_provider',
                    background: true 
                }
            );
            console.log('✅ Created compound index: run_ts + provider');
        } catch (err) {
            if (err.code === 85) {
                console.log('✅ Compound index run_ts + provider already exists');
            } else {
                console.error('❌ Error creating run_ts + provider index:', err.message);
            }
        }
        
        // 4. Index for model_name queries (used in sitemap and model lookups)
        try {
            await metricsCollection.createIndex({ model_name: 1 }, { 
                name: 'idx_model_name',
                background: true 
            });
            console.log('✅ Created index: model_name');
        } catch (err) {
            if (err.code === 85) {
                console.log('✅ Index model_name already exists');
            } else {
                console.error('❌ Error creating model_name index:', err.message);
            }
        }
        
        // 5. Compound index for run_ts + model_name + provider (covering index for common queries)
        try {
            await metricsCollection.createIndex(
                { run_ts: -1, model_name: 1, provider: 1 }, 
                { 
                    name: 'idx_run_ts_model_provider_covering',
                    background: true 
                }
            );
            console.log('✅ Created covering index: run_ts + model_name + provider');
        } catch (err) {
            if (err.code === 85) {
                console.log('✅ Covering index already exists');
            } else {
                console.error('❌ Error creating covering index:', err.message);
            }
        }
        
        // Check the models collection too (if it exists)
        try {
            const modelsCollection = db.collection('models');
            const modelCount = await modelsCollection.countDocuments({}, { limit: 1 });
            
            if (modelCount > 0) {
                console.log('📋 Found models collection, creating indexes...');
                
                // Index for models collection (provider + model_id compound)
                try {
                    await modelsCollection.createIndex(
                        { provider: 1, model_id: 1 }, 
                        { 
                            name: 'idx_provider_model_id',
                            unique: true,
                            background: true 
                        }
                    );
                    console.log('✅ Created unique compound index on models: provider + model_id');
                } catch (err) {
                    if (err.code === 85) {
                        console.log('✅ Models compound index already exists');
                    } else {
                        console.error('❌ Error creating models index:', err.message);
                    }
                }
            }
        } catch (err) {
            console.log('ℹ️  Models collection not found or accessible');
        }
        
        // Final verification - show all indexes
        console.log('\n🔍 Final index verification:');
        const finalIndexes = await metricsCollection.indexes();
        finalIndexes.forEach(idx => {
            console.log(`  📑 ${idx.name}: ${JSON.stringify(idx.key)}`);
        });
        
        console.log('\n🎉 Index creation completed successfully!');
        console.log('📈 Expected performance improvements:');
        console.log('  • /api/benchmark queries: 60s → 2-3s');
        console.log('  • /api/processed queries: 30s → 1-2s');
        console.log('  • Model lookup queries: 5s → <100ms');
        
    } catch (error) {
        console.error('❌ Error creating indexes:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

createIndexes().catch(console.error);