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
const BenchmarkMetrics = require("./models/BenchmarkMetrics");

mongoose.set('debug', true);

app.use(cors());

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

app.get("/api/benchmarks", async (req, res) => {
  try {
    const metrics = await BenchmarkMetrics.find({});
    if (!metrics || metrics.length === 0) {
      logger.warn("No metrics found in the database");
      return res.status(404).json({ message: "No metrics found" });
    }
    logger.info(`Fetched ${metrics.length} metrics`);
    res.json(metrics);
  } catch (err) {
    logger.error(`Error while fetching metrics: ${JSON.stringify(err)}`);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Async function to start everything
async function initialize() {
  await connectToMongoDB();
  const PORT = process.env.PORT;
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
}

initialize();
