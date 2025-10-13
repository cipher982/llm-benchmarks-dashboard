import React, { useMemo, useEffect } from "react";
import Head from "next/head";
import type { GetStaticPaths, GetStaticProps, NextPage } from "next";
import ModelPageLayout from "../../components/model/ModelPageLayout";
import Section from "../../components/model/Section";
import MetricSummaryGrid from "../../components/model/MetricSummaryGrid";
import PageBreadcrumbs from "../../components/model/PageBreadcrumbs";
import RelatedLinks from "../../components/model/RelatedLinks";
import FAQAccordion from "../../components/model/FAQAccordion";
import ModelMetricTableWithLinks from "../../components/model/ModelMetricTableWithLinks";
import InsightList from "../../components/model/InsightList";
import { Typography, Button, Box } from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { getProviderModelInventory, getProviderPageData } from "../../utils/modelService";
import { buildProviderSeoMetadata } from "../../utils/seoUtils";
import { getProviderWebsite } from "../../utils/providerMetadata";
import type { ProviderPageData } from "../../types/ModelPages";
import type { SeoMetadata } from "../../utils/seoUtils";

interface ProviderPageProps {
    data: ProviderPageData;
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
    return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};

const ProviderPage: NextPage<ProviderPageProps> = ({ data, seo }) => {
    const providerWebsite = getProviderWebsite(data.providerCanonical);

    const metrics = useMemo(
        () => [
            { label: "Models Tracked", value: `${data.models.length}` },
            { label: "Median Tokens / Second", value: formatNumber(data.summary.tokensPerSecondMean) },
            { label: "Median Time to First Token (ms)", value: formatNumber(data.summary.timeToFirstTokenMean) },
            { label: "Last Updated", value: formatTimestamp(data.summary.latestRunAt) },
        ],
        [data]
    );

    const breadcrumbs = [
        { label: "Home", href: "/" },
        { label: "Cloud Benchmarks", href: "/cloud" },
        { label: data.provider },
    ];

    const modelLinks = data.models.slice(0, 12).map((model) => ({
        title: model.displayName,
        description: "View dedicated benchmark details",
        href: `/models/${model.providerSlug}/${model.modelSlug}`,
    }));

    const insights = useMemo(() => {
        const items: string[] = [];
        items.push(`${data.models.length} ${data.provider} models are actively benchmarked with ${data.summary.sampleCount} total measurements across ${data.summary.runCount} benchmark runs.`);

        if (data.fastestModels.length > 0 && data.fastestModels[0]?.tokensPerSecondMean) {
            const fastest = data.fastestModels[0];
            const slowest = data.fastestModels[data.fastestModels.length - 1];
            items.push(
                `${fastest.displayName} leads the fleet with ${formatNumber(fastest.tokensPerSecondMean)} tokens/second, while ${slowest?.displayName || 'the slowest model'} delivers ${formatNumber(slowest?.tokensPerSecondMean)} tok/s.`
            );

            if (slowest?.tokensPerSecondMean && fastest.tokensPerSecondMean) {
                const performanceRange = ((fastest.tokensPerSecondMean - slowest.tokensPerSecondMean) / slowest.tokensPerSecondMean * 100).toFixed(1);
                items.push(`Performance varies by ${performanceRange}% across the ${data.provider} model lineup, indicating diverse optimization strategies for different use cases.`);
            }
        }

        if (data.summary.timeToFirstTokenMean) {
            const ttft = data.summary.timeToFirstTokenMean;
            const latencyRating = ttft < 500 ? "excellent" : ttft < 1000 ? "good" : ttft < 2000 ? "moderate" : "high";
            items.push(`Median time to first token across the fleet is ${formatNumber(ttft)} ms, showing ${latencyRating} responsiveness for interactive applications.`);
        }

        // Calculate consistency across models
        if (data.models.length > 2) {
            const speeds = data.models
                .filter(m => m.tokensPerSecondMean)
                .map(m => m.tokensPerSecondMean!);
            if (speeds.length > 2) {
                const stdDev = Math.sqrt(speeds.reduce((sq, n) => sq + Math.pow(n - (data.summary.tokensPerSecondMean || 0), 2), 0) / speeds.length);
                const cv = ((stdDev / (data.summary.tokensPerSecondMean || 1)) * 100).toFixed(1);
                items.push(`The ${data.provider} model fleet shows ${parseFloat(cv) < 30 ? 'consistent' : 'varied'} performance characteristics (${cv}% variation coefficient), ${parseFloat(cv) < 30 ? 'indicating standardized infrastructure' : 'reflecting diverse model architectures'}.`);
            }
        }

        return items;
    }, [data]);

    const fastestTableRows = data.fastestModels.map((model) => ({
        provider: model.provider,
        modelName: model.displayName,
        providerSlug: model.providerSlug,
        modelSlug: model.modelSlug,
        tokensPerSecondMean: model.tokensPerSecondMean ?? 0,
        tokensPerSecondMin: model.tokensPerSecondMin ?? model.tokensPerSecondMean ?? 0,
        tokensPerSecondMax: model.tokensPerSecondMax ?? model.tokensPerSecondMean ?? 0,
        timeToFirstTokenMean: model.timeToFirstTokenMean ?? 0,
    }));

    const faqItems = [
        {
            question: `Which ${data.provider} model is fastest?`,
            answer:
                data.fastestModels.length > 0
                    ? `Based on recent tests, ${data.fastestModels[0].displayName} shows the highest average throughput among tracked ${data.provider} models.`
                    : `We are still collecting enough benchmark data to rank ${data.provider} models.`,
        },
        {
            question: "How many recent measurements feed this dashboard?",
            answer: `This provider summary aggregates ${data.summary.sampleCount} individual prompts measured across ${data.summary.runCount} monitoring runs over the past month.`,
        },
    ];

    useEffect(() => {
        if (typeof window === "undefined") return;
        const tracker = (window as unknown as { umami?: { track?: (event: string, payload?: Record<string, unknown>) => void } })
            .umami?.track;
        if (tracker) {
            tracker("provider_page_view", {
                provider: data.provider,
                modelsTracked: data.models.length,
            });
        }
    }, [data.provider, data.models.length]);

    return (
        <>
            <Head>
                <title>{seo.title}</title>
                <meta name="description" content={seo.description} />
                <meta name="keywords" content={seo.keywords} />
                <meta name="robots" content="index,follow" />
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
                title={`${data.provider} Provider Benchmarks`}
                subtitle={`Comprehensive performance summary covering ${data.models.length} models.`}
                intro={
                    <>
                        <Typography variant="body1" paragraph>
                            This provider hub highlights throughput and latency trends across every {data.provider} model monitored by
                            LLM Benchmarks. Use it to compare hosting tiers, track regressions, and discover the fastest variants in the
                            catalogue.
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
                <Section title="Provider Snapshot">
                    <MetricSummaryGrid items={metrics} />
                </Section>
                <Section title="Key Takeaways">
                    <InsightList items={insights} />
                </Section>
                <Section title="Fastest Models">
                    <ModelMetricTableWithLinks rows={fastestTableRows} />
                </Section>
                <Section title="All Models">
                    <Typography variant="body2" color="text.secondary" paragraph>
                        Complete list of all {data.provider} models tracked in the benchmark system. Click any model name to view detailed performance data.
                    </Typography>
                    <ModelMetricTableWithLinks rows={data.models.map((model) => ({
                        provider: model.provider,
                        modelName: model.displayName,
                        providerSlug: model.providerSlug,
                        modelSlug: model.modelSlug,
                        tokensPerSecondMean: model.tokensPerSecondMean ?? 0,
                        tokensPerSecondMin: model.tokensPerSecondMin ?? 0,
                        tokensPerSecondMax: model.tokensPerSecondMax ?? 0,
                        timeToFirstTokenMean: model.timeToFirstTokenMean ?? 0,
                    }))} />
                </Section>
                <Section title="Featured Models">
                    <RelatedLinks items={modelLinks} />
                </Section>
                <Section title="Frequently Asked Questions">
                    <FAQAccordion items={faqItems} />
                </Section>
            </ModelPageLayout>
        </>
    );
};

export const getStaticPaths: GetStaticPaths = async () => {
    try {
        const inventory = await getProviderModelInventory();
        const uniqueProviders = Array.from(new Map(inventory.map((entry) => [entry.providerSlug, entry])).values());
        const paths = uniqueProviders.map((entry) => ({ params: { provider: entry.providerSlug } }));
        return { paths, fallback: "blocking" };
    } catch (error) {
        console.error("Failed to build static paths for provider pages", error);
        return { paths: [], fallback: "blocking" };
    }
};

export const getStaticProps: GetStaticProps<ProviderPageProps> = async ({ params }) => {
    const providerSlug = params?.provider as string;
    if (!providerSlug) {
        return { notFound: true, revalidate: 600 };
    }

    const data = await getProviderPageData(providerSlug);
    if (!data) {
        return { notFound: true, revalidate: 600 };
    }

    const seo = buildProviderSeoMetadata({
        providerName: data.provider,
        providerSlug: data.providerSlug,
        summary: {
            tokensPerSecondMean: data.summary.tokensPerSecondMean,
            timeToFirstTokenMean: data.summary.timeToFirstTokenMean,
            modelCount: data.models.length,
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

export default ProviderPage;
