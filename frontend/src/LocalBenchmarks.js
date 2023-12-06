// LocalBenchmarks.js
import React, { useState, useEffect } from 'react';
import BenchScatterChart from './BenchScatterChart';
import BenchmarksTable from './BenchTable';
import ComparisonTable from './ComparisonTable';
import CircularProgress from '@mui/material/CircularProgress';
import { transformBenchmarks, getComparisonAndFastestFrameworks } from './transformations';
import { MainContainer, DescriptionSection, ChartContainer, TableContainer, lightPurpleTheme, darkTheme } from './theme';

const LocalBenchmarks = () => {
    const [benchmarks, setBenchmarks] = useState([]);
    const [comparisonData, setComparisonData] = useState([]);
    const [fastestFrameworks, setFastestFrameworks] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const filteredBenchmarks = benchmarks.filter(benchmark => benchmark.gpu_mem_usage > 1);

    // Dark Mode
    const [darkMode] = useState(false);
    const theme = darkMode ? darkTheme : lightPurpleTheme;

    useEffect(() => {
        // Fetch local benchmarks
        const fetchLocalBenchmarks = async () => {
            try {
                const res = await fetch("https://llm-bench-back.fly.dev/api/localBenchmarks");
                const data = await res.json();
                // Remove duplicates by pulling fastest run for each model
                const dedupedBenchmarksArray = transformBenchmarks(data);
                setBenchmarks(dedupedBenchmarksArray);
                // Get leaderboard/comparison data
                const { comparisonResults, fastestFrameworks } = getComparisonAndFastestFrameworks(dedupedBenchmarksArray);
                setComparisonData(comparisonResults);
                setFastestFrameworks(fastestFrameworks);
                setLoading(false);
            } catch (err) {
                setError(err.toString());
                setLoading(false);
            }
        };
        fetchLocalBenchmarks();
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
                <h1 style={{ textAlign: "center" }}>⚡️ LLM Benchmarks ⚡️</h1>
                <p>
                    This project aims to benchmark inference speeds for popular LLM frameworks in various configurations.
                    It uses a combination of docker containers and flask with various frameworks
                    (vLLM, Transformers, Text-Generation-Inference, llama-cpp) to automate the
                    benchmarks and then upload the results to the dashboard.
                    Most frameworks fetch the models from the HuggingFace Hub (most downloaded or trending)
                    and cache them to my server storage which allows them to be shared betweeen runs.
                    The exception is the llama-cpp/GGUF framework that requires specially compiled
                    model formats unique to the framework.
                </p>
                <p>
                    The dashboard is built with React and Node and is hosted through Vercel.
                    The backend pulls from MongoDB to store all the results.
                </p>
                <h3>System Specs ⚡️</h3>
                <p>GPU: NVIDIA RTX 3090</p>
                <p>CPU: Intel Core i9-12900K</p>
            </DescriptionSection>
            <TableContainer>
                <h3>🏆 Comparisons 🏆</h3>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{
                        flex: 0.3,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                    }}>
                        <h4>Leaderboard </h4>
                        {
                            ["🥇 1st", "🥈 2nd", "🥉 3rd"].map((place, index) => {
                                const [framework = "transformers", score = "0"] = Object.entries(fastestFrameworks)[index] || [];
                                return (
                                    <p key={index}>{`${place}: ${framework} (${score})`}</p>
                                );
                            })
                        }
                    </div>
                    <div style={{
                        flex: 0.8,
                        paddingRight: "20px",
                        paddingBottom: "20px",
                        maxWidth: '1100px',
                        margin: 'auto',
                    }}>
                        <h4>Comparison Table</h4>
                        <ComparisonTable comparisonData={comparisonData} />
                    </div>
                </div>
            </TableContainer>

            <ChartContainer>
                <h3>📊 Charts 📊</h3>
                <h4>GPU Usage vs Tokens/Second</h4>
                {benchmarks.length > 0 && (
                    <div style={{
                        maxWidth: '1200px',
                        margin: 'auto',
                    }}>
                        <BenchScatterChart
                            theme={theme}
                            data_tf={filteredBenchmarks.filter(benchmark => benchmark.framework === 'transformers')}
                            data_gguf={filteredBenchmarks.filter(benchmark => benchmark.framework === 'gguf')}
                            data_hftgi={filteredBenchmarks.filter(benchmark => benchmark.framework === 'hf-tgi')}
                            data_vllm={filteredBenchmarks.filter(benchmark => benchmark.framework === 'vllm')}
                        />
                    </div>
                )}
            </ChartContainer>

            <TableContainer>
                <h4>📚 Full Results 📚</h4>
                <div style={{
                    height: '500px',
                    overflow: 'auto',
                    padding: '20px',
                    maxWidth: '1100px',
                    margin: 'auto',
                }}>
                    <BenchmarksTable
                        benchmarks={benchmarks}
                        darkMode={darkMode}
                    />
                </div>
            </TableContainer>
        </MainContainer>
    );
}

export default LocalBenchmarks;