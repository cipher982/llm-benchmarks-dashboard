import { NextApiRequest, NextApiResponse } from 'next';
import { LocalMetrics } from '../../models/BenchmarkMetrics';
import { cleanTransformLocal } from '../../utils/processLocal';
import { corsMiddleware, fetchAndProcessMetrics } from '../../utils/apiMiddleware';

export const daysAgo = 1000;

export default async function localHandler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight
  const corsHandled = await corsMiddleware(req, res);
  if (corsHandled) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // This endpoint serves local benchmarks data
    const processedData = await fetchAndProcessMetrics(
      LocalMetrics,
      daysAgo,
      cleanTransformLocal
    );

    // Set cache headers
    res.setHeader('Cache-Control', 'public, s-maxage=300'); // 5 minute cache
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Data-Source', 'MONGODB-LOCAL');
    
    return res.status(200).json(processedData);
  } catch (error) {
    console.error('Error fetching local data:', error);
    return res.status(500).json({ error: 'Failed to fetch local data' });
  }
}