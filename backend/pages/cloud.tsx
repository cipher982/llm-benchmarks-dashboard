import React, { useState, useEffect, useCallback } from "react";
import { lazy, Suspense } from "react";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { Box } from "@mui/material";
import { MainContainer } from "../components/design-system/components";
import { SpeedDistributionPoint, TimeSeriesData, TableRow } from "../types/ProcessedData";
import { createModelUrl } from "../utils/seoUtils";
import {
    LoadingContainer,
    ChartLoadingContainer,
    StyledCircularProgress,
    CenteredContentContainer,
    ChartContentContainer,
    TableContentContainer,
    SectionHeader,
    PageTitle,
    StyledDescriptionSection,
    StyledChartContainer,
    StyledTableContainer,
} from "../components/StyledComponents";

const TimeSeriesChart = lazy(() => import("../components/charts/cloud/TimeSeries"));
const RawCloudTable = lazy(() => import("../components/tables/cloud/RawCloudTable"));
const SpeedDistChart = lazy(() => import("../components/charts/cloud/SpeedDistChart"));

const CloudBenchmarks: React.FC = () => {
    console.log('CloudBenchmarks component mounted');
    const theme = useTheme();
    const [speedDistData, setSpeedDistData] = useState<SpeedDistributionPoint[]>([]);
    const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData>({ 
        timestamps: [], 
        models: [] 
    });
    const [tableData, setTableData] = useState<TableRow[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [initialLoading, setInitialLoading] = useState<boolean>(true);
    const [selectedDays, setSelectedDays] = useState<number>(12);
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const fetchCloudBenchmarks = useCallback(async (days?: number) => {
        try {
            const queryParams = days ? `?days=${days}` : '';
            const fullUrl = `/api/processed${queryParams}`;
            
            console.log('🌐 EXACT HTTP CALL:', fullUrl);
            
            console.time('fetchCloudBenchmarks');
            const res = await fetch(fullUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            console.timeEnd('fetchCloudBenchmarks');
            
            console.log('🌐 RESPONSE STATUS:', res.status);
            console.log('🌐 RESPONSE HEADERS:', Object.fromEntries([...res.headers]));
            console.log('🌐 CACHE STATUS:', res.headers.get('x-cache-status') || 'No cache header');
            
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            
            const data = await res.json();
            
            if (!data || !data.speedDistribution || !data.timeSeries || !data.table) {
                throw new Error('Invalid data format received from API');
            }

            setSpeedDistData(data.speedDistribution);
            setTimeSeriesData(data.timeSeries);
            setTableData(data.table);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching cloud benchmarks:', err);
            setError(err.message);
        }
    }, []);

    // Only run on initial mount
    useEffect(() => {
        const initializeData = async () => {
            try {
                await fetchCloudBenchmarks(selectedDays);
            } finally {
                setInitialLoading(false);
            }
        };
        initializeData();
    }, [fetchCloudBenchmarks, selectedDays]);

    // Handle time range changes
    const handleTimeRangeChange = useCallback(async (days: number) => {
        setSelectedDays(days);
        await fetchCloudBenchmarks(days);
    }, [fetchCloudBenchmarks]);

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
                        I am working daily to add more providers and models, looking anywhere that
                        does not require purchasing dedicated endpoints for hosting (why some models may appear
                        to be missing). If you have any more suggestions let me know on GitHub!! 😊
                    </p>
                </CenteredContentContainer>
            </StyledDescriptionSection>

            <StyledChartContainer isMobile={isMobile}>
                <SectionHeader>📊 Speed Distribution 📊</SectionHeader>
                <ChartContentContainer>
                    {speedDistData.length > 0 && (
                        <Suspense fallback={
                            <ChartLoadingContainer>
                                <StyledCircularProgress size={60} />
                            </ChartLoadingContainer>
                        }>
                            <SpeedDistChart data={speedDistData} />
                        </Suspense>
                    )}
                </ChartContentContainer>
            </StyledChartContainer>

            <StyledTableContainer isMobile={isMobile}>
                <SectionHeader>📚 Full Results 📚</SectionHeader>
                <TableContentContainer isMobile={isMobile}>
                    <Box sx={{ pb: 8 }}>
                        <Suspense fallback={<StyledCircularProgress />}>
                            {tableData && tableData.length > 0 ? (
                                <RawCloudTable 
                                    data={tableData} 
                                    modelLinkFn={(provider, modelName) => createModelUrl(provider, modelName)}
                                />
                            ) : (
                                <div>Loading table data...</div>
                            )}
                        </Suspense>
                    </Box>
                </TableContentContainer>
            </StyledTableContainer>

            {timeSeriesData?.timestamps && timeSeriesData.timestamps.length > 0 && (
                <StyledChartContainer isMobile={isMobile}>
                    <SectionHeader>📈 Time Series 📈</SectionHeader>
                    <ChartContentContainer>
                        <Suspense fallback={<StyledCircularProgress />}>
                            <TimeSeriesChart 
                                data={timeSeriesData} 
                                onTimeRangeChange={handleTimeRangeChange}
                                selectedDays={selectedDays}
                            />
                        </Suspense>
                    </ChartContentContainer>
                </StyledChartContainer>
            )}
        </MainContainer>
    );
};

export default CloudBenchmarks;