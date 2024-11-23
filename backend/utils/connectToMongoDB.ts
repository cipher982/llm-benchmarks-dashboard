import mongoose from "mongoose";
import logger from "./logger";

if (!process.env.MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env');
}

const MONGODB_URI = process.env.MONGODB_URI;

async function connectToMongoDB() {
    try {
        if (mongoose.connection.readyState === 1) {
            logger.debug('Using existing MongoDB connection');
            return;
        }

        logger.info('Creating new MongoDB connection');
        await mongoose.connect(MONGODB_URI);
        logger.info('MongoDB connected successfully');
    } catch (error) {
        logger.error('Error connecting to MongoDB:', error);
        throw error;
    }
}

export default connectToMongoDB;