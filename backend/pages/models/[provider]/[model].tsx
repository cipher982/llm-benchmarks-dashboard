import React, { useMemo, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import type { GetStaticPaths, GetStaticProps, NextPage } from "next";
import { Typography, Box, Button } from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ModelPageLayout from "../../../components/model/ModelPageLayout";
import Section from "../../../components/model/Section";
import MetricSummaryGrid from "../../../components/model/MetricSummaryGrid";
import PageBreadcrumbs from "../../../components/model/PageBreadcrumbs";
import FAQAccordion from "../../../components/model/FAQAccordion";
import RelatedLinks from "../../../components/model/RelatedLinks";
import ModelMetricTable from "../../../components/model/ModelMetricTable";
import InsightList from "../../../components/model/InsightList";
import DeprecationBanner from "../../../components/model/DeprecationBanner";
import SpeedDistChart from "../../../components/charts/cloud/SpeedDistChart";
import TimeSeriesChart from "../../../components/charts/cloud/TimeSeries";
import { buildModelSeoMetadata } from "../../../utils/seoUtils";
import { getFeaturedStaticPaths, getModelPageData } from "../../../utils/modelService";
import { getProviderWebsite } from "../../../utils/providerMetadata";
import type { ModelPageData, ProviderModelEntry } from "../../../types/ModelPages";
import type { SeoMetadata } from "../../../utils/seoUtils";
import type { SpeedDistributionPoint, TimeSeriesData } from "../../../types/ProcessedData";

// Lifecycle statuses that warrant showing a warning banner
const BANNER_STATUSES = new Set(['deprecated', 'likely_deprecated', 'stale', 'failing', 'disabled', 'never_succeeded']);

interface ModelDetailPageProps {
    data: ModelPageData;
    seo: SeoMetadata;
}

const formatNumber = (value: number | null | undefined, digits = 2) => {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return "--";
    }
    return Number(value).toFixed(digits);
};

