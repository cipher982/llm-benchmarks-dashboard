import { CloudBenchmark } from "../types/CloudData";
import { mapModelNames } from "../utils/modelMapping";

declare const self: Worker;

self.onmessage = (event: MessageEvent<CloudBenchmark[]>) => {
    const data = event.data;
    const processedData = mapModelNames(data);
    self.postMessage(processedData);
};
