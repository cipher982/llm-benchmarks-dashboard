import React, { useState, useEffect, useCallback, useRef } from "react";
import { lazy, Suspense } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import { useMediaQuery } from "@mui/material";
import { MainContainer, DescriptionSection, ChartContainer, TableContainer } from "../styles";
import { SpeedDistributionPoint, TimeSeriesData, TableRow } from "../types/ProcessedData";

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
            const apiUrl = process.env.REACT_APP_API_URL || 'https://llm-benchmarks-backend.vercel.app';
            console.time('fetchCloudBenchmarks');
            const queryParams = days ? `?days=${days}` : '';
            const res = await fetch(`${apiUrl}/api/processed${queryParams}`);
            console.timeEnd('fetchCloudBenchmarks');
            
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
    }, []); // Empty dependency array - only runs on mount

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
                            <RawCloudTable data={tableData} />
                        </Suspense>
                    </div>
                </div>
            </TableContainer>

            {timeSeriesData.timestamps.length > 0 && (
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