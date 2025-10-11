import React from "react";
import Head from "next/head";
import type { GetStaticPaths, GetStaticProps, NextPage } from "next";
import ModelPageLayout from "../../components/model/ModelPageLayout";
import Section from "../../components/model/Section";
import MetricSummaryGrid, { MetricSummaryItem } from "../../components/model/MetricSummaryGrid";
import PageBreadcrumbs from "../../components/model/PageBreadcrumbs";
import RelatedLinks, { RelatedLinkItem } from "../../components/model/RelatedLinks";
import FAQAccordion, { FAQItem } from "../../components/model/FAQAccordion";

interface PlaceholderProviderProps {
    providerSlug: string;
}

const placeholderMetrics: MetricSummaryItem[] = [
    { label: "Models Tracked", value: "--" },
    { label: "Median Tokens / Second", value: "--" },
    { label: "Median Time to First Token", value: "--" },
    { label: "Last Updated", value: "--" },
];

const placeholderFAQ: FAQItem[] = [
    {
        question: "Where can I see benchmarks for individual models?",
        answer:
            "Individual model pages are being activated for each provider. Use the cloud benchmarks table to explore live data while we finish the dedicated routes.",
    },
];

const placeholderLinks: RelatedLinkItem[] = [];

const ProviderDetailPlaceholder: NextPage<PlaceholderProviderProps> = ({ providerSlug }) => {
    const providerName = providerSlug.replace(/-/g, " ");
    const title = `${providerName} LLM Benchmarks`;

    return (
        <>
            <Head>
                <title>{title}</title>
                <meta name="robots" content="noindex,nofollow" />
            </Head>
            <ModelPageLayout
                title={title}
                subtitle="Provider hub pages are being scaffolded."
                intro={
                    <p>
                        We are preparing provider-level landing pages that aggregate benchmark performance across every hosted
                        model. This placeholder ensures the URL structure is ready while the data integration layer is finalized.
                    </p>
                }
                breadcrumbs={
                    <PageBreadcrumbs
                        items={[
                            { label: "Home", href: "/" },
                            { label: "Cloud Benchmarks", href: "/cloud" },
                            { label: providerName },
                        ]}
                    />
                }
            >
                <Section title="Provider Overview">
                    <MetricSummaryGrid items={placeholderMetrics} />
                </Section>
                <Section title="Frequently Asked Questions">
                    <FAQAccordion items={placeholderFAQ} />
                </Section>
                <Section title="Explore Models">
                    <RelatedLinks items={placeholderLinks} />
                </Section>
            </ModelPageLayout>
        </>
    );
};

export const getStaticPaths: GetStaticPaths = async () => {
    return {
        paths: [],
        fallback: "blocking",
    };
};

export const getStaticProps: GetStaticProps<PlaceholderProviderProps> = async (context) => {
    const providerSlug = context.params?.provider as string;

    return {
        props: {
            providerSlug,
        },
    };
};

export default ProviderDetailPlaceholder;
