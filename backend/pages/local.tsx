/**
 * Local benchmarks.
 *
 * Same Console structure as `/cloud`, at the scale this page needs: a meter
 * strip of what was measured, the scatter, the leaderboards, then the full
 * table, with the hardware description as the closing note. The hardware is the
 * one thing here numbers genuinely cannot state, so it survives as prose — but
 * it belongs under the measurement, not above it.
 */

import { useState, useEffect, useMemo, FC } from 'react';
import Head from 'next/head';
import SpeedGpuScatterChart from '../components/charts/local/SpeedGpuScatterChart';
import RawLocalTable from '../components/tables/local/RawLocalTable';
import ComparisonTable from '../components/tables/local/ComparisonTable';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { FastestFrameworks } from '../utils/transformations';
import { MainContainer, MeterStrip } from '../components/design-system/components';
import { calculateMB } from '../utils/stats';
import { LocalBenchmark } from '../types/LocalData';
import { buildStaticPageSeoMetadata } from '../utils/seoUtils';
import { fmt } from '../utils/chartMath';
import {
    LoadingContainer,
    StyledCircularProgress,
    StyledDescriptionSection,
    StyledChartContainer,
    StyledTableContainer,
    SectionHeaderRow,
    SectionHeader,
    RailNote,
    ChartWrapper,
    TableContentContainer,
    EmptyState,
} from '../components/StyledComponents';

const localSeo = buildStaticPageSeoMetadata({
    path: '/local',
    title: 'Local LLM Benchmarks - M3 Max Performance Testing',
    description:
        'Local LLM benchmarks on Apple M3 Max with 128GB RAM. Compare frameworks like transformers, GGUF, and HF-TGI for speed and GPU usage.',
    keywords:
        'local LLM benchmarks, Apple M3 Max, GGUF benchmark, transformers benchmark, HF-TGI benchmark, GPU memory vs speed',
});

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

    const stats = useMemo(() => {
        const speeds = benchmarks.map((b) => b.tokens_per_second).filter((v) => Number.isFinite(v) && v > 0);
        const memory = benchmarks.map((b) => b.gpu_mem_usage).filter((v) => Number.isFinite(v) && v > 0);
        return {
            runs: benchmarks.length,
            models: new Set(benchmarks.map((b) => b.model_name)).size,
            frameworks: new Set(benchmarks.map((b) => b.framework)).size,
            fastest: speeds.length ? Math.max(...speeds) : 0,
            // `gpu_mem_usage` is already gigabytes — the scatter's x-axis plots
            // it against a 1–25 GB domain. Converting from bytes here printed
            // a confident 0.0.
            peakMemory: memory.length ? Math.max(...memory) : 0,
        };
    }, [benchmarks]);

    const seoHead = (
        <Head>
            <title>{localSeo.title}</title>
            <meta name="description" content={localSeo.description} />
            <meta name="keywords" content={localSeo.keywords} />
            <meta name="robots" content="index,follow" />
            <link rel="canonical" href={localSeo.canonical} />
            <meta property="og:title" content={localSeo.openGraph.title} />
            <meta property="og:description" content={localSeo.openGraph.description} />
            <meta property="og:type" content={localSeo.openGraph.type} />
            <meta property="og:url" content={localSeo.openGraph.url} />
            <meta name="twitter:card" content={localSeo.twitter.card} />
            <meta name="twitter:title" content={localSeo.twitter.title} />
            <meta name="twitter:description" content={localSeo.twitter.description} />
            {localSeo.jsonLd && (
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localSeo.jsonLd) }} />
            )}
        </Head>
    );

    if (loading) {
        return (
            <>
                {seoHead}
                <LoadingContainer>
                    <StyledCircularProgress size={40} aria-label="Loading local benchmarks" />
                </LoadingContainer>
            </>
        );
    }

    if (error) {
        return (
            <>
                {seoHead}
                <MainContainer isMobile={isMobile}>
                    <EmptyState $tone="bad">Local benchmarks unavailable · {error}</EmptyState>
                </MainContainer>
            </>
        );
    }

    return (
        <>
            {seoHead}
            <MainContainer isMobile={isMobile}>
                <h1 className="sr-only">Local LLM benchmarks</h1>

                <MeterStrip columns={5}>
                    <div>
                        <dt>Runs</dt>
                        <dd>{fmt.int(stats.runs)}</dd>
                    </div>
                    <div>
                        <dt>Models</dt>
                        <dd>{fmt.int(stats.models)}</dd>
                    </div>
                    <div>
                        <dt>Frameworks</dt>
                        <dd>{fmt.int(stats.frameworks)}</dd>
                    </div>
                    <div>
                        <dt>Fastest tok/s</dt>
                        <dd>{fmt.int(stats.fastest)}</dd>
                    </div>
                    <div>
                        <dt>Peak GPU mem</dt>
                        <dd>
                            {fmt.dec(stats.peakMemory, 1)}
                            <small>GB</small>
                        </dd>
                    </div>
                </MeterStrip>

                <StyledChartContainer isMobile={isMobile}>
                    <SectionHeaderRow>
                        <SectionHeader>GPU memory × speed</SectionHeader>
                        <RailNote>
                            <b>{filteredBenchmarks.length}</b> runs plotted
                        </RailNote>
                    </SectionHeaderRow>
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

                {/* Three winners used to sit in a 420px rail beside the
                    comparison table, leaving that rail empty for hundreds of
                    pixels while squeezing the table. A short full-width row
                    costs one strip and gives the table the whole width. */}
                {Object.keys(fastestFrameworks).length > 0 && (
                    <section>
                        <SectionHeaderRow>
                            <SectionHeader>Fastest framework overall</SectionHeader>
                        </SectionHeaderRow>
                        <MeterStrip columns={Math.max(Object.keys(fastestFrameworks).length, 2)}>
                            {Object.entries(fastestFrameworks).map(([category, winner]) => (
                                <div key={category}>
                                    <dt>{category}</dt>
                                    <dd style={{ fontSize: '14px' }}>{winner}</dd>
                                </div>
                            ))}
                        </MeterStrip>
                    </section>
                )}

                <StyledTableContainer isMobile={isMobile}>
                    <SectionHeaderRow>
                        <SectionHeader>Fastest by model size</SectionHeader>
                        <RailNote>
                            <b>{comparisonData.length}</b> models compared
                        </RailNote>
                    </SectionHeaderRow>
                    <TableContentContainer isMobile={isMobile}>
                        <ComparisonTable comparisonData={comparisonData} />
                    </TableContentContainer>
                </StyledTableContainer>

                <StyledTableContainer isMobile={isMobile}>
                    <SectionHeaderRow>
                        <SectionHeader>Full results</SectionHeader>
                        <RailNote>
                            <b>{benchmarks.length}</b> runs
                        </RailNote>
                    </SectionHeaderRow>
                    <TableContentContainer isMobile={isMobile}>
                        <RawLocalTable benchmarks={benchmarks} />
                    </TableContentContainer>
                </StyledTableContainer>

                <StyledDescriptionSection isMobile={isMobile}>
                    <p>
                        <b>Hardware.</b> Every run is on the same machine — an Apple M3 Max MacBook Pro (14-inch,
                        November 2023) with 128GB of unified memory and a 40-core GPU — with identical settings, so
                        differences between rows are differences between the model and the framework rather than
                        between machines.
                    </p>
                </StyledDescriptionSection>
            </MainContainer>
        </>
    );
};

export default LocalBenchmarks;
