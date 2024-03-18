import { NextApiRequest, NextApiResponse } from 'next';
import extractModelSize from './extractModelSize';
import { shuffleArray } from './dataUtils';
import logger from './logger';

interface Metric {
    model_name: string;
    [key: string]: any;
}

interface MetricToSend extends Metric {
    model_size?: string;
}


async function createEndpoint(
    req: NextApiRequest,
    res: NextApiResponse,
    model: { find: (query?: any) => any },
    addModelSize: boolean = false,
    daysAgo: number = 5
): Promise<void> {
    try {
        const dateFilter = new Date();
        dateFilter.setDate(dateFilter.getDate() - daysAgo);

        const metrics: Metric[] = await model.find({
            run_ts: { $gte: dateFilter }
        }).select('-times_between_tokens');

        if (!metrics || metrics.length === 0) {
            return res.status(404).json({ message: "oops no metrics found :(" });
        }

        let metricsToSend: MetricToSend[] = metrics.map(metric => ({
            ...metric.toObject(),
            ...(addModelSize && { model_size: extractModelSize(metric.model_name) }),
        }));

        metricsToSend = shuffleArray(metricsToSend);

        res.status(200).json(metricsToSend);
    } catch (err) {
        logger.error(`Error handling request: ${err}`);
        res.status(500).json({ message: "Internal server error" });
    }
}

export default createEndpoint;