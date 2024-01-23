// CloudBenchmarks.js
import React, { useState, useEffect } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import { useMediaQuery } from '@mui/material';
import { MainContainer, DescriptionSection, ChartContainer, lightPurpleTheme, darkTheme, TableContainer } from '../theme';
import RawCloudTable from '../tables/cloud/RawCloudTable';
import SpeedDistChart from '../charts/cloud/SpeedDistChart';
import SpeedCompareChart from '../charts/cloud/SpeedCompareChart';
import { aggregateAndCalcMetrics } from '../transformations';

const CloudBenchmarks = () => {
    const [benchmarks, setBenchmarks] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const isMobile = useMediaQuery('(max-width:500px)');

    // Dark Mode
    const [darkMode] = useState(false);
    const theme = darkMode ? darkTheme : lightPurpleTheme;

    useEffect(() => {
        const fetchCloudBenchmarks = async () => {
            try {
                const res = await fetch("https://llm-bench-back.fly.dev/api/cloudBenchmarks");
                let data = await res.json();
                console.log("Fetched data length:", data.length);
                data = aggregateAndCalcMetrics(data); // aggregation and metric calculation
                console.log("Transformed data length:", data.length);
                setBenchmarks(data);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching data:", err);
                setError(err.toString());
                setLoading(false);
            }
        };
        fetchCloudBenchmarks();
    }, []);

    if (loading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
                <CircularProgress />
            </div>
        );
    }
    if (error) return <div>Error: {error}</div>;

    return (
        <MainContainer isMobile={isMobile}>
            <DescriptionSection>
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

            <ChartContainer style={{ maxWidth: '100%', overflowX: 'auto' }}>
                <h4>📊 Speed Distribution 📊</h4>
                <div style={{ maxWidth: '850px', width: '100%', margin: 'auto', paddingBottom: '0px' }}>
                    <SpeedDistChart
                        data={benchmarks}
                        theme={theme}
                        isMobile={isMobile}
                    />
                </div>
            </ChartContainer>

            <ChartContainer style={{ maxWidth: '100%', overflowX: 'auto' }}>

                <h4>🦙 Some Comparisons! 🦙</h4>
                <div style={{ maxWidth: '850px', width: '100%', margin: 'auto', paddingBottom: '0px' }}>
                    <SpeedCompareChart
                        data={benchmarks}
                        theme={theme}
                        isMobile={isMobile}
                    />
                </div>
            </ChartContainer>

            <TableContainer>
                <h4>📚 Full Results 📚</h4>
                <div style={{
                    height: '800px',
                    overflow: 'auto',
                    paddingLeft: isMobile ? "0px" : "20px",
                    paddingRight: isMobile ? "0px" : "20px",
                    maxWidth: isMobile ? '100%' : '850px',
                    margin: 'auto',
                    overflowX: 'auto'
                }}>
                    <RawCloudTable
                        benchmarks={benchmarks}
                        darkMode={darkMode}
                    />
                </div>
            </TableContainer>

        </MainContainer>
    );
}

export default CloudBenchmarks;