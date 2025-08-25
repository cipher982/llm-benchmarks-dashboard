const mongoose = require('mongoose');
const { CloudMetrics } = require('./backend/models/BenchmarkMetrics');
require('dotenv').config({ path: 'backend/.env.local' });

async function checkLatestMetrics() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get the most recent metric using the app's model and run_ts field
    const latest = await CloudMetrics.findOne({}).sort({ run_ts: -1 }).lean();

    if (latest) {
      const now = new Date();
      const latestDate = new Date(latest.run_ts);
      const hoursSince = (now - latestDate) / (1000 * 60 * 60);
      const daysSince = hoursSince / 24;

      console.log('\n📊 Latest Metric:');
      console.log(`  Timestamp: ${latestDate.toISOString()}`);
      console.log(`  Provider: ${latest.provider}`);
      console.log(`  Model: ${latest.model_name || latest.model}`);
      console.log(`  Hours ago: ${hoursSince.toFixed(1)}`);
      console.log(`  Days ago: ${daysSince.toFixed(1)}`);

      if (hoursSince > 1) {
        console.log(`\n⚠️  WARNING: No new metrics for ${hoursSince.toFixed(1)} hours!`);
      }
    } else {
      console.log('❌ No metrics found in database!');
    }

    // Count metrics by day for the last week using run_ts
    console.log('\n📈 Metrics per day (last 7 days):');
    for (let i = 0; i < 7; i++) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - i - 1);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date();
      endDate.setDate(endDate.getDate() - i);
      endDate.setHours(0, 0, 0, 0);

      const count = await CloudMetrics.countDocuments({
        run_ts: { $gte: startDate, $lt: endDate }
      });

      console.log(`  ${startDate.toDateString()}: ${count} metrics`);
    }

    // Check for any recent metrics in last 3 days
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const recentCount = await CloudMetrics.countDocuments({
      run_ts: { $gte: threeDaysAgo }
    });

    console.log(`\n📊 Metrics in last 3 days: ${recentCount}`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkLatestMetrics();
