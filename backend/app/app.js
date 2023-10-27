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
  defaultMeta: { service: 'your-service-name' },
  transports: [
    new winston.transports.Console() // Log to console
  ],
});

const app = express();

const BenchmarkMetrics = require("./models/BenchmarkMetrics");

app.use(cors());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    logger.info("MongoDB connected");
  })
  .catch((err) => {
    logger.error(`MongoDB connection error: ${err}`);
  });

// Route to fetch data
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
    logger.error(`Error while fetching metrics: ${err}`);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Start server
const PORT = process.env.PORT;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
