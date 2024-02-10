import createApiEndpoint from '../../utils/createEndpoint';
import { LocalMetrics } from '../../models/BenchmarkMetrics';

export default createApiEndpoint(LocalMetrics, true);
