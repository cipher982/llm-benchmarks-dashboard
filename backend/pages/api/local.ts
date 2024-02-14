import { NextApiRequest, NextApiResponse } from 'next';
import { LocalMetrics } from '../../models/BenchmarkMetrics';
import { RawData, ProcessedData, cleanTransformLocal } from '../../utils/processLocal';
import { handleApiRequest } from '../../utils/apiUtils';

export default async (req: NextApiRequest, res: NextApiResponse) => {
  await handleApiRequest(req, res, LocalMetrics, cleanTransformLocal, `localMetrics:365days`);
};