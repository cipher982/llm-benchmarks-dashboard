import { NextApiRequest, NextApiResponse } from 'next';
import createEndpoint from '../../utils/createEndpoint';
import logger from '../../utils/logger';
import { LocalMetrics } from '../../models/BenchmarkMetrics';

const localMetricsEndpoint = (req: NextApiRequest, res: NextApiResponse) => {
  logger.info("Entering localMetricsEndpoint");
  return createEndpoint(req, res, LocalMetrics, true);
};

export default (req: NextApiRequest, res: NextApiResponse) => {
    logger.info(`Received a ${req.method} request on localBenchmarks`);
    if (req.method === "GET") {
      logger.debug("Processing GET request");
    } else {
      logger.warn(`Method ${req.method} not allowed`);
      res.setHeader("Allow", ["GET"]);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};