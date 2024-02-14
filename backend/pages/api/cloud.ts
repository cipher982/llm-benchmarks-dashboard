import { NextApiRequest, NextApiResponse } from 'next';
import { CloudMetrics } from '../../models/BenchmarkMetrics';
import { cleanTransformCloud } from '../../utils/processCloud';
import { handleApiRequest } from '../../utils/apiUtils';

export default async (req: NextApiRequest, res: NextApiResponse) => {
  console.log("CORS Debug: Setting CORS headers");
  res.setHeader('Access-Control-Allow-Origin', 'https://www.llm-benchmarks.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    console.log("CORS Debug: Handling OPTIONS request");
    return res.status(200).end();
  }

  if (req.method !== 'OPTIONS') {
    await handleApiRequest(req, res, CloudMetrics, cleanTransformCloud, `cloudMetrics:365days`);
  }