import { NextApiRequest, NextApiResponse } from 'next';
import extractModelSize from '../../utils/extractModelSize';


async function createEndpoint(req: NextApiRequest, res: NextApiResponse, model, addModelSize = false) {
    try {
        const metrics = await model.find({}).select('-times_between_tokens');
        if (!metrics || metrics.length === 0) {
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

        res.status(200).json(metricsToSend);
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    }
}

export default createEndpoint;