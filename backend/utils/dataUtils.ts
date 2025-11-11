// Calculate the mean of an array
const calculateMean = (arr: number[]): number => {
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

// Utility function for shuffling array elements
function shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Round a number to specified significant digits
function roundToSignificantDigits(num: number, digits: number = 3): number {
    if (num === 0) return 0;
    if (!isFinite(num)) return num;
    
    // Convert to exponential notation with desired precision
    const rounded = Number(num.toPrecision(digits));
    
    // Remove any floating point artifacts by converting through string
    // This handles cases like 42.800000000000004
    return Number(rounded.toFixed(10));
}

// Recursively round all numbers in a data structure
function roundNumbers(data: any, significantDigits: number = 3): any {
    if (typeof data === 'number') {
        if (Number.isInteger(data)) {
            return data;
        }
        return roundToSignificantDigits(data, significantDigits);
    }
    if (Array.isArray(data)) {
        return data.map(item => roundNumbers(item, significantDigits));
    }
    if (data && typeof data === 'object') {
        const rounded: any = {};
        for (const key in data) {
            rounded[key] = roundNumbers(data[key], significantDigits);
        }
        return rounded;
    }
    return data;
}

// Consolidated export statement
export { 
    calculateMean, 
    bytesToGB, 
    calculateStats, 
    calculateMin, 
    calculateMax, 
    calculateQuartiles,
    calculateMB,
    shuffleArray,
    roundNumbers
};
