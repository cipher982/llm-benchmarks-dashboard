import { NextApiRequest, NextApiResponse } from 'next';
import logger from '../../utils/logger';
import { CloudMetrics } from '../../models/BenchmarkMetrics';
import connectToMongoDB from '../../utils/connectToMongoDB';
import { cleanTransformCloud } from '../../utils/processCloud'; // Assuming this function exists
import { RawData, ProcessedData } from '../../utils/processCloud'; // Assuming these types exist

async function fetchCloudData(model: { find: (query?: any) => any }, daysAgo: number) {
  const dateFilter = new Date();
  dateFilter.setDate(dateFilter.getDate() - daysAgo);
  const metrics = await model.find({ run_ts: { $gte: dateFilter } }).select('-someField'); // Adjust field selection as needed
  return metrics.map((metric: any): RawData => metric.toObject() as RawData);
}

export default async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    await connectToMongoDB();
    logger.info(`Received a ${req.method} request on cloudBenchmarks`);

    if (req.method !== "GET") {
      logger.warn(`Method ${req.method} not allowed`);
      res.setHeader("Allow", ["GET"]);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    logger.debug("Processing GET request");
    let rawMetrics = await fetchCloudData(CloudMetrics, 7); // Assuming 7 days as in the original

    if (rawMetrics.length === 0) {
      return res.status(404).json({ message: "No metrics found" });
    }

    const processedMetrics: ProcessedData[] = cleanTransformCloud(rawMetrics); // Assuming this function exists
    res.status(200).json(processedMetrics);
  } catch (error) {
    logger.error(`Error: ${error}`);
    res.status(500).end("Internal Server Error");
  }
};