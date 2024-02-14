import { NextApiRequest, NextApiResponse } from 'next';
import { CloudMetrics } from '../../models/BenchmarkMetrics';
import { RawData, ProcessedData, cleanTransformCloud } from '../../utils/processCloud';
import { handleApiRequest } from '../../utils/apiUtils';

export default async (req: NextApiRequest, res: NextApiResponse) => {
  await handleApiRequest(req, res, CloudMetrics, cleanTransformCloud, `cloudMetrics:365days`);
};