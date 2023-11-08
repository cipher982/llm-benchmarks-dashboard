

// Function to calculate the mean of an array
const calculateMean = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const sum = arr.reduce((a, b) => a + b, 0);
    return sum / arr.length;
};

// Function to convert bytes to GB
const bytesToGB = (bytes) => {
    return bytes / (1024 * 1024 * 1024);
};

export { calculateMean, bytesToGB };