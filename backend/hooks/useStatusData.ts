/**
 * Custom Hook: useStatusData
 *
 * Fetches and manages status data from the /api/status endpoint.
 * Automatically refreshes data at a configurable interval.
 *
 * @example
 * const { statusData, loading, error, refetch } = useStatusData(30000);
 *
 * if (loading) return <LoadingState />;
 * if (error) return <ErrorState error={error} />;
 * return <StatusDisplay data={statusData} />;
 */

import { useState, useEffect, useCallback } from 'react';
import { ModelData } from '../utils/status/statusHelpers';

/**
 * Status data structure matching the API response
 */
export interface StatusData {
    active: ModelData[];
    deprecated: ModelData[];
    disabled: ModelData[];
    summary: {
        active_count: number;
        deprecated_count: number;
        disabled_count: number;
        total_issues: number;
    };
}

/**
 * Return type for the useStatusData hook
 */
export interface UseStatusDataReturn {
    statusData: StatusData | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch and manage status data with automatic refresh
 *
 * @param refreshInterval - How often to refresh data in milliseconds (default: 30000ms = 30s)
 * @returns Object containing statusData, loading, error states, and refetch function
 */
export function useStatusData(refreshInterval: number = 30000): UseStatusDataReturn {
    const [statusData, setStatusData] = useState<StatusData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    /**
     * Fetch status data from the API
     * Wrapped in useCallback to prevent unnecessary re-renders
     */
    const fetchStatusData = useCallback(async () => {
        try {
            const response = await fetch('/api/status');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data: StatusData = await response.json();
            console.log('Status API returned:', data);

            setStatusData(data);
            setError(null);  // Clear any previous errors
            setLoading(false);
        } catch (err: any) {
            console.error('Error fetching status data:', err);
            setError(err.message);
            setLoading(false);
        }
    }, []);

    /**
     * Set up automatic refresh interval on mount
     * Clean up interval on unmount
     */
    useEffect(() => {
        fetchStatusData();
        const interval = setInterval(fetchStatusData, refreshInterval);
        return () => clearInterval(interval);
    }, [fetchStatusData, refreshInterval]);

    return {
        statusData,
        loading,
        error,
        refetch: fetchStatusData,
    };
}
