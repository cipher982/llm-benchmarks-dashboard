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
const { LocalMetrics, CloudMetrics } = require("./models/BenchmarkMetrics");

// Regular expression to match the model size in the names
const modelSizeRegex = /(\d+(\.\d+)?)(m|b)/i;

mongoose.set('debug', true);

app.use(cors());

// Extract size (params) in millions from name string
function extractModelSize(modelName) {
  const match = modelName.match(modelSizeRegex);
  if (match) {
    let size = parseFloat(match[1]); // Convert the number part to a float
    let unit = match[3].toLowerCase(); // 'm' for millions, 'b' for billions

    // Convert billions to millions if necessary
    if (unit === 'b') {
      size = size * 1000;
    }

    return Math.round(size);
  }

  return null;
}

// Grab the metrics from the database and send them to the client
function createEndpoint(app, path, model) {
  app.get(path, async (req, res) => {
    try {
      const metrics = await model.find({});
      if (!metrics || metrics.length === 0) {
        logger.warn("No metrics found in the database");
        return res.status(404).json({ message: "No metrics found" });
      }

      const metricsWithModelSizes = metrics.map(metric => ({
        ...metric.toObject(),
        model_size: extractModelSize(metric.model_name),
      }));

      for (let i = metricsWithModelSizes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [metricsWithModelSizes[i], metricsWithModelSizes[j]] = [metricsWithModelSizes[j], metricsWithModelSizes[i]];
      }

      logger.info(`Fetched ${metricsWithModelSizes.length} metrics with model sizes`);
      res.json(metricsWithModelSizes);
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
createEndpoint(app, "/api/localBenchmarks", LocalMetrics);
createEndpoint(app, "/api/cloudBenchmarks", CloudMetrics);

initialize();
