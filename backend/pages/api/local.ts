import { NextApiRequest, NextApiResponse } from 'next';
import logger from '../../utils/logger';
import { LocalMetrics } from '../../models/BenchmarkMetrics';
import connectToMongoDB from '../../utils/connectToMongoDB';
import { cleanTransformLocal } from '../../utils/processLocal';
import { RawData, ProcessedData } from '../../utils/processLocal';


// Function to fetch benchmarks
async function fetchData(model: { find: (query?: any) => any }, daysAgo: number) {
  // Filter by past n days
  const dateFilter = new Date();
  dateFilter.setDate(dateFilter.getDate() - daysAgo);

  // Fetch the needed metrics
  const metrics = await model.find({ run_ts: { $gte: dateFilter } }).select('-times_between_tokens');
  return metrics.map((metric: any): RawData => metric.toObject() as RawData);
}

// Consolidated export statement
export default async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    await connectToMongoDB();
    logger.info(`Received a ${req.method} request on localBenchmarks`);

    if (req.method !== "GET") {
      logger.warn(`Method ${req.method} not allowed`);
      res.setHeader("Allow", ["GET"]);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    logger.debug("Processing GET request");
    let rawMetrics = await fetchData(LocalMetrics, 365);

    if (rawMetrics.length === 0) {
      return res.status(404).json({ message: "No metrics found" });
    }

    const processedMetrics: ProcessedData[] = cleanTransformLocal(rawMetrics);
    res.status(200).json(processedMetrics);
  } catch (error) {
    logger.error(`Error: ${error}`);
    res.status(500).end("Internal Server Error");
  }
};