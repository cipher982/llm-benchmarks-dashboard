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

export default connectToMongoDB;
