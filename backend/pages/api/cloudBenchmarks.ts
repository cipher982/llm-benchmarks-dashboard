import { NextApiRequest, NextApiResponse } from 'next';
import createEndpoint from '../../utils/createEndpoint';
import { CloudMetrics } from '../../models/BenchmarkMetrics';

// Adjusting to follow the style from localBenchmarks.ts
const cloudMetricsEndpoint = (req: NextApiRequest, res: NextApiResponse) => createEndpoint(req, res, CloudMetrics, false);

// This handler ensures type safety with NextApiRequest and NextApiResponse
export default (req: NextApiRequest, res: NextApiResponse) => {
    // Optionally, handle different methods explicitly
    if (req.method === "GET") {
      return cloudMetricsEndpoint(req, res);
    } else {
      // Handle unsupported methods, for example
      res.setHeader("Allow", ["GET"]);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};