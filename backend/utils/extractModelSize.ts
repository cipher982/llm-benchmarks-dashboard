// Extract size (params) in millions from name string
function extractModelSize(modelName: string): number {
    // Special case for 'mixtral' models
    if (modelName.toLowerCase().includes("mixtral")) {
        // If it's a 'mixtral' model, set the numerical part to 56 billion
        return 56000; // Convert to millions
    }

    // Use regex to extract the parameter size with a specific pattern
    let match = modelName.match(/(\d+)x(\d+(\.\d+)?)([MmBb])/);
    if (!match) {
        // If no multiplier pattern is found, try matching without multiplier
        match = modelName.match(/(\d+(\.\d+)?)([MmBb])/);
        if (!match) {
            return 0;
        }
        let size = parseFloat(match[1]);
        let unit: string | null = match[3] ? match[3].toLowerCase() : null;
        // Convert billions to millions if necessary
        if (unit === 'b') {
            size *= 1000;
        }
        return Math.round(size);
    } else {
        // If multiplier pattern is found, calculate the total size
        let multiplier = parseInt(match[1], 10);
        let size = parseFloat(match[2]);
        let unit: string | null = match[4] ? match[4].toLowerCase() : null;
        let totalSize = size * multiplier;
        // Convert billions to millions if necessary
        if (unit === 'b') {
            totalSize *= 1000;
        }
        return Math.round(totalSize);
    }
}

export default extractModelSize;