// utils.js

// Calculate the mean of an array
const calculateMean = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const sum = arr.reduce((a, b) => a + b, 0);
    return sum / arr.length;
};

// Convert bytes to GB
const bytesToGB = (bytes) => {
    return bytes / (1024 * 1024 * 1024);
};

// Calculate statistics
const calculateStats = (values) => {
    values.sort((a, b) => a - b);
    const trimmedValues = values.length > 5 ? values.slice(1, -1) : values;
    return {
        mean: parseFloat(calculateMean(trimmedValues).toFixed(2)),
        min: parseFloat(calculateMin(trimmedValues).toFixed(2)),
        max: parseFloat(calculateMax(trimmedValues).toFixed(2)),
        quartiles: calculateQuartiles(trimmedValues).map(val => parseFloat(val.toFixed(2)))
    };
};

// Function to get array statistics
export const calculateMin = (arr) => Math.min(...arr);
export const calculateMax = (arr) => Math.max(...arr);
export const calculateQuartiles = (arr) => {
    const sorted = arr.sort((a, b) => a - b);
    const q1 = sorted[Math.floor((sorted.length / 4))];
    const q2 = sorted[Math.floor((sorted.length / 2))];
    const q3 = sorted[Math.floor((3 * sorted.length) / 4)];
    return [q1, q2, q3];
};

export { calculateMean, bytesToGB, calculateStats };


