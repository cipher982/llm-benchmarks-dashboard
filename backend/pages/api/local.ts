import { NextApiRequest, NextApiResponse } from 'next';
import { LocalMetrics } from '../../models/BenchmarkMetrics';
import { cleanTransformLocal } from '../../utils/processLocal';
import { setupApiEndpoint } from '../../utils/apiMiddleware';

export default async (req: NextApiRequest, res: NextApiResponse) => {
  await setupApiEndpoint(req, res, LocalMetrics, cleanTransformLocal, `localMetrics:365days`);
};