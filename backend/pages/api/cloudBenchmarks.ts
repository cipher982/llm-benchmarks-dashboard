import { NextApiRequest, NextApiResponse } from 'next';
import createEndpoint from '../../utils/createEndpoint';
import logger from '../../utils/logger';
import { CloudMetrics } from '../../models/BenchmarkMetrics';
import connectToMongoDB from '../../utils/connectToMongoDB';

export default async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    await connectToMongoDB(); // Ensure MongoDB connection
    logger.info(`Received a ${req.method} request on cloudBenchmarks`);

    if (req.method === "GET") {
      logger.debug("Processing GET request");
      const cloudMetricsEndpoint = async (req: NextApiRequest, res: NextApiResponse) => {
        logger.info("Entering cloudMetricsEndpoint");
        return createEndpoint(req, res, CloudMetrics, false, 7);
      };
      return cloudMetricsEndpoint(req, res);
    } else {
      logger.warn(`Method ${req.method} not allowed`);
      res.setHeader("Allow", ["GET"]);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error}`);
    return res.status(500).end("Internal Server Error");
  }
};