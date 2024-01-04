// Import required modules
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const winston = require("winston");

// Initialize logging with Winston
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'llm-bench-back' },
  transports: [
    new winston.transports.Console()
  ],
});

const app = express();
const { LocalMetrics, CloudMetrics, CloudMetricsOld } = require("./models/BenchmarkMetrics");

// Regular expression to match the model size in the names
const modelSizeRegex = /(\d+(\.\d+)?)(m|b)/i;

mongoose.set('debug', true);

app.use(cors());

// Extract size (params) in millions from name string
function extractModelSize(modelName) {
  // Special case for 'mixtral' models
  if (modelName.toLowerCase().includes("mixtral")) {
    // If it's a 'mixtral' model, set the numerical part to 56 billion
    return 56000; // Convert to millions
  }

  // Use regex to extract the parameter size with a specific pattern
  let match = modelName.match(/(\d+)x(\d+(\.\d+)?)([MmBb])/);
  if (!match) {
    // If no multiplier pattern is found, try matching without multiplier
    match = modelName.match(/(\d+(\.\d+)?)([MmBb])/);
    if (!match) {
      return null;
    }
    let size = parseFloat(match[1]);
    let unit = match[3] ? match[3].toLowerCase() : null; // Corrected this line
    // Convert billions to millions if necessary
    if (unit === 'b') {
      size = size * 1000;
    }
    return Math.round(size);
  } else {
    // If multiplier pattern is found, calculate the total size
    let multiplier = parseInt(match[1]);
    let size = parseFloat(match[2]);
    let unit = match[4] ? match[4].toLowerCase() : null; // Corrected this line
    let totalSize = size * multiplier;
    // Convert billions to millions if necessary
    if (unit === 'b') {
      totalSize = totalSize * 1000;
    }
    return Math.round(totalSize);
  }
}

// Grab the metrics from the database and send them to the client
function createEndpoint(app, path, model, addModelSize = false) {
  app.get(path, async (req, res) => {
    try {
      const metrics = await model.find({}).select('-times_between_tokens');
      if (!metrics || metrics.length === 0) {
        logger.warn("No metrics found in the database");
        return res.status(404).json({ message: "No metrics found" });
      }

      let metricsToSend = metrics;

      if (addModelSize) {
        metricsToSend = metrics.map(metric => ({
          ...metric.toObject(),
          model_size: extractModelSize(metric.model_name),
        }));
      }

      for (let i = metricsToSend.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [metricsToSend[i], metricsToSend[j]] = [metricsToSend[j], metricsToSend[i]];
      }

      logger.info(`Fetched ${metricsToSend.length} metrics`);
      res.json(metricsToSend);
    } catch (err) {
      logger.error(`Error while fetching metrics: ${err.message}`);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}

// Connecting to mongo
async function connectToMongoDB() {
  try {
    logger.info(`Verifying MONGODB_URI: ${process.env.MONGODB_URI}`);

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    logger.info(`MongoDB connected to ${process.env.MONGODB_URI}`);
  } catch (err) {
    logger.error(`MongoDB connection error: ${JSON.stringify(err)}`);
  }
}


// Async function to start everything
async function initialize() {
  await connectToMongoDB();
  const PORT = process.env.PORT;
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
}

// Create endpoints for the two collections
createEndpoint(app, "/api/localBenchmarks", LocalMetrics, true);
createEndpoint(app, "/api/cloudBenchmarks", CloudMetrics);
createEndpoint(app, "/api/cloudBenchmarksOld", CloudMetricsOld);

initialize();
