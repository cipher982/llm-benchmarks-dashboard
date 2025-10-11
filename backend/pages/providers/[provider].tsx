import React, { useMemo } from "react";
import Head from "next/head";
import type { GetStaticPaths, GetStaticProps, NextPage } from "next";
import ModelPageLayout from "../../components/model/ModelPageLayout";
import Section from "../../components/model/Section";
import MetricSummaryGrid from "../../components/model/MetricSummaryGrid";
import PageBreadcrumbs from "../../components/model/PageBreadcrumbs";
import RelatedLinks from "../../components/model/RelatedLinks";
import FAQAccordion from "../../components/model/FAQAccordion";
import ModelMetricTable from "../../components/model/ModelMetricTable";
import InsightList from "../../components/model/InsightList";
import { Typography } from "@mui/material";
import { getProviderModelInventory, getProviderPageData } from "../../utils/modelService";
import { buildProviderSeoMetadata } from "../../utils/seoUtils";
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
        items.push(`${data.models.length} ${data.provider} models are actively benchmarked in this environment.`);
        if (data.fastestModels[0]?.tokensPerSecondMean) {
            items.push(
                `${data.fastestModels[0].displayName} currently leads with ${formatNumber(data.fastestModels[0].tokensPerSecondMean)} tokens/second.`
            );
        }
        if (data.summary.timeToFirstTokenMean) {
            items.push(`Median time to first token across the fleet is ${formatNumber(data.summary.timeToFirstTokenMean)} ms.`);
        }
        return items;
    }, [data]);

    const fastestTableRows = data.fastestModels.map((model) => ({
        provider: model.provider,
        modelName: model.model,
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
                    <Typography variant="body1">
                        This provider hub highlights throughput and latency trends across every {data.provider} model monitored by
                        LLM Benchmarks. Use it to compare hosting tiers, track regressions, and discover the fastest variants in the
                        catalogue.
                    </Typography>
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
                    <ModelMetricTable rows={fastestTableRows} />
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
