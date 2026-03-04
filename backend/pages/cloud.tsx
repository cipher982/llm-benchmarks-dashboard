import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { lazy, Suspense } from "react";
import { GetServerSideProps } from "next";
import Head from "next/head";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { Box } from "@mui/material";
import fs from "fs/promises";
import path from "path";
import { MainContainer } from "../components/design-system/components";
import { SpeedDistributionPoint, TimeSeriesData, TableRow } from "../types/ProcessedData";
import {
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
import { QuickAnswerModule } from "../components/QuickAnswerModule";
import { CloudDecisionHero, QuickPathId, QuickPathOption } from "../components/CloudDecisionHero";
import { buildStaticPageSeoMetadata } from "../utils/seoUtils";
import { trackUmamiEvent } from "../utils/analytics";

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

const formatModelLabel = (row: TableRow): string => {
    return row.model_name || row.modelCanonical || row.modelSlug || "unknown-model";
};

const formatProviderLabel = (row: TableRow): string => {
    return row.provider || row.providerCanonical || row.providerSlug || "unknown-provider";
};

const isEligibleQuickPathRow = (row: TableRow): boolean => {
    if (!row.providerSlug || !row.modelSlug) {
        return false;
    }

    if (row.deprecated) {
        return false;
    }

    const status = row.lifecycle_status || "active";
    return status === "active";
};

const buildQuickPathOptions = (rows: TableRow[]): QuickPathOption[] => {
    const eligibleRows = rows.filter(isEligibleQuickPathRow);
    if (!eligibleRows.length) {
        return [];
    }

    const byLowestLatency = [...eligibleRows]
        .filter((row) => Number.isFinite(row.time_to_first_token_mean) && row.time_to_first_token_mean > 0)
        .sort((a, b) => a.time_to_first_token_mean - b.time_to_first_token_mean);

    const byHighestThroughput = [...eligibleRows]
        .filter((row) => Number.isFinite(row.tokens_per_second_mean) && row.tokens_per_second_mean > 0)
        .sort((a, b) => b.tokens_per_second_mean - a.tokens_per_second_mean);

    const byStability = [...eligibleRows]
        .filter((row) => {
            const mean = row.tokens_per_second_mean;
            const min = row.tokens_per_second_min;
            const max = row.tokens_per_second_max;
            return Number.isFinite(mean) && Number.isFinite(min) && Number.isFinite(max) && mean > 0 && max >= min;
        })
        .sort((a, b) => {
            const aSpread = (a.tokens_per_second_max - a.tokens_per_second_min) / a.tokens_per_second_mean;
            const bSpread = (b.tokens_per_second_max - b.tokens_per_second_min) / b.tokens_per_second_mean;
            return aSpread - bSpread;
        });

    const usedRows = new Set<string>();
    const pickDistinctRow = (candidates: TableRow[]): TableRow | null => {
        for (const row of candidates) {
            const key = `${row.providerSlug}/${row.modelSlug}`;
            if (!usedRows.has(key)) {
                usedRows.add(key);
                return row;
            }
        }
        return candidates[0] ?? null;
    };

    const quickPaths: QuickPathOption[] = [];

    const latencyRow = pickDistinctRow(byLowestLatency);
    if (latencyRow) {
        quickPaths.push({
            id: "lowest_latency",
            title: "Lowest First-Token Wait",
            subtitle: "Best if you care about responsiveness and snappy chat UX.",
            metricLabel: "Avg TTFT",
            metricValue: `${latencyRow.time_to_first_token_mean.toFixed(2)}s`,
            modelName: formatModelLabel(latencyRow),
            providerName: formatProviderLabel(latencyRow),
            providerSlug: latencyRow.providerSlug,
            modelSlug: latencyRow.modelSlug,
        });
    }

    const throughputRow = pickDistinctRow(byHighestThroughput);
    if (throughputRow) {
        quickPaths.push({
            id: "highest_throughput",
            title: "Highest Token Throughput",
            subtitle: "Best for long generations and bulk completion workloads.",
            metricLabel: "Avg speed",
            metricValue: `${Math.round(throughputRow.tokens_per_second_mean)} tok/s`,
            modelName: formatModelLabel(throughputRow),
            providerName: formatProviderLabel(throughputRow),
            providerSlug: throughputRow.providerSlug,
            modelSlug: throughputRow.modelSlug,
        });
    }

    const stableRow = pickDistinctRow(byStability);
    if (stableRow) {
        const spreadRatio = (stableRow.tokens_per_second_max - stableRow.tokens_per_second_min) / stableRow.tokens_per_second_mean;
        quickPaths.push({
            id: "most_stable_7d",
            title: "Most Stable Over 7 Days",
            subtitle: "Best if you want predictable performance with less variance.",
            metricLabel: "Speed spread",
            metricValue: `${(spreadRatio * 100).toFixed(1)}%`,
            modelName: formatModelLabel(stableRow),
            providerName: formatProviderLabel(stableRow),
            providerSlug: stableRow.providerSlug,
            modelSlug: stableRow.modelSlug,
        });
    }

    return quickPaths;
};

const cloudSeo = buildStaticPageSeoMetadata({
    path: "/cloud",
    title: "Cloud LLM Benchmarks - Speed & Performance Testing",
    description:
        "Real-time benchmarking of cloud LLM providers including OpenAI, Anthropic, Google, and more. Compare speed, reliability, and performance.",
    keywords:
        "cloud LLM benchmarks, AI model speed, tokens per second, latency benchmarks, OpenAI benchmark, Anthropic benchmark, Google Vertex benchmark",
});

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

// Props from getStaticProps for SSR/ISR
interface CloudPageProps {
    initialSpeedDistData: SpeedDistributionPoint[];
    initialTableData: TableRow[];
    initialTableMeta: TableMetaSummary | null;
}

const CloudBenchmarks: React.FC<CloudPageProps> = ({
    initialSpeedDistData,
    initialTableData,
    initialTableMeta,
}) => {
    const theme = useTheme();

    // Initialize state with SSR data (no loading spinner needed for initial render)
    const [speedDistData, setSpeedDistData] = useState<SpeedDistributionPoint[]>(initialSpeedDistData);
    const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData>({ timestamps: [], models: [] });
    const [tableData, setTableData] = useState<TableRow[]>(initialTableData);
    const [tableMeta, setTableMeta] = useState<TableMetaSummary | null>(initialTableMeta);
    const [lifecycleSummary, setLifecycleSummary] = useState<LifecycleSummaryResponse | null>(null);
    const [quickPathOptions, setQuickPathOptions] = useState<QuickPathOption[]>([]);

    // Separate time ranges for each section
    const [distDays, setDistDays] = useState<number>(30);
    const [tableDays, setTableDays] = useState<number>(30);
    const [timeSeriesDays, setTimeSeriesDays] = useState<number>(14);

    const [tableStatusFilter, setTableStatusFilter] = useState<TableStatusFilter>('all');

    // Loading states only used for client-side refetches (not initial render)
    const [distLoading, setDistLoading] = useState<boolean>(false);
    const [tableLoading, setTableLoading] = useState<boolean>(false);
    const [timeSeriesLoading, setTimeSeriesLoading] = useState<boolean>(true);
    const [summaryLoading, setSummaryLoading] = useState<boolean>(true); // Only lifecycle needs initial fetch
    const [quickPathLoading, setQuickPathLoading] = useState<boolean>(true);

    const [error, setError] = useState<string | null>(null);
    const [summaryError, setSummaryError] = useState<string | null>(null);
    const [timeSeriesError, setTimeSeriesError] = useState<string | null>(null);
    const [quickPathError, setQuickPathError] = useState<string | null>(null);
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const hasTrackedCloudView = useRef(false);
    const hasTrackedQuickPathsLoaded = useRef(false);

    // Fetch function for Speed Distribution section
    const fetchSpeedDistribution = useCallback(async (days: number) => {
        try {
            setDistLoading(true);
            const res = await fetch(`/api/processed?days=${days}&include=dist`, {
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
            const params = new URLSearchParams({ 
                days: String(days),
                include: 'table'
            });

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

    const fetchQuickPathData = useCallback(async () => {
        try {
            setQuickPathLoading(true);
            const res = await fetch('/api/processed?days=7&include=table&hideFlagged=true', {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            const data = await res.json();
            if (!data || !Array.isArray(data.table)) {
                throw new Error('Invalid quick path table data received');
            }

            setQuickPathOptions(buildQuickPathOptions(data.table));
            setQuickPathError(null);
        } catch (err: any) {
            console.error('Error fetching quick path data:', err);
            setQuickPathError(err.message);
            setQuickPathOptions([]);
        } finally {
            setQuickPathLoading(false);
        }
    }, []);

    // Fetch function for Time Series section
    const fetchTimeSeries = useCallback(async (days: number) => {
        try {
            setTimeSeriesLoading(true);
            const res = await fetch(`/api/processed?days=${days}&include=series`, {
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
            setTimeSeriesError(null);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching time series:', err);
            setTimeSeriesError(err.message);
        } finally {
            setTimeSeriesLoading(false);
        }
    }, []);

    // Only fetch lifecycle summary on mount (other data comes from SSR)
    useEffect(() => {
        fetchLifecycleSummaryData();
        fetchTimeSeries(timeSeriesDays);
        fetchQuickPathData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (hasTrackedCloudView.current) {
            return;
        }

        trackUmamiEvent('cloud_page_view', {
            source: 'cloud_page',
            initialTableRows: initialTableData.length,
            defaultDistDays: 30,
            defaultTableDays: 30,
            defaultTimeSeriesDays: 14,
        });
        hasTrackedCloudView.current = true;
    }, [initialTableData.length]);

    useEffect(() => {
        if (hasTrackedQuickPathsLoaded.current) {
            return;
        }

        if (quickPathLoading || quickPathError || quickPathOptions.length === 0) {
            return;
        }

        trackUmamiEvent('quick_paths_loaded', {
            source: 'cloud_decision_hero',
            optionsCount: quickPathOptions.length,
            optionIds: quickPathOptions.map((option) => option.id).join(','),
        });
        hasTrackedQuickPathsLoaded.current = true;
    }, [quickPathError, quickPathLoading, quickPathOptions]);

    // Time range change handlers for each section
    const handleDistTimeRangeChange = useCallback(async (days: number) => {
        setDistDays(days);
        await fetchSpeedDistribution(days);
    }, [fetchSpeedDistribution]);

    const handleTableTimeRangeChange = useCallback(async (days: number) => {
        setTableDays(days);
        trackUmamiEvent('table_days_change', {
            source: 'table_time_selector',
            selectedDays: days,
        });
        await fetchTableData(days, tableStatusFilter);
    }, [fetchTableData, tableStatusFilter]);

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

    const handleApplyQuickPath = useCallback(async (id: QuickPathId) => {
        const hasOption = quickPathOptions.some((option) => option.id === id);
        if (!hasOption) {
            return;
        }

        setTableStatusFilter('all');
        setTableDays(7);
        await fetchTableData(7, 'all');

        if (typeof window !== 'undefined') {
            document.getElementById('full-results-section')?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        }
    }, [fetchTableData, quickPathOptions]);

    if (error) {
        return (
            <>
                <Head>
                    <title>{cloudSeo.title}</title>
                    <meta name="description" content={cloudSeo.description} />
                    <meta name="keywords" content={cloudSeo.keywords} />
                    <meta name="robots" content="index,follow" />
                    <link rel="canonical" href={cloudSeo.canonical} />
                    <meta property="og:title" content={cloudSeo.openGraph.title} />
                    <meta property="og:description" content={cloudSeo.openGraph.description} />
                    <meta property="og:type" content={cloudSeo.openGraph.type} />
                    <meta property="og:url" content={cloudSeo.openGraph.url} />
                    <meta name="twitter:card" content={cloudSeo.twitter.card} />
                    <meta name="twitter:title" content={cloudSeo.twitter.title} />
                    <meta name="twitter:description" content={cloudSeo.twitter.description} />
                    {cloudSeo.jsonLd && (
                        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(cloudSeo.jsonLd) }} />
                    )}
                </Head>
                <div>Error: {error}</div>
            </>
        );
    }

    return (
        <>
            <Head>
                <title>{cloudSeo.title}</title>
                <meta name="description" content={cloudSeo.description} />
                <meta name="keywords" content={cloudSeo.keywords} />
                <meta name="robots" content="index,follow" />
                <link rel="canonical" href={cloudSeo.canonical} />
                <meta property="og:title" content={cloudSeo.openGraph.title} />
                <meta property="og:description" content={cloudSeo.openGraph.description} />
                <meta property="og:type" content={cloudSeo.openGraph.type} />
                <meta property="og:url" content={cloudSeo.openGraph.url} />
                <meta name="twitter:card" content={cloudSeo.twitter.card} />
                <meta name="twitter:title" content={cloudSeo.twitter.title} />
                <meta name="twitter:description" content={cloudSeo.twitter.description} />
                {cloudSeo.jsonLd && (
                    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(cloudSeo.jsonLd) }} />
                )}
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
                </CenteredContentContainer>
            </StyledDescriptionSection>

            <CloudDecisionHero
                options={quickPathOptions}
                loading={quickPathLoading}
                error={quickPathError}
                onApplyQuickPath={handleApplyQuickPath}
            />

            <QuickAnswerModule tableData={tableData} />

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

            <StyledTableContainer id="full-results-section" isMobile={isMobile}>
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
                                trackUmamiEvent('table_status_filter_change', {
                                    source: 'lifecycle_selector',
                                    filter: value,
                                });
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

            <StyledDescriptionSection isMobile={isMobile}>
                <CenteredContentContainer>
                    <Box
                        sx={{
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
                <SectionHeader>📈 Time Series 📈</SectionHeader>
                <ChartContentContainer>
                    {timeSeriesLoading ? (
                        <ChartLoadingContainer>
                            <StyledCircularProgress size={60} aria-label="Loading time series chart" />
                        </ChartLoadingContainer>
                    ) : timeSeriesError ? (
                        <div style={{ color: '#d32f2f', textAlign: 'center' }}>
                            Failed to load time series data. ({timeSeriesError})
                        </div>
                    ) : timeSeriesData?.timestamps && timeSeriesData.timestamps.length > 0 ? (
                        <Suspense fallback={<StyledCircularProgress aria-label="Loading time series chart" />}>
                            <TimeSeriesChart
                                data={timeSeriesData}
                                onTimeRangeChange={handleTimeSeriesTimeRangeChange}
                                selectedDays={timeSeriesDays}
                            />
                        </Suspense>
                    ) : (
                        <div style={{ textAlign: 'center' }}>No time series data available.</div>
                    )}
                </ChartContentContainer>
            </StyledChartContainer>
            </MainContainer>
        </>
    );
};

// SSR: Pre-render page with static file data on each request
export const getServerSideProps: GetServerSideProps<CloudPageProps> = async ({ res }) => {
    // Set cache headers for CDN/browser caching (5 min cache, 10 min stale-while-revalidate)
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

    try {
        const apiDir = path.join(process.cwd(), 'public', 'api');

        // Read pre-generated static files (fast - they're on disk)
        const data30Raw = await fs.readFile(path.join(apiDir, 'processed-30days.json'), 'utf8');
        const data30 = JSON.parse(data30Raw);

        return {
            props: {
                initialSpeedDistData: data30.speedDistribution || [],
                initialTableData: data30.table || [],
                initialTableMeta: data30.meta?.table || null,
            },
        };
    } catch (error) {
        console.error('getServerSideProps error:', error);
        // Return empty data if static files aren't available (fallback)
        return {
            props: {
                initialSpeedDistData: [],
                initialTableData: [],
                initialTableMeta: null,
            },
        };
    }
};

export default CloudBenchmarks;
