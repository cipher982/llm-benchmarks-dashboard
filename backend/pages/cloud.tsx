import React, { useState, useEffect, useCallback, useMemo } from "react";
import { lazy, Suspense } from "react";
import Head from "next/head";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { Box } from "@mui/material";
import { MainContainer } from "../components/design-system/components";
import { SpeedDistributionPoint, TimeSeriesData, TableRow } from "../types/ProcessedData";
import {
    LoadingContainer,
    ChartLoadingContainer,
    StyledCircularProgress,
    CenteredContentContainer,
    ChartContentContainer,
    TableContentContainer,
    SectionHeader,
    SectionHeaderWithControl,
    PageTitle,
    StyledDescriptionSection,
    StyledChartContainer,
    StyledTableContainer,
} from "../components/StyledComponents";
import { TimeRangeSelector } from "../components/TimeRangeSelector";
import { LifecycleSelector } from "../components/LifecycleSelector";

const TimeSeriesChart = lazy(() => import("../components/charts/cloud/TimeSeries"));
const RawCloudTable = lazy(() => import("../components/tables/cloud/RawCloudTable"));
const SpeedDistChart = lazy(() => import("../components/charts/cloud/SpeedDistChart"));

type TableStatusFilter = 'all' | 'hideFlagged' | 'flaggedOnly';

const FLAGGED_STATUSES = [
    'likely_deprecated',
    'deprecated',
    'failing',
    'stale',
    'never_succeeded',
    'disabled'
];


const FLAGGED_STATUS_SET = new Set(FLAGGED_STATUSES);

interface TableMetaSummary {
    totalRows: number;
    filteredRows: number;
    flaggedStatuses: string[];
    appliedFilters?: {
        allowedStatuses?: string[];
        hideFlagged?: boolean;
    };
}

interface LifecycleSummaryRow {
    provider: string;
    total: number;
    flaggedTotal: number;
    counts: Record<string, number>;
    sampleReasons: Record<string, string>;
    lastComputedAt?: string;
}

interface LifecycleSummaryResponse {
    generatedAt: string;
    flaggedStatuses: string[];
    includeActive: boolean;
    rows: LifecycleSummaryRow[];
}

