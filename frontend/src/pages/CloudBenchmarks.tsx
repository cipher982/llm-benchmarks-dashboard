import React, { useState, useEffect, useCallback } from "react";
import { lazy, Suspense } from "react";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { MainContainer } from "../styles";
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

const TimeSeriesChart = lazy(() => import("../charts/cloud/TimeSeries"));
const RawCloudTable = lazy(() => import("../tables/cloud/RawCloudTable"));
const SpeedDistChart = lazy(() => import("../charts/cloud/SpeedDistChart"));

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
            if (!process.env.REACT_APP_API_URL) {
                throw new Error("REACT_APP_API_URL environment variable is not set");
            }
            const apiUrl = process.env.REACT_APP_API_URL;
            const queryParams = days ? `?days=${days}` : '';
            const fullUrl = `${apiUrl}/api/processed${queryParams}`;
            
            console.log('🌐 EXACT HTTP CALL:', fullUrl);
            console.log('🌐 API_URL from env:', apiUrl);
            console.log('🌐 Query params:', queryParams);
            
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
            console.log('🌐 CACHE STATUS:', res.headers.get('x-cache') || 'No cache header');
            
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            
            const data = await res.json();
            
            // DEBUG: Log ALL model data comprehensively
            console.log('📊 TOTAL MODELS RECEIVED:', data.timeSeries?.models?.length || 0);
            
            // Log ALL model names (not just first 5)
            const allModelNames = data.timeSeries?.models?.map((m: any, index: number) => ({
                index,
                model_name: m.model_name,
                display_name: m.display_name,
                final_display: m.display_name || m.model_name,
                provider_count: m.providers?.length || 0
            })) || [];
            console.log('📊 ALL MODEL NAMES:', allModelNames);
            
            // Search for ANY models containing meta-llama, meta, llama variations
            const suspiciousModels = data.timeSeries?.models?.filter((m: any) => {
                const modelName = (m.model_name || '').toLowerCase();
                const displayName = (m.display_name || '').toLowerCase();
                return modelName.includes('meta-llama') || displayName.includes('meta-llama') ||
                       modelName.includes('meta/') || displayName.includes('meta/') ||
                       modelName.includes('405b-instruct') || displayName.includes('405b-instruct');
            }) || [];
            console.log('🚨 SUSPICIOUS MODELS:', suspiciousModels.length, suspiciousModels);
            
            // Log what will actually be rendered
            console.log('🎨 WHAT WILL BE DISPLAYED:', allModelNames.map((m: any) => m.final_display));
            
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
    }, [fetchCloudBenchmarks, selectedDays]); // Add required dependencies

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
                    <div style={{ paddingBottom: '30px' }}>
                        <Suspense fallback={<StyledCircularProgress />}>
                            <RawCloudTable 
                                data={tableData} 
                                modelLinkFn={(provider, modelName) => createModelUrl(provider, modelName)}
                            />
                        </Suspense>
                    </div>
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