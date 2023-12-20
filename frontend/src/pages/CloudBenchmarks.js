// CloudBenchmarks.js
import React, { useState, useEffect } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import { useMediaQuery } from '@mui/material';
import { MainContainer, DescriptionSection, ChartContainer, lightPurpleTheme, darkTheme, TableContainer } from '../theme';
import RawCloudTable from '../tables/cloud/RawCloudTable';
import SpeedDistChart from '../charts/cloud/SpeedDistChart';
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
                <h1 style={{ textAlign: "center" }}>☁️ Cloud Benchmarks ☁️</h1>
                <div style={{ textAlign: "center" }}>
                    <h4>New models being added daily 😊</h4>
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

            <TableContainer>
                <h4>📚 Full Results 📚</h4>
                <div style={{
                    height: '800px',
                    overflow: 'auto',
                    paddingLeft: isMobile ? "0px" : "20px",
                    paddingRight: isMobile ? "0px" : "20px",
                    maxWidth: isMobile ? '100%' : '800px',
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