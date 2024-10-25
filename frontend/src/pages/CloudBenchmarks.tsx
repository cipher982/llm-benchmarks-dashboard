import React, { useState, useEffect } from "react";
import { lazy, Suspense } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import { useMediaQuery } from "@mui/material";
import { MainContainer, DescriptionSection, ChartContainer, TableContainer } from "../styles";
import { CloudBenchmark } from "../types/CloudData";

const TimeSeriesChart = lazy(() => import("../charts/cloud/TimeSeries"));
const RawCloudTable = lazy(() => import("../tables/cloud/RawCloudTable"));
const SpeedDistChart = lazy(() => import("../charts/cloud/SpeedDistChart"));

const CloudBenchmarks: React.FC = () => {
    const [benchmarks, setBenchmarks] = useState<CloudBenchmark[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const isMobile = useMediaQuery("(max-width:500px)");
    const [dataReady, setDataReady] = useState<boolean>(false);

    useEffect(() => {
        const fetchCloudBenchmarks = async () => {
            try {
                const res = await fetch("https://llm-benchmarks-backend.vercel.app/api/cloud");
                const data = await res.json();
                
                const worker = new Worker(
                    new URL("../workers/dataWorker.ts", import.meta.url)
                );
                
                worker.onmessage = (event) => {
                    setBenchmarks(event.data);
                    setLoading(false);
                    setDataReady(true);
                    worker.terminate();
                };

                worker.postMessage(data);
                
            } catch (err) {
                const error = err as Error;
                console.error("Error fetching data:", error);
                setError(error.toString());
                setLoading(false);
            }
        };
        fetchCloudBenchmarks();
    }, []);

    if (loading) {
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
            <DescriptionSection isMobile={isMobile} style={{ borderRadius: "10px" }}>
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

            <ChartContainer isMobile={isMobile} style={{ borderRadius: "10px", maxWidth: "100%", overflowX: "auto" }}>
                <h4>📊 Speed Distribution 📊</h4>
                <div style={{ maxWidth: "1100px", maxHeight: "600px", width: "100%", height: "100%", margin: "auto", paddingBottom: "0px" }}>
                    <Suspense fallback={<CircularProgress style={{ color: "#663399" }} />}>
                        <SpeedDistChart data={benchmarks} />
                    </Suspense>
                </div>
            </ChartContainer>

            <TableContainer isMobile={isMobile} style={{ 
                borderRadius: "10px", 
                display: "flex", 
                flexDirection: "column", 
                alignItems: "center", 
                justifyContent: "center",
                minHeight: "400px"
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
                    <div style={{ paddingBottom: "50px" }}>
                        <Suspense fallback={<CircularProgress style={{ color: "#663399" }} />}>
                            <RawCloudTable benchmarks={benchmarks} />
                        </Suspense>
                    </div>
                </div>
            </TableContainer>

            {dataReady && (
                <ChartContainer isMobile={isMobile} style={{ borderRadius: "10px" }}>
                    <h4>📈 Time Series 📈</h4>
                    <Suspense fallback={<CircularProgress style={{ color: "#663399" }} />}>
                        <TimeSeriesChart data={benchmarks} />
                    </Suspense>
                </ChartContainer>
            )}
        </MainContainer>
    );
};

export default CloudBenchmarks;