import React, { useMemo, useEffect } from "react";
import Head from "next/head";
import type { GetStaticPaths, GetStaticProps, NextPage } from "next";
import ModelPageLayout from "../../components/model/ModelPageLayout";
import Section from "../../components/model/Section";
import MetricSummaryGrid from "../../components/model/MetricSummaryGrid";
import PageBreadcrumbs from "../../components/model/PageBreadcrumbs";
import FAQAccordion from "../../components/model/FAQAccordion";
import ModelMetricTableWithLinks from "../../components/model/ModelMetricTableWithLinks";
import { Button } from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { getProviderModelInventory, getProviderPageData } from "../../utils/modelService";
import { buildProviderSeoMetadata } from "../../utils/seoUtils";
import { getProviderWebsite } from "../../utils/providerMetadata";
import { trackUmamiEvent } from "../../utils/analytics";
import { hasConfiguredMongoUri } from "../../utils/buildMode";
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
            { label: "Avg Tokens / Second", value: formatNumber(data.summary.tokensPerSecondMean) },
            { label: "Avg Time to First Token (ms)", value: formatNumber((data.summary.timeToFirstTokenMean ?? 0) * 1000) },
            { label: "Last Updated", value: formatTimestamp(data.summary.latestRunAt) },
        ],
        [data]
    );

    const breadcrumbs = [
        { label: "Home", href: "/" },
        { label: "Cloud Benchmarks", href: "/cloud" },
        { label: data.provider },
    ];

    // Every model once, fastest first. This replaced three overlapping
    // listings — a top-five table, a full table, and a grid of cards linking to
    // twelve of the same models.
    const allModelRows = useMemo(
        () =>
            [...data.models]
                .sort((a, b) => (b.tokensPerSecondMean ?? 0) - (a.tokensPerSecondMean ?? 0))
                .map((model) => ({
                    provider: model.provider,
                    modelName: model.displayName,
                    providerSlug: model.providerSlug,
                    modelSlug: model.modelSlug,
                    tokensPerSecondMean: model.tokensPerSecondMean ?? 0,
                    tokensPerSecondMin: model.tokensPerSecondMin ?? model.tokensPerSecondMean ?? 0,
                    tokensPerSecondMax: model.tokensPerSecondMax ?? model.tokensPerSecondMean ?? 0,
                    timeToFirstTokenMean: (model.timeToFirstTokenMean ?? 0) * 1000, // Convert to ms
                })),
        [data.models],
    );

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
            {/* The page opened with a title, a deck, a paragraph of hub copy and
                an outbound button — roughly a viewport before the first number.
                Then it listed the same inventory three times: "Fastest Models"
                (top five), "All Models" (everything), and "Featured Models"
                (cards linking to eight of them). "Key Takeaways" restated the
                snapshot and the table in sentences.

                Now: the measurements, then every model once, sorted fastest
                first, then the questions. The official-site link survives as a
                rail action because it is the one thing here the benchmark data
                cannot provide. */}
            <ModelPageLayout
                title={`${data.provider} Provider Benchmarks`}
                breadcrumbs={<PageBreadcrumbs items={breadcrumbs} />}
            >
                <Section title="Measured over the last 30 days">
                    <MetricSummaryGrid items={metrics} />
                </Section>
                <Section
                    title={`All ${data.provider} models`}
                    eyebrow={`${data.models.length} tracked · fastest first`}
                    actions={providerWebsite && (
                        <Button
                            variant="outlined"
                            size="small"
                            href={providerWebsite}
                            target="_blank"
                            rel="noopener noreferrer"
                            endIcon={<OpenInNewIcon />}
                            onClick={() => trackUmamiEvent('outbound_provider_click', {
                                provider: data.provider,
                                destination: providerWebsite,
                                source: 'provider_page',
                            })}
                        >
                            {data.provider} site
                        </Button>
                    )}
                >
                    <ModelMetricTableWithLinks rows={allModelRows} hideProvider />
                </Section>
                <Section title="Frequently Asked Questions">
                    <FAQAccordion items={faqItems} />
                </Section>
            </ModelPageLayout>
        </>
    );
};

export const getStaticPaths: GetStaticPaths = async () => {
    if (!hasConfiguredMongoUri()) {
        return { paths: [], fallback: "blocking" };
    }
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
