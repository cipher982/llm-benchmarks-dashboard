import mongoose from "mongoose";
import logger from "./logger";

interface Env {
  MONGODB_URI: string;
}

// Ensure that necessary environment variables are present
const env: Env = process.env as any;

async function connectToMongoDB(): Promise<void> {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  try {
    logger.info(`Verifying MONGODB_URI: ${env.MONGODB_URI}`);
    await mongoose.connect(env.MONGODB_URI);
    logger.info(`MongoDB connected to ${env.MONGODB_URI}`);
  } catch (err) {
    logger.error(`MongoDB connection error: ${JSON.stringify(err)}`);
    throw err;
  }
};

export default connectToMongoDB;