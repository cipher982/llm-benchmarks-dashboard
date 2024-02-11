import { NextApiRequest, NextApiResponse } from 'next';
import createEndpoint from '../../utils/createEndpoint';
import logger from '../../utils/logger';
import { CloudMetrics } from '../../models/BenchmarkMetrics';

const cloudMetricsEndpoint = (req: NextApiRequest, res: NextApiResponse) => {
  logger.info("Entering cloudMetricsEndpoint");
  return createEndpoint(req, res, CloudMetrics, false);
};

export default (req: NextApiRequest, res: NextApiResponse) => {
    logger.info(`Received a ${req.method} request on cloudBenchmarks`);
    if (req.method === "GET") {
      logger.debug("Processing GET request");
      return cloudMetricsEndpoint(req, res);
    } else {
      logger.warn(`Method ${req.method} not allowed`);
      res.setHeader("Allow", ["GET"]);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};