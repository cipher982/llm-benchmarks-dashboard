import React, { useState, useEffect, useCallback } from "react";
import { lazy, Suspense } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import useMediaQuery from "@mui/material/useMediaQuery";
import { MainContainer, DescriptionSection, ChartContainer, TableContainer } from "../styles";
import { SpeedDistributionPoint, TimeSeriesData, TableRow } from "../types/ProcessedData";
import { createModelUrl } from "../utils/seoUtils";

const TimeSeriesChart = lazy(() => import("../charts/cloud/TimeSeries"));
const RawCloudTable = lazy(() => import("../tables/cloud/RawCloudTable"));
const SpeedDistChart = lazy(() => import("../charts/cloud/SpeedDistChart"));

const CloudBenchmarks: React.FC = () => {
    console.log('CloudBenchmarks component mounted');
    const [speedDistData, setSpeedDistData] = useState<SpeedDistributionPoint[]>([]);
    const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData>({ 
        timestamps: [], 
        models: [] 
    });
    const [tableData, setTableData] = useState<TableRow[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [initialLoading, setInitialLoading] = useState<boolean>(true);
    const [selectedDays, setSelectedDays] = useState<number>(12);
    const isMobile = useMediaQuery("(max-width:500px)");

    const fetchCloudBenchmarks = useCallback(async (days?: number) => {
        try {
            if (!process.env.REACT_APP_API_URL) {
                throw new Error("REACT_APP_API_URL environment variable is not set");
            }
            const apiUrl = process.env.REACT_APP_API_URL;
            console.time('fetchCloudBenchmarks');
            const queryParams = days ? `?days=${days}` : '';
            const res = await fetch(`${apiUrl}/api/processed${queryParams}`);
            console.timeEnd('fetchCloudBenchmarks');
            
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            
            const data = await res.json();
            
            // DEBUG: Log models with meta-llama to identify the issue
            const metaLlamaModels = data.timeSeries?.models?.filter((m: any) => 
                (m.model_name || '').includes('meta-llama') || 
                (m.display_name || '').includes('meta-llama')
            ) || [];
            console.log('🔍 Meta-llama models found:', metaLlamaModels.length, metaLlamaModels.map((m: any) => ({
                model_name: m.model_name,
                display_name: m.display_name
            })));
            
            // DEBUG: Search for the specific ugly model name
            const uglyModel = data.timeSeries?.models?.find((m: any) => 
                (m.model_name || '').includes('meta-llama-3.1-405b-instruct') ||
                (m.display_name || '').includes('meta-llama-3.1-405b-instruct')
            );
            if (uglyModel) {
                console.log('🚨 FOUND THE UGLY MODEL:', {
                    model_name: uglyModel.model_name,
                    display_name: uglyModel.display_name,
                    providers: uglyModel.providers?.map((p: any) => p.provider)
                });
            }
            
            // DEBUG: Log first 5 model names to see what we're getting
            const first5Models = data.timeSeries?.models?.slice(0, 5).map((m: any) => ({
                model_name: m.model_name,
                display_name: m.display_name || m.model_name
            })) || [];
            console.log('🔍 First 5 models:', first5Models);
            
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
            <div style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100vh",
                backgroundColor: "white"
            }}>
                <CircularProgress style={{ color: "#663399" }} size={80} />
            </div>
        );
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <MainContainer isMobile={isMobile}>
            <DescriptionSection isMobile={isMobile} style={{ borderRadius: "10px", marginBottom: "20px" }}>
                <div style={{ maxWidth: "1200px", margin: "auto" }}>
                    <h1 style={{ textAlign: "center" }}>☁️ Cloud Benchmarks ☁️</h1>
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
                </div>
            </DescriptionSection>

            <ChartContainer isMobile={isMobile} style={{ borderRadius: "10px", maxWidth: "100%", overflowX: "auto", marginBottom: "20px" }}>
                <h4>📊 Speed Distribution 📊</h4>
                <div style={{ maxWidth: "1100px", maxHeight: "600px", width: "100%", height: "100%", margin: "auto", paddingBottom: "20px" }}>
                    {speedDistData.length > 0 && (
                        <Suspense fallback={
                            <div style={{ 
                                width: "100%", 
                                height: "600px", 
                                display: "flex", 
                                alignItems: "center", 
                                justifyContent: "center",
                                backgroundColor: "white"
                            }}>
                                <CircularProgress style={{ color: "#663399" }} size={60} />
                            </div>
                        }>
                            <SpeedDistChart data={speedDistData} />
                        </Suspense>
                    )}
                </div>
            </ChartContainer>

            <TableContainer isMobile={isMobile} style={{ 
                borderRadius: "10px", 
                display: "flex", 
                flexDirection: "column", 
                alignItems: "center", 
                justifyContent: "center",
                minHeight: "400px",
                marginBottom: "20px"
            }}>
                <h4 style={{ width: "100%", textAlign: "center" }}>📚 Full Results 📚</h4>
                <div style={{
                    height: "100%",
                    width: "100%",
                    maxWidth: "850px",
                    overflow: "auto",
                    paddingLeft: isMobile ? "0px" : "20px",
                    paddingRight: isMobile ? "0px" : "20px",
                    margin: "auto"
                }}>
                    <div style={{ paddingBottom: "30px" }}>
                        <Suspense fallback={<CircularProgress style={{ color: "#663399" }} />}>
                            <RawCloudTable 
                                data={tableData} 
                                modelLinkFn={(provider, modelName) => createModelUrl(provider, modelName)}
                            />
                        </Suspense>
                    </div>
                </div>
            </TableContainer>

            {timeSeriesData?.timestamps && timeSeriesData.timestamps.length > 0 && (
                <ChartContainer isMobile={isMobile} style={{ borderRadius: "10px" }}>
                    <h4>📈 Time Series 📈</h4>
                    <div style={{ padding: "0 5px 20px 5px" }}>
                        <Suspense fallback={<CircularProgress style={{ color: "#663399" }} />}>
                            <TimeSeriesChart 
                                data={timeSeriesData} 
                                onTimeRangeChange={handleTimeRangeChange}
                                selectedDays={selectedDays}
                            />
                        </Suspense>
                    </div>
                </ChartContainer>
            )}
        </MainContainer>
    );
};

export default CloudBenchmarks;