const CloudBenchmarks: React.FC = () => {
    console.log('CloudBenchmarks component mounted');
    const theme = useTheme();

    // Separate state for each section
    const [speedDistData, setSpeedDistData] = useState<SpeedDistributionPoint[]>([]);
    const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData>({
        timestamps: [],
        models: []
    });
    const [tableData, setTableData] = useState<TableRow[]>([]);
    const [tableMeta, setTableMeta] = useState<TableMetaSummary | null>(null);
    const [lifecycleSummary, setLifecycleSummary] = useState<LifecycleSummaryResponse | null>(null);

    // Separate time ranges for each section
    const [distDays, setDistDays] = useState<number>(30);
    const [tableDays, setTableDays] = useState<number>(30);
    const [timeSeriesDays, setTimeSeriesDays] = useState<number>(14);

    const [tableStatusFilter, setTableStatusFilter] = useState<TableStatusFilter>('all');

    // Separate loading states for each section
    const [distLoading, setDistLoading] = useState<boolean>(false);
    const [tableLoading, setTableLoading] = useState<boolean>(false);
    const [timeSeriesLoading, setTimeSeriesLoading] = useState<boolean>(false);
    const [summaryLoading, setSummaryLoading] = useState<boolean>(false);

    const [error, setError] = useState<string | null>(null);
    const [summaryError, setSummaryError] = useState<string | null>(null);
    const [initialLoading, setInitialLoading] = useState<boolean>(true);
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // Fetch function for Speed Distribution section
    const fetchSpeedDistribution = useCallback(async (days: number) => {
        try {
            setDistLoading(true);
            const res = await fetch(`/api/processed?days=${days}`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            const data = await res.json();
            if (!data || !data.speedDistribution) {
                throw new Error('Invalid speed distribution data received');
            }

            setSpeedDistData(data.speedDistribution);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching speed distribution:', err);
            setError(err.message);
        } finally {
            setDistLoading(false);
        }
    }, []);

    // Fetch function for Table section
    const fetchTableData = useCallback(async (days: number, overrideFilter?: TableStatusFilter) => {
        try {
            setTableLoading(true);
            const filterToUse = overrideFilter ?? tableStatusFilter;
            const params = new URLSearchParams({ days: String(days) });

            if (filterToUse === 'hideFlagged') {
                params.set('hideFlagged', 'true');
            } else if (filterToUse === 'flaggedOnly') {
                params.set('status', FLAGGED_STATUSES.join(','));
            }

            const res = await fetch(`/api/processed?${params.toString()}`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            const data = await res.json();
            if (!data || !data.table) {
                throw new Error('Invalid table data received');
            }

            setTableData(data.table);
            setTableMeta(data.meta?.table ?? null);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching table data:', err);
            setError(err.message);
            setTableMeta(null);
        } finally {
            setTableLoading(false);
        }
    }, [tableStatusFilter]);

    const fetchLifecycleSummaryData = useCallback(async () => {
        try {
            setSummaryLoading(true);
            const res = await fetch('/api/lifecycle-summary');
            if (!res.ok) {
                throw new Error(`Lifecycle summary HTTP ${res.status}`);
            }
            const data: LifecycleSummaryResponse = await res.json();
            setLifecycleSummary(data);
            setSummaryError(null);
        } catch (err: any) {
            console.error('Error fetching lifecycle summary:', err);
            setSummaryError(err.message);
            setLifecycleSummary(null);
        } finally {
            setSummaryLoading(false);
        }
    }, []);

    // Fetch function for Time Series section
    const fetchTimeSeries = useCallback(async (days: number) => {
        try {
            setTimeSeriesLoading(true);
            const res = await fetch(`/api/processed?days=${days}`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            const data = await res.json();
            if (!data || !data.timeSeries) {
                throw new Error('Invalid time series data received');
            }

            setTimeSeriesData(data.timeSeries);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching time series:', err);
            setError(err.message);
        } finally {
            setTimeSeriesLoading(false);
        }
    }, []);

    // Shared fetch for sections using the same days value (optimization)
    const fetchSharedData = useCallback(async (days: number) => {
        const res = await fetch(`/api/processed?days=${days}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }

        return res.json();
    }, []);

    // Initial data fetch for all sections (only on mount)
    useEffect(() => {
        const initializeData = async () => {
            try {
                // Optimization: if dist and table use the same days, fetch once
                if (distDays === tableDays) {
                    // Fetch shared data (30 days) once for both dist and table
                    const [sharedData, timeSeriesRes] = await Promise.all([
                        (async () => {
                            setDistLoading(true);
                            setTableLoading(true);
                            const data = await fetchSharedData(distDays);
                            if (data?.speedDistribution) {
                                setSpeedDistData(data.speedDistribution);
                            }
                            if (data?.table) {
                                setTableData(data.table);
                                setTableMeta(data.meta?.table ?? null);
                            }
                            setDistLoading(false);
                            setTableLoading(false);
                            return data;
                        })(),
                        fetchTimeSeries(timeSeriesDays),
                        fetchLifecycleSummaryData()
                    ]);
                } else {
                    // Different days - fetch separately (fallback)
                    await Promise.all([
                        fetchSpeedDistribution(distDays),
                        fetchTableData(tableDays),
                        fetchTimeSeries(timeSeriesDays),
                        fetchLifecycleSummaryData()
                    ]);
                }
            } catch (err: any) {
                console.error('Error initializing data:', err);
                setError(err.message);
            } finally {
                setInitialLoading(false);
            }
        };
        initializeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty array - only run on mount

    // Time range change handlers for each section
    const handleDistTimeRangeChange = useCallback(async (days: number) => {
        setDistDays(days);
        await fetchSpeedDistribution(days);
    }, [fetchSpeedDistribution]);

    const handleTableTimeRangeChange = useCallback(async (days: number) => {
        setTableDays(days);
        await fetchTableData(days, tableStatusFilter);
    }, [fetchTableData, tableStatusFilter]);

    const handleTableStatusFilterChange = useCallback(async (event: React.ChangeEvent<HTMLSelectElement>) => {
        const nextFilter = event.target.value as TableStatusFilter;
        setTableStatusFilter(nextFilter);
        await fetchTableData(tableDays, nextFilter);
    }, [fetchTableData, tableDays]);

    const visibleFlaggedCount = useMemo(() => {
        return tableData.reduce((count, row) => {
            const effectiveStatus = row.lifecycle_status || (row.deprecated ? 'deprecated' : 'active');
            if (FLAGGED_STATUS_SET.has(effectiveStatus)) {
                return count + 1;
            }
            return count;
        }, 0);
    }, [tableData]);

    const handleTimeSeriesTimeRangeChange = useCallback(async (days: number) => {
        setTimeSeriesDays(days);
        await fetchTimeSeries(days);
    }, [fetchTimeSeries]);

    if (initialLoading) {
        return (
            <>
                <Head>
                    <title>Cloud LLM Benchmarks - Speed & Performance Testing</title>
                    <meta name="description" content="Real-time benchmarking of cloud LLM providers including OpenAI, Anthropic, Google, and more. Compare speed, reliability, and performance." />
                </Head>
                <LoadingContainer>
                    <StyledCircularProgress size={80} aria-label="Loading benchmarks data" />
                </LoadingContainer>
            </>
        );
    }

    if (error) {
        return (
            <>
                <Head>
                    <title>Cloud LLM Benchmarks - Speed & Performance Testing</title>
                    <meta name="description" content="Real-time benchmarking of cloud LLM providers including OpenAI, Anthropic, Google, and more. Compare speed, reliability, and performance." />
                </Head>
                <div>Error: {error}</div>
            </>
        );
    }

    return (
        <>
            <Head>
                <title>Cloud LLM Benchmarks - Speed & Performance Testing</title>
                <meta name="description" content="Real-time benchmarking of cloud LLM providers including OpenAI, Anthropic, Google, and more. Compare speed, reliability, and performance." />
            </Head>
            <MainContainer isMobile={isMobile}>
                <StyledDescriptionSection isMobile={isMobile}>
                    <CenteredContentContainer>
                        <PageTitle>☁️ Cloud Benchmarks ☁️</PageTitle>
                    <p>
                        I run cron jobs to periodically test the token generation speed of different cloud LLM providers.
                        The chart helps visualize the distributions of different speeds, as they can vary somewhat depending on the loads.
                        For readability not all models are shown, but you can see the full results in the table below.
                    </p>
                    <p>
                        Every provider and model now has a dedicated landing page with narrative insights, SEO-friendly metadata,
                        and structured data for search engines. Click any provider or model in the table to explore performance in depth.
                    </p>
                    <p>
                        I am working daily to add more providers and models, looking anywhere that
                        does not require purchasing dedicated endpoints for hosting (why some models may appear
                        to be missing). If you have any more suggestions let me know on GitHub!! 😊
                    </p>
                    <Box
                        sx={{
                            mt: 2,
                            p: 2,
                            border: '1px solid #d0d0d0',
                            borderRadius: 1,
                            backgroundColor: '#fafafa'
                        }}
                    >
                        <strong>
                            Lifecycle snapshot{lifecycleSummary?.generatedAt ? ` (${new Date(lifecycleSummary.generatedAt).toLocaleString()})` : ''}
                        </strong>
                        {summaryLoading ? (
                            <div style={{ fontSize: '0.85rem', marginTop: '0.4rem' }}>Loading status summary…</div>
                        ) : summaryError ? (
                            <div style={{ fontSize: '0.85rem', marginTop: '0.4rem', color: '#d32f2f' }}>
                                Failed to load lifecycle summary. ({summaryError})
                            </div>
                        ) : lifecycleSummary && lifecycleSummary.rows.length ? (
                            <ul style={{ marginTop: '0.4rem', paddingLeft: '1.2rem', fontSize: '0.85rem' }}>
                                {lifecycleSummary.rows.map((row) => (
                                    <li key={row.provider}>
                                        <strong>{row.provider}</strong>: {row.flaggedTotal} flagged / {row.total} total
                                        {row.sampleReasons && Object.keys(row.sampleReasons).length > 0 && (
                                            <span style={{ marginLeft: '0.4rem', color: '#555' }}>
                                                – {Object.entries(row.sampleReasons)
                                                    .map(([status, reason]) => `${status}: ${reason}`)
                                                    .slice(0, 2)
                                                    .join(' | ')}
                                            </span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div style={{ fontSize: '0.85rem', marginTop: '0.4rem' }}>No lifecycle summary available.</div>
                        )}
                    </Box>
                </CenteredContentContainer>
            </StyledDescriptionSection>

            <StyledChartContainer isMobile={isMobile}>
                <SectionHeaderWithControl>
                    <SectionHeader>📊 Speed Distribution 📊</SectionHeader>
                    <TimeRangeSelector
                        selectedDays={distDays}
                        onChange={handleDistTimeRangeChange}
                    />
                </SectionHeaderWithControl>
                <ChartContentContainer>
                    {distLoading ? (
                        <ChartLoadingContainer>
                            <StyledCircularProgress size={60} aria-label="Loading speed distribution chart" />
                        </ChartLoadingContainer>
                    ) : speedDistData.length > 0 ? (
                        <Suspense fallback={
                            <ChartLoadingContainer>
                                <StyledCircularProgress size={60} aria-label="Loading speed distribution chart" />
                            </ChartLoadingContainer>
                        }>
                            <SpeedDistChart data={speedDistData} />
                        </Suspense>
                    ) : null}
                </ChartContentContainer>
            </StyledChartContainer>

            <StyledTableContainer isMobile={isMobile}>
                <SectionHeaderWithControl>
                    <SectionHeader>📚 Full Results 📚</SectionHeader>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <TimeRangeSelector
                            selectedDays={tableDays}
                            onChange={handleTableTimeRangeChange}
                        />
                        <LifecycleSelector
                            value={tableStatusFilter}
                            onChange={(value) => {
                                setTableStatusFilter(value);
                                fetchTableData(tableDays, value);
                            }}
                        />
                    </div>
                </SectionHeaderWithControl>
                <TableContentContainer isMobile={isMobile}>
                    {(() => {
                        const totalRows = tableMeta?.totalRows ?? tableData.length;
                        const filteredRows = tableMeta?.filteredRows ?? tableData.length;
                        const flaggedHiddenCount = tableMeta?.appliedFilters?.hideFlagged ? Math.max(totalRows - filteredRows, 0) : 0;
                        const flaggedStatuses = tableMeta?.flaggedStatuses ?? FLAGGED_STATUSES;

                        const contextParts: string[] = [];
                        if (flaggedHiddenCount > 0) {
                            contextParts.push(`${flaggedHiddenCount} flagged hidden`);
                        }
                        if (tableStatusFilter === 'flaggedOnly') {
                            contextParts.push(`${visibleFlaggedCount} flagged`);
                        }

                        const contextSuffix = contextParts.length ? ` (${contextParts.join(' · ')})` : '';

                        return (
                            <div
                                style={{
                                    marginBottom: '0.75rem',
                                    fontSize: '0.85rem',
                                    color: '#4a4a4a',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.3rem'
                                }}
                            >
                                <span>
                                    <strong>{`Showing ${filteredRows} of ${totalRows} models`}</strong>
                                    {contextSuffix}
                                </span>
                                <span>
                                    Flagged statuses: {flaggedStatuses.join(', ')}
                                </span>
                            </div>
                        );
                    })()}
                    <Box sx={{ pb: 8 }}>
                        {tableLoading ? (
                            <StyledCircularProgress aria-label="Loading benchmark table" />
                        ) : (
                            <Suspense fallback={<StyledCircularProgress aria-label="Loading benchmark table" />}>
                                {tableData && tableData.length > 0 ? (
                                    <RawCloudTable data={tableData} />
                                ) : (
                                    <div>No table data available</div>
                                )}
                            </Suspense>
                        )}
                    </Box>
                </TableContentContainer>
            </StyledTableContainer>

            {timeSeriesData?.timestamps && timeSeriesData.timestamps.length > 0 && (
                <StyledChartContainer isMobile={isMobile}>
                    <SectionHeader>📈 Time Series 📈</SectionHeader>
                    <ChartContentContainer>
                        {timeSeriesLoading ? (
                            <ChartLoadingContainer>
                                <StyledCircularProgress size={60} aria-label="Loading time series chart" />
                            </ChartLoadingContainer>
                        ) : (
                            <Suspense fallback={<StyledCircularProgress aria-label="Loading time series chart" />}>
                                <TimeSeriesChart
                                    data={timeSeriesData}
                                    onTimeRangeChange={handleTimeSeriesTimeRangeChange}
                                    selectedDays={timeSeriesDays}
                                />
                            </Suspense>
                        )}
                    </ChartContentContainer>
                </StyledChartContainer>
            )}
            </MainContainer>
        </>
    );
};

export default CloudBenchmarks;
