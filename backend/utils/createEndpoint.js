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

export default createEndpoint;