import { NextApiRequest, NextApiResponse } from 'next';
import { CloudMetrics } from '../../models/BenchmarkMetrics';
import { cleanTransformCloud } from '../../utils/processCloud';
import { setupApiEndpoint } from '../../utils/apiMiddleware';

export default async (req: NextApiRequest, res: NextApiResponse) => {
  await setupApiEndpoint(req, res, CloudMetrics, cleanTransformCloud, `cloudMetrics:365days`);
};