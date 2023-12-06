// CloudBenchmarks.js
import React, { useState, useEffect } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import { MainContainer, DescriptionSection, lightPurpleTheme, darkTheme } from './theme';

const CloudBenchmarks = () => {
    const [benchmarks, setBenchmarks] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    // Dark Mode
    const [darkMode, setDarkMode] = useState(false);
    const toggleDarkMode = () => {
        setDarkMode(prevDarkMode => !prevDarkMode);
    };
    const theme = darkMode ? darkTheme : lightPurpleTheme;

    useEffect(() => {
        // Fetch cloud benchmarks
        const fetchCloudBenchmarks = async () => {
            try {
                const res = await fetch("https://llm-bench-back.fly.dev/api/cloudBenchmarks");
                const data = await res.json();
                // Set the cloud data
                setBenchmarks(data);
                setLoading(false);
            } catch (err) {
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
                    ** COMING SOON **
                </p>
            </DescriptionSection>
        </MainContainer>
    );
}

export default CloudBenchmarks;