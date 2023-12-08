// CloudBenchmarks.js
import React, { useState, useEffect } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import { MainContainer, DescriptionSection, lightPurpleTheme, darkTheme } from '../theme';
import RawCloudTable from '../tables/RawCloudTable';
import { transformCloud } from '../transformations';

const CloudBenchmarks = () => {
    const [benchmarks, setBenchmarks] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    // Dark Mode
    const [darkMode] = useState(false);
    const theme = darkMode ? darkTheme : lightPurpleTheme;

    useEffect(() => {
        const fetchCloudBenchmarks = async () => {
            try {
                const res = await fetch("https://llm-bench-back.fly.dev/api/cloudBenchmarks");
                let data = await res.json();
                // Clean up and remove duplicates
                data = transformCloud(data);
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
        <MainContainer>
            <DescriptionSection>
                <h1 style={{ textAlign: "center" }}>⚡️ Cloud Benchmarks ⚡️</h1>
                <div style={{ textAlign: "center" }}>
                    ** UNDER CONSTRUCTION **
                    <div style={{
                        height: '550px',
                        overflow: 'auto',
                        padding: '20px',
                        maxWidth: '550px',
                        margin: 'auto',
                    }}>
                        <RawCloudTable
                            benchmarks={benchmarks}
                            darkMode={darkMode}
                        />
                    </div>
                </div>
            </DescriptionSection>
        </MainContainer>
    );
}

export default CloudBenchmarks;