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
        // Fail fast instead of the driver's 30s default: a down Mongo should
        // surface as a quick 5xx and an empty state, not a 30s spinner hang.
        await mongoose.connect(getMongoDBUri(), { serverSelectionTimeoutMS: 5000 });
        logger.info('MongoDB connected successfully');
    } catch (error) {
        logger.error('Error connecting to MongoDB:', error);
        throw error;
    }
}

export default connectToMongoDB;