const formatTimestamp = (value?: string) => {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "--";
    return date.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

// Transform ModelSpeedDistribution to SpeedDistributionPoint array for chart
const transformSpeedDistribution = (data: ModelPageData): SpeedDistributionPoint[] => {
    if (!data.speedDistribution) return [];
    return [{
        provider: data.provider,
        model_name: data.speedDistribution.modelName,
        display_name: data.speedDistribution.displayName,
        density_points: data.speedDistribution.densityPoints,
        mean_tokens_per_second: data.speedDistribution.meanTokensPerSecond,
        min_tokens_per_second: data.speedDistribution.minTokensPerSecond,
        max_tokens_per_second: data.speedDistribution.maxTokensPerSecond,
    }];
};

// Transform ModelTimeSeries to TimeSeriesData for chart
const transformTimeSeries = (data: ModelPageData): TimeSeriesData | null => {
    if (!data.timeSeries) return null;
    return {
        timestamps: data.timeSeries.timestamps,
        models: [{
            model_name: data.timeSeries.modelName,
            display_name: data.timeSeries.displayName,
            providers: data.timeSeries.providers.map(p => ({
                provider: p.provider,
                providerCanonical: p.providerCanonical || p.provider,
                values: p.values.map(v => v ?? 0), // Convert null to 0
                deprecated: p.deprecated,
                deprecation_date: p.deprecation_date,
                last_benchmark_date: p.last_benchmark_date,
                successor_model: p.successor_model,
            })),
        }],
    };
};

const buildFaq = (data: ModelPageData) => [
    {
        question: `How fast is ${data.displayName}?`,
        answer: `The latest rolling average throughput is ${formatNumber(data.summary.tokensPerSecondMean)} tokens per second with an average time to first token of ${formatNumber((data.summary.timeToFirstTokenMean ?? 0) * 1000)} ms across ${data.summary.runCount} recent runs.`,
    },
    {
        question: "How often are these benchmarks updated?",
        answer: `Benchmarks refresh automatically whenever the monitoring cron runs. The most recent run completed on ${formatTimestamp(data.summary.latestRunAt)}.`,
    },
];

const buildRelatedLinks = (providerSlug: string, related: ProviderModelEntry[], alternatives: ProviderModelEntry[]) => {
    const links = related.slice(0, 4).map((entry) => ({
        title: entry.displayName,
        description: "Sibling model from the same provider",
        href: `/models/${providerSlug}/${entry.modelSlug}`,
    }));

    const alternativeLinks = alternatives.slice(0, 2).map((entry) => ({
        title: `${entry.displayName} (${entry.provider})`,
        description: "Comparable model from another provider",
        href: `/models/${entry.providerSlug}/${entry.modelSlug}`,
    }));

    return [...links, ...alternativeLinks];
};

const ModelDetailPage: NextPage<ModelDetailPageProps> = ({ data, seo }) => {
    const providerWebsite = getProviderWebsite(data.providerCanonical);
    const showBanner = data.lifecycleStatus && BANNER_STATUSES.has(data.lifecycleStatus);
    const robotsContent = data.shouldNoIndex ? "noindex,follow" : "index,follow";

    const metrics = useMemo(
        () => [
            { label: "Avg Tokens / Second", value: formatNumber(data.summary.tokensPerSecondMean) },
            { label: "Avg Time to First Token (ms)", value: formatNumber((data.summary.timeToFirstTokenMean ?? 0) * 1000) },
            { label: "Runs Analysed", value: `${data.summary.runCount}` },
            { label: "Last Updated", value: formatTimestamp(data.summary.latestRunAt) },
        ],
        [data.summary]
    );

    const breadcrumbs = [
        { label: "Home", href: "/" },
        { label: "Cloud Benchmarks", href: "/cloud" },
        { label: data.provider },
        { label: data.displayName },
    ];

    const faqItems = useMemo(() => buildFaq(data), [data]);
    const relatedLinks = useMemo(
        () => buildRelatedLinks(data.providerSlug, data.relatedModels, data.alternatives),
        [data.providerSlug, data.relatedModels, data.alternatives]
    );

    const insights = useMemo(() => {
        const items: string[] = [];
        if (data.summary.tokensPerSecondMean) {
            items.push(
                `${data.displayName} streams at ${formatNumber(data.summary.tokensPerSecondMean)} tokens/second on average across the last ${data.summary.runCount} benchmark runs.`
            );
        }
        if (data.summary.tokensPerSecondMax && data.summary.tokensPerSecondMin) {
            const spread = data.summary.tokensPerSecondMax - data.summary.tokensPerSecondMin;
            const mean = data.summary.tokensPerSecondMean || 0;
            if (!Number.isNaN(spread) && mean > 0) {
                const variability = ((spread / mean) * 100).toFixed(1);
                items.push(`Performance fluctuated by ${formatNumber(spread)} tokens/second (${variability}% coefficient of variation), indicating ${parseFloat(variability) < 20 ? 'consistent' : 'variable'} behavior across benchmark runs.`);
            }
        }
        if (data.summary.timeToFirstTokenMean) {
            const ttft = data.summary.timeToFirstTokenMean * 1000; // Convert to ms
            const latencyRating = ttft < 500 ? "excellent" : ttft < 1000 ? "good" : ttft < 2000 ? "moderate" : "high";
            items.push(`Average time to first token is ${formatNumber(ttft)} ms (${latencyRating} latency), ${latencyRating === "excellent" || latencyRating === "good" ? "suitable" : "consider alternatives"} for latency-sensitive workloads.`);
        }

        // Add comparison with related models
        if (data.relatedModels.length > 0 && data.summary.tokensPerSecondMean) {
            const relatedSpeeds = data.relatedModels
                .filter(m => m.tokensPerSecondMean)
                .map(m => m.tokensPerSecondMean!);
            if (relatedSpeeds.length > 0) {
                const avgRelated = relatedSpeeds.reduce((a, b) => a + b, 0) / relatedSpeeds.length;
                const comparison = data.summary.tokensPerSecondMean > avgRelated ? "faster" : "slower";
                const diff = Math.abs(((data.summary.tokensPerSecondMean - avgRelated) / avgRelated) * 100).toFixed(1);
                items.push(`This model performs ${diff}% ${comparison} than the average of other ${data.provider} models (${formatNumber(avgRelated)} tok/s).`);
            }
        }

        items.push(`Latest measurements completed on ${formatTimestamp(data.summary.latestRunAt)} based on ${data.summary.sampleCount} total samples.`);
        return items;
    }, [data]);

    const providerHubHref = `/providers/${data.providerSlug}`;

    useEffect(() => {
        if (typeof window === "undefined") return;
        const tracker = (window as unknown as { umami?: { track?: (event: string, payload?: Record<string, unknown>) => void } })
            .umami?.track;
        if (tracker) {
            tracker("model_page_view", {
                provider: data.provider,
                model: data.model,
            });
        }
    }, [data.provider, data.model]);

    return (
        <>
            <Head>
                <title>{seo.title}</title>
                <meta name="description" content={seo.description} />
                <meta name="keywords" content={seo.keywords} />
                <meta name="robots" content={robotsContent} />
                <link rel="canonical" href={seo.canonical} />
                <meta property="og:title" content={seo.openGraph.title} />
                <meta property="og:description" content={seo.openGraph.description} />
                <meta property="og:type" content={seo.openGraph.type} />
                <meta property="og:url" content={seo.openGraph.url} />
                <meta name="twitter:card" content={seo.twitter.card} />
                <meta name="twitter:title" content={seo.twitter.title} />
                <meta name="twitter:description" content={seo.twitter.description} />
                {seo.jsonLd && (
                    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(seo.jsonLd) }} />
                )}
            </Head>
            <ModelPageLayout
                title={`${data.displayName} Benchmarks`}
                subtitle={`Provider: ${data.provider}`}
                intro={
                    <>
                        <Typography variant="body1" paragraph>
                            Explore real-world latency and throughput results for {data.displayName}. These measurements come from
                            automated benchmarking runs against the provider APIs using the same harness that powers the public
                            cloud dashboard.
                        </Typography>
                        <Typography variant="body1" color="text.secondary" paragraph>
                            Want a broader view of this vendor? Visit the {" "}
                            <Link href={providerHubHref} style={{ color: "inherit", textDecoration: "underline" }}>
                                {data.provider} provider hub
                            </Link>{" "}
                            to compare every tracked model side-by-side.
                        </Typography>
                        {providerWebsite && (
                            <Box sx={{ mt: 2 }}>
                                <Button
                                    variant="outlined"
                                    color="primary"
                                    href={providerWebsite}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    endIcon={<OpenInNewIcon />}
                                    sx={{ textTransform: "none" }}
                                >
                                    Visit {data.provider} Official Website
                                </Button>
                            </Box>
                        )}
                    </>
                }
                breadcrumbs={<PageBreadcrumbs items={breadcrumbs} />}
            >
                {showBanner && (
                    <DeprecationBanner
                        modelName={data.displayName}
                        status={data.lifecycleStatus!}
                        lastUpdated={data.summary.latestRunAt}
                    />
                )}
                <Section title="Benchmark Overview">
                    <MetricSummaryGrid items={metrics} />
                </Section>
                <Section title="Key Insights">
                    <InsightList items={insights} />
                </Section>
                {data.speedDistribution && (
                    <Section title="Performance Distribution">
                        <Typography variant="body2" color="text.secondary" paragraph>
                            Distribution of throughput measurements showing performance consistency across benchmark runs.
                        </Typography>
                        <Box sx={{ width: "100%", height: 600 }}>
                            <SpeedDistChart data={transformSpeedDistribution(data)} />
                        </Box>
                    </Section>
                )}
                {data.timeSeries && (
                    <Section title="Performance Over Time">
                        <Typography variant="body2" color="text.secondary" paragraph>
                            Historical performance trends showing how throughput has changed over the benchmarking period.
                        </Typography>
                        <TimeSeriesChart
                            data={transformTimeSeries(data)!}
                            selectedDays={30}
                            onTimeRangeChange={undefined}
                        />
                    </Section>
                )}
                <Section title="Benchmark Samples">
                    <ModelMetricTable rows={data.tableRows} />
                </Section>
                <Section title="Frequently Asked Questions">
                    <FAQAccordion items={faqItems} />
                </Section>
                <Section title="Related Links">
                    <RelatedLinks items={relatedLinks} />
                </Section>
            </ModelPageLayout>
        </>
    );
};

