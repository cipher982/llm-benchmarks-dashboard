require('dotenv').config({ path: '../.env' });
const { MongoClient } = require('mongodb');

// Set up MongoDB
const uri = process.env.MONGODB_URI;
console.log('MongoDB URI:', uri.replace(/\/\/.*?:.*?@/, "//[CREDENTIALS_HIDDEN]@"));
const client = new MongoClient(uri);

async function checkDaysData() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const database = client.db('llm-bench');
    
    // Check available collections
    const collections = await database.listCollections().toArray();
    console.log('Available collections:');
    collections.forEach(coll => console.log(` - ${coll.name}`));
    
    // Try different collection names that might contain metrics
    const possibleCollections = ['cloud_metrics', 'metrics_cloud_v2', 'cloud_metrics_v2'];
    
    for (const collName of possibleCollections) {
      console.log(`\nTrying collection: ${collName}`);
      const collection = database.collection(collName);
      
      // Get total count
      const totalCount = await collection.countDocuments();
      console.log(`Total documents in ${collName}: ${totalCount}`);
      
      if (totalCount > 0) {
        // Get a sample document
        const sampleDoc = await collection.findOne();
        console.log('Sample document keys:', Object.keys(sampleDoc));
        
        // Look for any timestamp fields
        const timestampFields = Object.keys(sampleDoc).filter(key => 
          key.includes('time') || key.includes('date') || key.includes('ts')
        );
        console.log('Potential timestamp fields:', timestampFields);
        
        if (timestampFields.length > 0) {
          // Check the first timestamp field type
          const fieldToCheck = timestampFields[0];
          console.log(`Field ${fieldToCheck} type:`, typeof sampleDoc[fieldToCheck]);
          console.log(`Field ${fieldToCheck} value:`, sampleDoc[fieldToCheck]);
          
          if (sampleDoc[fieldToCheck]) {
            // Try queries with this field for different day ranges
            const workingDays = [1, 3, 7, 10, 14];
            const nonWorkingDays = [2, 4, 5];
            
            console.log('\nTesting working day ranges:');
            for (const days of workingDays) {
              const dateFilter = new Date();
              dateFilter.setDate(dateFilter.getDate() - days);
              
              const count = await collection.countDocuments({ [fieldToCheck]: { $gte: dateFilter } });
              console.log(`Days ${days}: ${count} documents found`);
              
              // Check for ISODate string format
              const dateStr = dateFilter.toISOString();
              const strCount = await collection.countDocuments({ [fieldToCheck]: { $gte: dateStr } });
              console.log(`Days ${days} (string comparison): ${strCount} documents found`);
            }
            
            console.log('\nTesting non-working day ranges:');
            for (const days of nonWorkingDays) {
              const dateFilter = new Date();
              dateFilter.setDate(dateFilter.getDate() - days);
              
              const count = await collection.countDocuments({ [fieldToCheck]: { $gte: dateFilter } });
              console.log(`Days ${days}: ${count} documents found`);
              
              // Check for ISODate string format
              const dateStr = dateFilter.toISOString();
              const strCount = await collection.countDocuments({ [fieldToCheck]: { $gte: dateStr } });
              console.log(`Days ${days} (string comparison): ${strCount} documents found`);
            }
          }
        }
      }
    }
  } finally {
    await client.close();
    console.log('Connection closed');
  }
}

checkDaysData().catch(console.error); 