// LocalBenchmarks.tsx
import { useState, useEffect, FC } from 'react';
import Head from 'next/head';
import SpeedGpuScatterChart from '../components/charts/local/SpeedGpuScatterChart';
import RawLocalTable from '../components/tables/local/RawLocalTable';
import ComparisonTable from '../components/tables/local/ComparisonTable';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { Box } from '@mui/material';
import { FastestFrameworks } from '../utils/transformations';
import { MainContainer } from '../components/design-system/components';
import { calculateMB } from '../utils/stats';
import { LocalBenchmark } from '../types/LocalData';
import {
    LoadingContainer,
    StyledCircularProgress,
    CenteredContentContainer,
    PageTitle,
    StyledDescriptionSection,
    StyledChartContainer,
    StyledTableContainer,
    SectionHeader,
    FlexContainer,
    FlexItem,
    LeaderboardContainer,
    ChartWrapper,
    TableContentContainer,
} from '../components/StyledComponents';

const LocalBenchmarks: FC = () => {
    const theme = useTheme();
    const [benchmarks, setBenchmarks] = useState<LocalBenchmark[]>([]);
    const [comparisonData, setComparisonData] = useState<any[]>([]);
    const [fastestFrameworks, setFastestFrameworks] = useState<FastestFrameworks>({});
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const filteredBenchmarks = benchmarks.filter(benchmark => benchmark.gpu_mem_usage > 1);
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    useEffect(() => {
        const fetchLocalBenchmarks = async () => {
            try {
                const res = await fetch(`/api/local`);
                const response = await res.json();
                
                // Use preprocessed data directly from API response
                const data: LocalBenchmark[] = response.raw;
                const comparisonResults = response.comparison;
                const fastestFrameworks = response.fastestFrameworks;
                
                console.log(`local: raw size: ${calculateMB(data)} MB`);
                console.log(`local: comparison size: ${calculateMB(comparisonResults)} MB`);
                console.log(`local: fastest frameworks size: ${calculateMB(fastestFrameworks)} MB`);
                
                setBenchmarks(data);
                setComparisonData(comparisonResults);
                setFastestFrameworks(fastestFrameworks);
                setLoading(false);
            } catch (err: any) {
                setError(err.toString());
                setLoading(false);
            }
        };
        fetchLocalBenchmarks();
    }, []);

    if (loading) {
        console.log('Rendering loading state');
        return (
            <LoadingContainer>
                <StyledCircularProgress size={80} />
            </LoadingContainer>
        );
    }

    if (error) {
        console.log('Rendering error state:', error);
        return <div>Error: {error}</div>;
    }

    console.log('Rendering main content');
    return (
        <>
            <Head>
                <title>Local LLM Benchmarks - M3 Max Performance Testing</title>
                <meta name="description" content="Local LLM benchmarks on Apple M3 Max with 128GB RAM. Compare frameworks like transformers, GGUF, and HF-TGI for speed and GPU usage." />
            </Head>
            <MainContainer isMobile={isMobile}>
                <StyledDescriptionSection isMobile={isMobile}>
                    <CenteredContentContainer>
                        <PageTitle>🖥️ Local Benchmarks 🖥️</PageTitle>
                    <p>
                        These are results from running local benchmarks on my Apple M3 Max MacBook Pro (14-inch, Nov 2023)
                        with 128GB RAM and 40-core GPU. All models were run with the same hardware and settings to ensure
                        fair comparisons.
                    </p>
                    <p>
                        The scatter plot shows the relationship between GPU memory usage and generation speed,
                        while the leaderboard tables highlight the fastest frameworks for different model sizes.
                    </p>
                </CenteredContentContainer>
            </StyledDescriptionSection>

            <StyledChartContainer isMobile={isMobile}>
                <SectionHeader>📊 GPU Memory vs Speed 📊</SectionHeader>
                <ChartWrapper>
                    <SpeedGpuScatterChart
                        isMobile={isMobile}
                        data_tf={filteredBenchmarks.filter(benchmark => benchmark.framework === 'transformers')}
                        data_gguf={filteredBenchmarks.filter(benchmark => benchmark.framework === 'gguf')}
                        data_hftgi={filteredBenchmarks.filter(benchmark => benchmark.framework === 'hf-tgi')}
                        data_vllm={filteredBenchmarks.filter(benchmark => benchmark.framework === 'vllm')}
                    />
                </ChartWrapper>
            </StyledChartContainer>

            <StyledTableContainer isMobile={isMobile}>
                <SectionHeader>🏆 Framework Leaderboards 🏆</SectionHeader>
                <FlexContainer isMobile={isMobile}>
                    <FlexItem isMobile={isMobile}>
                        <LeaderboardContainer>
                            <h3>🥇 Fastest by Model Size</h3>
                            <ComparisonTable comparisonData={comparisonData} />
                        </LeaderboardContainer>
                    </FlexItem>
                    <FlexItem isMobile={isMobile}>
                        <LeaderboardContainer>
                            <h3>⚡ Fastest Frameworks Overall</h3>
                            <div>
                                {Object.entries(fastestFrameworks).map(([category, winner]) => (
                                    <div key={category} style={{ marginBottom: '8px' }}>
                                        <strong>{category}:</strong> {winner}
                                    </div>
                                ))}
                            </div>
                        </LeaderboardContainer>
                    </FlexItem>
                </FlexContainer>
            </StyledTableContainer>

            <StyledTableContainer isMobile={isMobile}>
                <SectionHeader>📚 Full Results 📚</SectionHeader>
                <TableContentContainer isMobile={isMobile}>
                    <Box sx={{ pb: 8 }}>
                        <RawLocalTable benchmarks={benchmarks} />
                    </Box>
                </TableContentContainer>
            </StyledTableContainer>
            </MainContainer>
        </>
    );
};

export default LocalBenchmarks;