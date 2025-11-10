import React, { useState, useEffect, useCallback } from "react";
import { lazy, Suspense } from "react";
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

const TimeSeriesChart = lazy(() => import("../components/charts/cloud/TimeSeries"));
const RawCloudTable = lazy(() => import("../components/tables/cloud/RawCloudTable"));
const SpeedDistChart = lazy(() => import("../components/charts/cloud/SpeedDistChart"));

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

    // Separate time ranges for each section
    const [distDays, setDistDays] = useState<number>(30);
    const [tableDays, setTableDays] = useState<number>(30);
    const [timeSeriesDays, setTimeSeriesDays] = useState<number>(14);

    // Separate loading states for each section
    const [distLoading, setDistLoading] = useState<boolean>(false);
    const [tableLoading, setTableLoading] = useState<boolean>(false);
    const [timeSeriesLoading, setTimeSeriesLoading] = useState<boolean>(false);

    const [error, setError] = useState<string | null>(null);
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
    const fetchTableData = useCallback(async (days: number) => {
        try {
            setTableLoading(true);
            const res = await fetch(`/api/processed?days=${days}`, {
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
            setError(null);
        } catch (err: any) {
            console.error('Error fetching table data:', err);
            setError(err.message);
        } finally {
            setTableLoading(false);
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

    // Initial data fetch for all sections
    useEffect(() => {
        const initializeData = async () => {
            try {
                // Fetch all sections in parallel with their default time ranges
                await Promise.all([
                    fetchSpeedDistribution(distDays),
                    fetchTableData(tableDays),
                    fetchTimeSeries(timeSeriesDays)
                ]);
            } finally {
                setInitialLoading(false);
            }
        };
        initializeData();
    }, [fetchSpeedDistribution, fetchTableData, fetchTimeSeries, distDays, tableDays, timeSeriesDays]);

    // Time range change handlers for each section
    const handleDistTimeRangeChange = useCallback(async (days: number) => {
        setDistDays(days);
        await fetchSpeedDistribution(days);
    }, [fetchSpeedDistribution]);

    const handleTableTimeRangeChange = useCallback(async (days: number) => {
        setTableDays(days);
        await fetchTableData(days);
    }, [fetchTableData]);

    const handleTimeSeriesTimeRangeChange = useCallback(async (days: number) => {
        setTimeSeriesDays(days);
        await fetchTimeSeries(days);
    }, [fetchTimeSeries]);

    if (initialLoading) {
        return (
            <LoadingContainer>
                <StyledCircularProgress size={80} />
            </LoadingContainer>
        );
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
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
                            <StyledCircularProgress size={60} />
                        </ChartLoadingContainer>
                    ) : speedDistData.length > 0 ? (
                        <Suspense fallback={
                            <ChartLoadingContainer>
                                <StyledCircularProgress size={60} />
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
                    <TimeRangeSelector
                        selectedDays={tableDays}
                        onChange={handleTableTimeRangeChange}
                    />
                </SectionHeaderWithControl>
                <TableContentContainer isMobile={isMobile}>
                    <Box sx={{ pb: 8 }}>
                        {tableLoading ? (
                            <StyledCircularProgress />
                        ) : (
                            <Suspense fallback={<StyledCircularProgress />}>
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
                                <StyledCircularProgress size={60} />
                            </ChartLoadingContainer>
                        ) : (
                            <Suspense fallback={<StyledCircularProgress />}>
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
    );
};

export default CloudBenchmarks;
