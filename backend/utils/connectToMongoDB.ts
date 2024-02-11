import mongoose from "mongoose";
import logger from "./logger";

interface Env {
  MONGODB_URI: string;
}

// Ensure that necessary environment variables are present
const env: Env = process.env as any;

async function connectToMongoDB(): Promise<void> {
  if (mongoose.connection.readyState === 1) {
    logger.info("MongoDB connection is already established.");
    return;
  }

  // Enable Mongoose debug mode to log all operations to the console
  mongoose.set("debug", false);

  try {
    logger.info(`Verifying MONGODB_URI: ${env.MONGODB_URI}`);
    // Add more detailed logging before attempting to connect
    logger.debug("Attempting to connect to MongoDB...");

    await mongoose.connect(env.MONGODB_URI);
    logger.info(`MongoDB connected to ${env.MONGODB_URI}`);
    logger.debug(`MongoDB connection state: ${mongoose.connection.readyState}`);

  } catch (err) {
    logger.error(`MongoDB connection error: ${JSON.stringify(err)}`);
    // Log additional information about the connection attempt
    logger.debug(`Failed connection parameters: MONGODB_URI=${env.MONGODB_URI}`);
    throw err;
  }
};

export default connectToMongoDB;