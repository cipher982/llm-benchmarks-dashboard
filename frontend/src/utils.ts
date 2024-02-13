// Calculate the mean of an array
const calculateMean = (arr: number[]): number | null => {
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const sum = arr.reduce((a, b) => a + b, 0);
    return sum / arr.length;
};

// Convert bytes to GB
const bytesToGB = (bytes: number): number => {
    return bytes / (1024 * 1024 * 1024);
};

// Calculate statistics
const calculateStats = (values: number[]) => {
    values.sort((a, b) => a - b);
    const trimmedValues = values.length > 5 ? values.slice(1, -1) : values;
    return {
        mean: parseFloat(calculateMean(trimmedValues)?.toFixed(2) ?? "0"),
        min: parseFloat(calculateMin(trimmedValues).toFixed(2)),
        max: parseFloat(calculateMax(trimmedValues).toFixed(2)),
        quartiles: calculateQuartiles(trimmedValues).map(val => parseFloat(val.toFixed(2)))
    };
};

// Function to get array statistics
const calculateMin = (arr: number[]): number => Math.min(...arr);
const calculateMax = (arr: number[]): number => Math.max(...arr);
const calculateQuartiles = (arr: number[]): number[] => {
    const sorted = [...arr].sort((a, b) => a - b); // Clone array to avoid mutating the original
    const q1 = sorted[Math.floor((sorted.length / 4))];
    const q2 = sorted[Math.floor((sorted.length / 2))];
    const q3 = sorted[Math.floor((3 * sorted.length) / 4)];
    return [q1, q2, q3];
};

function calculateMB(data: any): string {
    return (JSON.stringify(data).length / 1048576).toFixed(2);
}

// Consolidated export statement
export { 
    calculateMean, 
    bytesToGB, 
    calculateStats, 
    calculateMin, 
    calculateMax, 
    calculateQuartiles,
    calculateMB 
};