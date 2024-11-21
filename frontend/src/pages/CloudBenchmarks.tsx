import React, { useState, useEffect } from "react";
import { lazy, Suspense } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import { useMediaQuery } from "@mui/material";
import { MainContainer, DescriptionSection, ChartContainer, TableContainer } from "../styles";
import { SpeedDistributionPoint, TimeSeriesData, TableRow } from "../types/ProcessedData";

const TimeSeriesChart = lazy(() => import("../charts/cloud/TimeSeries"));
const RawCloudTable = lazy(() => import("../tables/cloud/RawCloudTable"));
const SpeedDistChart = lazy(() => import("../charts/cloud/SpeedDistChart"));

const CloudBenchmarks: React.FC = () => {
    const [speedDistData, setSpeedDistData] = useState<SpeedDistributionPoint[]>([]);
    const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData>({ 
        timestamps: [], 
        models: [] 
    });
    const [tableData, setTableData] = useState<TableRow[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [dataReady, setDataReady] = useState<boolean>(false);
    const isMobile = useMediaQuery("(max-width:500px)");

    useEffect(() => {
        const fetchCloudBenchmarks = async () => {
            try {
                const apiUrl = process.env.REACT_APP_API_URL || 'https://llm-benchmarks-backend.vercel.app';
                const res = await fetch(`${apiUrl}/api/processed`);
                const data = await res.json();
                
                console.log('API Response:', data);
                
                if (!data || !data.speedDistribution || !data.timeSeries || !data.table) {
                    console.error('Invalid data structure:', data);
                    throw new Error('Invalid data format received from API');
                }

                // console.log('Speed Distribution:', data.speedDistribution);
                // console.log('Time Series:', data.timeSeries);
                // console.log('Table Data:', data.table);

                setSpeedDistData(data.speedDistribution);
                setTimeSeriesData(data.timeSeries);
                setTableData(data.table);
                setDataReady(true);
                
            } catch (err) {
                const error = err as Error;
                console.error("Error fetching data:", error);
                setError(error.toString());
                setDataReady(true);
            }
        };
        fetchCloudBenchmarks();
    }, []);

    if (!dataReady) {
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

    if (error) return <div>Error: {error}</div>;

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

            {dataReady && (
                <ChartContainer isMobile={isMobile} style={{ borderRadius: "10px" }}>
                    <h4>📈 Time Series 📈</h4>
                    <div style={{ padding: "0 20px 20px 20px" }}>
                        <Suspense fallback={<CircularProgress style={{ color: "#663399" }} />}>
                            <TimeSeriesChart data={timeSeriesData} />
                        </Suspense>
                    </div>
                </ChartContainer>
            )}
        </MainContainer>
    );
};

export default CloudBenchmarks;