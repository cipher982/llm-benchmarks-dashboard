import createApiEndpoint from '../../utils/createApiEndpoint';
import { LocalMetrics } from '../../models/BenchmarkMetrics';

export default createApiEndpoint(LocalMetrics, true);
