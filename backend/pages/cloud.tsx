/**
 * Cloud benchmarks.
 *
 * Console layout: a meter strip of global aggregates, then the distribution
 * beside per-provider aggregates and a throughput-against-spread scatter, then
 * the full results table, then throughput over time as small multiples. Prose
 * appears once, at the bottom, and only says what the numbers cannot — how
 * sampling works and what the derived columns mean.
 *
 * What used to be above the fold and is now gone: a three-paragraph
 * introduction, a "Pick A Path In 10 Seconds" module recommending one of three
 * models with benefit copy, and a "Fastest Models Right Now" panel. All three
 * spent the first viewport on framing rather than measurement, and the two
 * panels between them reprinted figures the table already carried.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { lazy, Suspense } from "react";
import { GetServerSideProps } from "next";
import Head from "next/head";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import fs from "fs/promises";
import path from "path";
import { MainContainer, SplitRow } from "../components/design-system/components";
import { SpeedDistributionPoint, TimeSeriesData, TableRow } from "../types/ProcessedData";
import {
    ChartLoadingContainer,
    StyledCircularProgress,
    SectionHeaderRow,
    SectionHeader,
    RailControls,
    RailNote,
    StyledDescriptionSection,
    StyledChartContainer,
    StyledTableContainer,
    TableContentContainer,
    EmptyState,
} from "../components/StyledComponents";
import { TimeRangeSelector } from "../components/TimeRangeSelector";
import { LifecycleSelector } from "../components/LifecycleSelector";
import GlobalMeters from "../components/cloud/GlobalMeters";
import { LEGACY_LABEL, LEGACY_DISCLOSURE } from "../utils/legacyMetric";
import ProviderAggregates from "../components/cloud/ProviderAggregates";
import { buildStaticPageSeoMetadata } from "../utils/seoUtils";
import { trackUmamiEvent } from "../utils/analytics";
import { spreadPercent, slugKey, type SlugLookup } from "../utils/chartMath";
import { designFixturesEnabled, getFixtureProcessed } from "../utils/designFixtures";

const TimeSeriesChart = lazy(() => import("../components/charts/cloud/TimeSeries"));
const RawCloudTable = lazy(() => import("../components/tables/cloud/RawCloudTable"));
const SpeedDistChart = lazy(() => import("../components/charts/cloud/SpeedDistChart"));
const SpreadScatter = lazy(() => import("../components/charts/cloud/SpreadScatter"));

type TableStatusFilter = 'all' | 'hideFlagged' | 'flaggedOnly';

const FLAGGED_STATUSES = [
    'likely_deprecated',
    'deprecated',
    'failing',
    'stale',
    'never_succeeded',
    'disabled'
];

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

    const [speedDistData, setSpeedDistData] = useState<SpeedDistributionPoint[]>(initialSpeedDistData);
    const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData>({ timestamps: [], models: [] });
    const [tableData, setTableData] = useState<TableRow[]>(initialTableData);
    const [tableMeta, setTableMeta] = useState<TableMetaSummary | null>(initialTableMeta);
    const [lifecycleSummary, setLifecycleSummary] = useState<LifecycleSummaryResponse | null>(null);

    // Three independent time selectors. Each section holds its own state and
    // fetches on its own, which is what stops one change refetching the page.
    const [distDays, setDistDays] = useState<number>(30);
    const [tableDays, setTableDays] = useState<number>(30);
    const [timeSeriesDays, setTimeSeriesDays] = useState<number>(14);

    const [tableStatusFilter, setTableStatusFilter] = useState<TableStatusFilter>('all');

    const [distLoading, setDistLoading] = useState<boolean>(false);
    const [tableLoading, setTableLoading] = useState<boolean>(false);
    const [timeSeriesLoading, setTimeSeriesLoading] = useState<boolean>(true);

    const [error, setError] = useState<string | null>(null);
    const [timeSeriesError, setTimeSeriesError] = useState<string | null>(null);
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const hasTrackedCloudView = useRef(false);

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
            const res = await fetch('/api/lifecycle-summary');
            if (!res.ok) {
                throw new Error(`Lifecycle summary HTTP ${res.status}`);
            }
            const data: LifecycleSummaryResponse = await res.json();
            setLifecycleSummary(data);
        } catch (err: any) {
            console.error('Error fetching lifecycle summary:', err);
            setLifecycleSummary(null);
        }
    }, []);

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

    useEffect(() => {
        fetchLifecycleSummaryData();
        fetchTimeSeries(timeSeriesDays);
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
        trackUmamiEvent('search_or_filter_used', {
            source: 'table_time_selector',
            filterType: 'time_range',
            value: days,
        });
        await fetchTableData(days, tableStatusFilter);
    }, [fetchTableData, tableStatusFilter]);

    const handleTimeSeriesTimeRangeChange = useCallback(async (days: number) => {
        setTimeSeriesDays(days);
        await fetchTimeSeries(days);
    }, [fetchTimeSeries]);

    /** One point per model for the throughput-against-spread scatter. */
    const scatterPoints = useMemo(() =>
        tableData
            .map((row) => {
                const spread = spreadPercent(
                    row.tokens_per_second_min,
                    row.tokens_per_second_mean,
                    row.tokens_per_second_max,
                );
                if (spread == null) return null;
                return {
                    model: row.model_name,
                    provider: row.provider,
                    x: row.tokens_per_second_mean,
                    y: spread,
                };
            })
            .filter((p): p is NonNullable<typeof p> => p != null)
    , [tableData]);

    /**
     * Slugs keyed by `provider/model`, so a model or provider named anywhere on
     * the page — the ridgeline rail, a small-multiple caption, the table — is
     * navigable. Only the table payload carries slugs; the chart payloads do
     * not, so the page builds the lookup once and the charts only read it.
     */
    const slugs = useMemo<SlugLookup>(() => {
        const map: SlugLookup = new Map();
        for (const row of tableData) {
            if (!row.providerSlug || !row.modelSlug) continue;
            map.set(slugKey(row.provider, row.model_name), {
                providerSlug: row.providerSlug,
                modelSlug: row.modelSlug,
            });
        }
        return map;
    }, [tableData]);

    /**
     * Throughput history keyed by `provider/model`, for the table's trend
     * column. Built here because the page owns the time series and the table
     * only draws it.
     */
    const trends = useMemo(() => {
        const map = new Map<string, (number | null)[]>();
        for (const model of timeSeriesData.models) {
            for (const provider of model.providers) {
                if (!provider.values?.length) continue;
                map.set(`${provider.providerCanonical}/${provider.transportProvider || 'direct'}/${model.model_name}`, provider.values);
            }
        }
        return map;
    }, [timeSeriesData.models]);

    const flaggedTotal = useMemo(
        () => lifecycleSummary?.rows.reduce((total, row) => total + row.flaggedTotal, 0) ?? null,
        [lifecycleSummary],
    );

    const seoHead = (
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
    );

    if (error) {
        return (
            <>
                {seoHead}
                <MainContainer isMobile={isMobile}>
                    <StyledDescriptionSection isMobile={isMobile}>
                        <p>Error: {error}</p>
                    </StyledDescriptionSection>
                </MainContainer>
            </>
        );
    }

    const totalRows = tableMeta?.totalRows ?? tableData.length;
    const filteredRows = tableMeta?.filteredRows ?? tableData.length;

    return (
        <>
            {seoHead}
            <MainContainer isMobile={isMobile}>
                <h1 className="sr-only">Cloud LLM benchmarks</h1>

                <GlobalMeters rows={tableData} />

                <SplitRow asideWidth={420}>
                    <section>
                        <SectionHeaderRow>
                            <SectionHeader>Throughput distribution · tok/s</SectionHeader>
                            <RailNote title={LEGACY_DISCLOSURE}>{LEGACY_LABEL}</RailNote>
                            <RailControls>
                                <TimeRangeSelector selectedDays={distDays} onChange={handleDistTimeRangeChange} />
                            </RailControls>
                        </SectionHeaderRow>
                        {distLoading ? (
                            <ChartLoadingContainer>
                                <StyledCircularProgress size={28} aria-label="Loading speed distribution chart" />
                            </ChartLoadingContainer>
                        ) : speedDistData.length > 0 ? (
                            <Suspense fallback={<ChartLoadingContainer><StyledCircularProgress size={28} /></ChartLoadingContainer>}>
                                <SpeedDistChart data={speedDistData} slugs={slugs} />
                            </Suspense>
                        ) : null}
                    </section>

                    <div>
                        <section>
                            <SectionHeaderRow>
                                <SectionHeader>By provider</SectionHeader>
                                <RailNote title={LEGACY_DISCLOSURE}>{LEGACY_LABEL}</RailNote>
                                {flaggedTotal != null && (
                                    <RailControls>
                                        <RailNote>
                                            <b>{flaggedTotal}</b> flagged
                                        </RailNote>
                                    </RailControls>
                                )}
                            </SectionHeaderRow>
                            <ProviderAggregates rows={tableData} />
                        </section>

                        <section>
                            <SectionHeaderRow>
                                <SectionHeader>
                                    Throughput × spread · {scatterPoints.length} models
                                </SectionHeader>
                            </SectionHeaderRow>
                            <Suspense fallback={<ChartLoadingContainer><StyledCircularProgress size={28} /></ChartLoadingContainer>}>
                                <SpreadScatter points={scatterPoints} />
                            </Suspense>
                        </section>
                    </div>
                </SplitRow>

                <StyledTableContainer id="full-results-section" isMobile={isMobile}>
                    <SectionHeaderRow>
                        <SectionHeader>Full results</SectionHeader>
                        <RailNote title={LEGACY_DISCLOSURE}>{LEGACY_LABEL}</RailNote>
                        <RailNote>
                            <b>{filteredRows}</b> of <b>{totalRows}</b> models
                        </RailNote>
                        <RailControls>
                            <TimeRangeSelector selectedDays={tableDays} onChange={handleTableTimeRangeChange} />
                            <LifecycleSelector
                                value={tableStatusFilter}
                                onChange={(value) => {
                                    setTableStatusFilter(value);
                                    trackUmamiEvent('table_status_filter_change', {
                                        source: 'lifecycle_selector',
                                        filter: value,
                                    });
                                    trackUmamiEvent('search_or_filter_used', {
                                        source: 'lifecycle_selector',
                                        filterType: 'lifecycle_status',
                                        value,
                                    });
                                    fetchTableData(tableDays, value);
                                }}
                            />
                        </RailControls>
                    </SectionHeaderRow>
                    <TableContentContainer isMobile={isMobile}>
                        {tableLoading ? (
                            <ChartLoadingContainer>
                                <StyledCircularProgress size={28} aria-label="Loading benchmark table" />
                            </ChartLoadingContainer>
                        ) : tableData.length > 0 ? (
                            <Suspense fallback={<ChartLoadingContainer><StyledCircularProgress size={28} /></ChartLoadingContainer>}>
                                <RawCloudTable data={tableData} trends={trends} />
                            </Suspense>
                        ) : (
                            <EmptyState>No table data available</EmptyState>
                        )}
                    </TableContentContainer>
                </StyledTableContainer>

                <StyledChartContainer isMobile={isMobile}>
                    <SectionHeaderRow>
                        <SectionHeader>Throughput over time · shared scale</SectionHeader>
                        <RailNote title={LEGACY_DISCLOSURE}>{LEGACY_LABEL}</RailNote>
                        <RailControls>
                            <TimeRangeSelector selectedDays={timeSeriesDays} onChange={handleTimeSeriesTimeRangeChange} />
                        </RailControls>
                    </SectionHeaderRow>
                    {timeSeriesLoading ? (
                        <ChartLoadingContainer>
                            <StyledCircularProgress size={28} aria-label="Loading time series chart" />
                        </ChartLoadingContainer>
                    ) : timeSeriesError ? (
                        <EmptyState $tone="bad">Time series unavailable · {timeSeriesError}</EmptyState>
                    ) : (
                        <Suspense fallback={<ChartLoadingContainer><StyledCircularProgress size={28} /></ChartLoadingContainer>}>
                            <TimeSeriesChart
                                data={timeSeriesData}
                                onTimeRangeChange={handleTimeSeriesTimeRangeChange}
                                selectedDays={timeSeriesDays}
                                slugs={slugs}
                            />
                        </Suspense>
                    )}
                </StyledChartContainer>

                {/* The only prose on the page. Numbers cannot state the sampling
                    method, the collection interval, or what a derived column
                    means, so those are what it says. */}
                <StyledDescriptionSection isMobile={isMobile}>
                    <p>
                        <b>Method.</b> A cron job calls each model&apos;s live API endpoint on a schedule and records what
                        came back. Mean, min and max are over completed samples in the selected window, and <b>n</b> is
                        how many there were. A missing value means the endpoint returned an error or the model was not
                        yet in the catalogue.
                    </p>
                    <p>
                        <b>Spread</b> is (max − min) ÷ mean, so it measures run-to-run variation rather than absolute
                        speed. <b>TTFT</b> is seconds to the first visible token; runs that emit only reasoning tokens
                        are left out of that average. <b>Mean</b> counts visible output tokens where a provider reports
                        them and falls back to generated throughput where it does not, which is why <b>Gen</b> is higher
                        for models that think before answering.
                    </p>
                </StyledDescriptionSection>
            </MainContainer>
        </>
    );
};

// SSR: Pre-render page with static file data on each request
export const getServerSideProps: GetServerSideProps<CloudPageProps> = async ({ res }) => {
    // Set cache headers for CDN/browser caching (5 min cache, 10 min stale-while-revalidate)
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

    try {
        // Design mode: the fixture ahead of the static file, for the same reason
        // `/api/processed` does it — an older static file has no slugs, so every
        // model and provider cell would render unclickable.
        if (designFixturesEnabled()) {
            const fixture = await getFixtureProcessed();
            if (fixture) {
                return {
                    props: {
                        initialSpeedDistData: (fixture.speedDistribution as SpeedDistributionPoint[]) || [],
                        initialTableData: (fixture.table as TableRow[]) || [],
                        initialTableMeta: (fixture.meta as any)?.table || null,
                    },
                };
            }
        }

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
