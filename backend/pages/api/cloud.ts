import { NextApiRequest, NextApiResponse } from 'next';
import { CloudMetrics } from '../../models/BenchmarkMetrics';
import { cleanTransformCloud } from '../../utils/processCloud';
import { handleApiRequest } from '../../utils/apiUtils';

export default async (req: NextApiRequest, res: NextApiResponse) => {
  console.log("CORS Debug: Received request", { method: req.method, origin: req.headers.origin }); // Debug log for all requests

  // Enable CORS only in development
  if (process.env.NODE_ENV !== "production") {
    console.log("CORS Debug: Setting CORS headers for development environment"); // Debug log for setting headers
    res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust accordingly for security
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

    // Handle OPTIONS request without calling the actual API logic
    if (req.method === 'OPTIONS') {
      console.log("CORS Debug: Handling OPTIONS request"); // Debug log for OPTIONS request
      return res.status(200).end();
    }
  }
  await handleApiRequest(req, res, CloudMetrics, cleanTransformCloud, `cloudMetrics:365days`);
};