import mongoose from "mongoose";
import logger from "./logger";

function getMongoDBUri(): string {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error('Please define the MONGODB_URI environment variable inside .env');
    }
    return uri;
}

async function connectToMongoDB() {
    try {
        if (mongoose.connection.readyState === 1) {
            logger.debug('Using existing MongoDB connection');
            return;
        }

        logger.info('Creating new MongoDB connection');
        await mongoose.connect(getMongoDBUri());
        logger.info('MongoDB connected successfully');
    } catch (error) {
        logger.error('Error connecting to MongoDB:', error);
        throw error;
    }
}

export default connectToMongoDB;
