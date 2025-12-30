interface CacheEntry<T> {
    data: T;
    expires: number;
}

const cache = new Map<string, CacheEntry<any>>();
const inFlightPromises = new Map<string, Promise<any>>();

/**
 * Simple in-memory TTL cache helper with stampede protection
 * @param key Unique key for the cache
 * @param ttlMs Time to live in milliseconds
 * @param fetchFn Function to fetch the data if cache is missing or expired
 */
export async function cached<T>(key: string, ttlMs: number, fetchFn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const entry = cache.get(key);

    if (entry && entry.expires > now) {
        return entry.data;
    }

    // Stampede protection: if a fetch is already in flight for this key, return it
    if (inFlightPromises.has(key)) {
        return inFlightPromises.get(key);
    }

    const fetchPromise = fetchFn().then(data => {
        cache.set(key, {
            data,
            expires: Date.now() + ttlMs
        });
        inFlightPromises.delete(key);
        return data;
    }).catch(error => {
        inFlightPromises.delete(key);
        throw error;
    });

    inFlightPromises.set(key, fetchPromise);
    return fetchPromise;
}

/**
 * Clear a specific cache key or all keys
 */
export function clearCache(key?: string) {
    if (key) {
        cache.delete(key);
        inFlightPromises.delete(key);
    } else {
        cache.clear();
        inFlightPromises.clear();
    }
}
