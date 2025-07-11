// LocalBenchmarks.tsx
import { useState, useEffect, FC } from 'react';
import SpeedGpuScatterChart from '../charts/local/SpeedGpuScatterChart';
import RawLocalTable from '../tables/local/RawLocalTable';
import ComparisonTable from '../tables/local/ComparisonTable';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { FastestFrameworks, getComparisonAndFastestFrameworks } from '../transformations';
import { MainContainer } from '../styles';
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



// interface LocalBenchmarksState {
//     benchmarks: LocalBenchmark[];
//     comparisonData: any[]; // consider adding a type
//     fastestFrameworks: FastestFrameworks;
//     error: string | null;
//     loading: boolean;
// }

const LocalBenchmarks: FC = () => {
    // console.log('Component rendering');
    const theme = useTheme();
    const [benchmarks, setBenchmarks] = useState<LocalBenchmark[]>([]);
    const [comparisonData, setComparisonData] = useState<any[]>([]); // Consider defining a more specific type
    const [fastestFrameworks, setFastestFrameworks] = useState<FastestFrameworks>({});
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    // console.log('Current state:', { loading, error, benchmarksLength: benchmarks.length });
    const filteredBenchmarks = benchmarks.filter(benchmark => benchmark.gpu_mem_usage > 1);
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    useEffect(() => {
        // Fetch local benchmarks
        const fetchLocalBenchmarks = async () => {
            try {
                if (!process.env.REACT_APP_API_URL) {
                    throw new Error("REACT_APP_API_URL environment variable is not set");
                }
                const apiUrl = process.env.REACT_APP_API_URL;
                const res = await fetch(`${apiUrl}/api/local`);
                const response = await res.json();
                const data: LocalBenchmark[] = response.raw; // Extract the raw array from the response
                // console.log('Received data:', data);
                console.log(`local: size: ${calculateMB(data)} MB`);
                const { comparisonResults, fastestFrameworks } = getComparisonAndFastestFrameworks(data);
                // console.log('Transformed data:', { comparisonResults, fastestFrameworks });
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

    // Loading spinner
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
    // Render the local benchmarks page
    return (
        <MainContainer isMobile={isMobile}>
            <StyledDescriptionSection isMobile={isMobile}>
                <CenteredContentContainer>
                    <PageTitle>⚡️ LLM Benchmarks ⚡️</PageTitle>
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
                        The dashboard is built with React and Node.
                        The backend pulls from MongoDB to store all the results in present them in real-time.
                    </p>
                    <h3>System Specs ⚡️</h3>
                    <p>GPU: NVIDIA RTX 3090</p>
                    <p>CPU: Intel Core i9-12900K</p>
                </CenteredContentContainer>
            </StyledDescriptionSection>
            <StyledTableContainer isMobile={isMobile}>
                <CenteredContentContainer>
                    <SectionHeader>🏆 Comparisons 🏆</SectionHeader>
                    <p>
                        I try and compare frameworks with similar model support. GGUF/llama-cpp has specialized conversion
                        scripts for some models, but not nearly as wide of support as Transformers/HF based models.
                        I am in the process of adding in GGUF to help make better comparisons.
                    </p>
                    <p>
                        Another issue is the difference in quantization methods and accuracy. vLLM, Transformers, and HF-TGI
                        all share a similar quantization method (bitsandbytes) so they can be compared more easily. GGUF has
                        so many quant levels that it is hard to compare to the others. So for now I just have no quantization
                        for this comparison.
                    </p>
                </CenteredContentContainer>
                <FlexContainer isMobile={isMobile}>
                    <FlexItem flex={0.35} isMobile={isMobile}>
                        <LeaderboardContainer>
                            <SectionHeader>Leaderboard</SectionHeader>
                        {
                            ["🥇 1st", "🥈 2nd", "🥉 3rd"].map((place, index) => {
                                const [framework = "transformers", score = "0"] = Object.entries(fastestFrameworks)[index] || [];
                                return (
                                    <p key={index}>{`${place}: ${framework} (${score})`}</p>
                                );
                            })
                        }
                        </LeaderboardContainer>
                    </FlexItem>
                    <FlexItem flex={0.65} isMobile={isMobile}>
                        <SectionHeader>Comparison Table</SectionHeader>
                        <ComparisonTable comparisonData={comparisonData} />
                    </FlexItem>
                </FlexContainer>
            </StyledTableContainer>

            <StyledChartContainer isMobile={isMobile}>
                <CenteredContentContainer>
                    <SectionHeader>📊 Charts 📊</SectionHeader>
                    <h4>GPU Usage vs Tokens/Second</h4>
                    <p>
                        Some frameworks enable batching multiple requests more easily by loading multiple
                        sets of model weights, hence the GPU usage weirdness on the right side of this graph.
                    </p>
                </CenteredContentContainer>
                {benchmarks.length > 0 && (
                    <ChartWrapper isMobile={isMobile}>
                        <SpeedGpuScatterChart
                            isMobile={isMobile}
                            data_tf={filteredBenchmarks.filter(benchmark => benchmark.framework === 'transformers')}
                            data_gguf={filteredBenchmarks.filter(benchmark => benchmark.framework === 'gguf')}
                            data_hftgi={filteredBenchmarks.filter(benchmark => benchmark.framework === 'hf-tgi')}
                            data_vllm={filteredBenchmarks.filter(benchmark => benchmark.framework === 'vllm')}
                        />
                    </ChartWrapper>
                )}
            </StyledChartContainer>

            <StyledTableContainer isMobile={isMobile}>
                <SectionHeader>📚 Full Results 📚</SectionHeader>
                <TableContentContainer isMobile={isMobile}>
                    <div style={{ paddingBottom: '50px' }}>
                        <RawLocalTable benchmarks={benchmarks} />
                    </div>
                </TableContentContainer>
            </StyledTableContainer>
        </MainContainer>
    );
}

export default LocalBenchmarks;