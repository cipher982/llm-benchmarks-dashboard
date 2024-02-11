import { NextApiRequest, NextApiResponse } from 'next';
import createEndpoint from '../../utils/createEndpoint';
import { LocalMetrics } from '../../models/BenchmarkMetrics';

// Assuming createApiEndpoint is a higher-order function that returns a Next.js API handler
// Adjust the type of createApiEndpoint's return value if necessary
const localMetricsEndpoint = (req: NextApiRequest, res: NextApiResponse) => createEndpoint(req, res, LocalMetrics, true);

// This handler ensures type safety with NextApiRequest and NextApiResponse
export default (req: NextApiRequest, res: NextApiResponse) => {
    // Optionally, handle different methods explicitly
    if (req.method === "GET") {
      return localMetricsEndpoint(req, res);
    } else {
      // Handle unsupported methods, for example
      res.setHeader("Allow", ["GET"]);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  };