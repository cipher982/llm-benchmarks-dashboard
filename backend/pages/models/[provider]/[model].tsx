import React, { useMemo } from "react";
import Head from "next/head";
import type { GetStaticPaths, GetStaticProps, NextPage } from "next";
import ModelPageLayout from "../../../components/model/ModelPageLayout";
import Section from "../../../components/model/Section";
import MetricSummaryGrid from "../../../components/model/MetricSummaryGrid";
import PageBreadcrumbs from "../../../components/model/PageBreadcrumbs";
import FAQAccordion from "../../../components/model/FAQAccordion";
import RelatedLinks from "../../../components/model/RelatedLinks";
import { buildModelSeoMetadata } from "../../../utils/seoUtils";
import { getFeaturedStaticPaths, getModelPageData } from "../../../utils/modelService";
import type { ModelPageData, ProviderModelEntry } from "../../../types/ModelPages";
import type { SeoMetadata } from "../../../utils/seoUtils";

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

const buildFaq = (data: ModelPageData) => [
    {
        question: `How fast is ${data.displayName}?`,
        answer: `The latest rolling average throughput is ${formatNumber(data.summary.tokensPerSecondMean)} tokens per second with an average time to first token of ${formatNumber(data.summary.timeToFirstTokenMean)} ms across ${data.summary.runCount} recent runs.`,
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
    const metrics = useMemo(
        () => [
            { label: "Avg Tokens / Second", value: formatNumber(data.summary.tokensPerSecondMean) },
            { label: "Avg Time to First Token (ms)", value: formatNumber(data.summary.timeToFirstTokenMean) },
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
                title={`${data.displayName} Benchmarks`}
                subtitle={`Provider: ${data.provider}`}
                intro={
                    <p>
                        Explore real-world latency and throughput results for {data.displayName}. These numbers come from automated
                        benchmarking runs against the provider APIs using the same prompts and measurement harness that power the
                        public cloud dashboard.
                    </p>
                }
                breadcrumbs={<PageBreadcrumbs items={breadcrumbs} />}
            >
                <Section title="Benchmark Overview">
                    <MetricSummaryGrid items={metrics} />
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