export const getStaticPaths: GetStaticPaths = async () => {
    try {
        const paths = await getFeaturedStaticPaths();
        return { paths, fallback: "blocking" };
    } catch (error) {
        console.error("Failed to build static paths for model pages", error);
        return { paths: [], fallback: "blocking" };
    }
};

export const getStaticProps: GetStaticProps<ModelDetailPageProps> = async ({ params }) => {
    const providerSlug = params?.provider as string;
    const modelSlug = params?.model as string;

    if (!providerSlug || !modelSlug) {
        return { notFound: true, revalidate: 600 };
    }

    const data = await getModelPageData(providerSlug, modelSlug);
    if (!data) {
        return { notFound: true, revalidate: 600 };
    }

    const seo = buildModelSeoMetadata({
        providerName: data.provider,
        providerSlug: data.providerSlug,
        modelName: data.model,
        modelSlug: data.modelSlug,
        displayName: data.displayName,
        summary: {
            tokensPerSecondMean: data.summary.tokensPerSecondMean,
            timeToFirstTokenMean: data.summary.timeToFirstTokenMean,
            runCount: data.summary.runCount,
            latestRunAt: data.summary.latestRunAt,
        },
    });

    return {
        props: {
            data: JSON.parse(JSON.stringify(data)),
            seo,
        },
        revalidate: 1800,
    };
};

export default ModelDetailPage;
