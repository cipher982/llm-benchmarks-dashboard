// CloudBenchmarks.js
import React, { useState, useEffect } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import { MainContainer, DescriptionSection, lightPurpleTheme, darkTheme } from '../theme';
import RawCloudTable from '../tables/RawCloudTable';

const CloudBenchmarks = () => {
    const [benchmarks, setBenchmarks] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    // Dark Mode
    const [darkMode] = useState(false);
    const theme = darkMode ? darkTheme : lightPurpleTheme;

    useEffect(() => {
        // Fetch cloud benchmarks
        const fetchCloudBenchmarks = async () => {
            try {
                const res = await fetch("https://llm-bench-back.fly.dev/api/cloudBenchmarks");
                const data = await res.json();
                console.log("Fetched data:", data); // Log the fetched data
                // Set the cloud data
                setBenchmarks(data);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching data:", err); // Log any errors
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
                <p style={{ textAlign: "center" }}>
                    ** UNDER CONSTRUCTION **
                    <div style={{
                        height: '500px',
                        overflow: 'auto',
                        padding: '20px',
                        maxWidth: '500px',
                        margin: 'auto',
                    }}>
                        <RawCloudTable
                            benchmarks={benchmarks}
                            darkMode={darkMode}
                        />
                    </div>
                </p>
            </DescriptionSection>
        </MainContainer>
    );
}

export default CloudBenchmarks;