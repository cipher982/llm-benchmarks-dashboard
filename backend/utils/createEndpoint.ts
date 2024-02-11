import { NextApiRequest, NextApiResponse } from 'next';
import extractModelSize from './extractModelSize';

// Assuming the structure of your metric object, adjust as necessary
interface Metric {
    model_name: string;
    [key: string]: any; // For other properties that might exist
}

interface MetricToSend extends Metric {
    model_size?: string; // Assuming model_size is a string, adjust as necessary
}

// Utility function for shuffling array elements
function shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

async function createEndpoint(req: NextApiRequest, res: NextApiResponse, model: { find: (query?: any) => any }, addModelSize: boolean = false): Promise<void> {
    try {
        const metrics: Metric[] = await model.find({}).select('-times_between_tokens');
        if (!metrics || metrics.length === 0) {
            return res.status(404).json({ message: "No metrics found" });
        }

        let metricsToSend: MetricToSend[] = metrics.map(metric => ({
            ...metric.toObject(),
            ...(addModelSize && { model_size: extractModelSize(metric.model_name) }),
        }));

        metricsToSend = shuffleArray(metricsToSend);

        res.status(200).json(metricsToSend);
    } catch (err) {
        console.error(err); // Log the error for debugging purposes
        res.status(500).json({ message: "Internal server error" });
    }
}

export default createEndpoint;