// CloudBenchmarks.tsx
import React, { useState, useEffect } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import { useMediaQuery } from '@mui/material';
import { MainContainer, DescriptionSection, ChartContainer, TableContainer } from '../styles';
import RawCloudTable from '../tables/cloud/RawCloudTable';
import SpeedDistChart from '../charts/cloud/SpeedDistChart';
import TimeSeriesChart from '../charts/cloud/TimeSeries';
import { calculateMB } from '../utils/stats';
import { mapModelNames } from '../utils/modelMapping';
import { CloudBenchmark } from '../types/CloudData';

const CloudBenchmarks: React.FC = () => {
    const [benchmarks, setBenchmarks] = useState<CloudBenchmark[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const isMobile = useMediaQuery('(max-width:500px)');

    useEffect(() => {
        const fetchCloudBenchmarks = async () => {
            try {
                const res = await fetch("https://llm-benchmarks-backend.vercel.app/api/cloud");
                let data: CloudBenchmark[] = await res.json();
                console.log(`cloud: size: ${calculateMB(data)} MB`);

                const mappedData = mapModelNames(data);

                setBenchmarks(mappedData);
                setLoading(false);
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
                <div style={{ maxWidth: '1100px', maxHeight: '600px', width: '100%', height: '100%', margin: 'auto', paddingBottom: '0px' }}>
                    <SpeedDistChart
                        data={benchmarks}
                    // isMobile={isMobile} 
                    />
                </div>
            </ChartContainer>

            <TableContainer isMobile={isMobile} style={{ borderRadius: "10px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
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
                        <RawCloudTable benchmarks={benchmarks} />
                    </div>
                </div>
            </TableContainer>

            <ChartContainer isMobile={isMobile} style={{ borderRadius: "10px" }}>
                <h4>📈 Time Series 📈</h4>
                <TimeSeriesChart data={benchmarks} />
            </ChartContainer>
        </MainContainer>
    );
};

export default CloudBenchmarks;