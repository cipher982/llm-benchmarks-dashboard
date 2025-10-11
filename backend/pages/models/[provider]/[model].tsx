import React from "react";
import Head from "next/head";
import type { GetStaticPaths, GetStaticProps, NextPage } from "next";
import ModelPageLayout from "../../../components/model/ModelPageLayout";
import Section from "../../../components/model/Section";
import MetricSummaryGrid, { MetricSummaryItem } from "../../../components/model/MetricSummaryGrid";
import PageBreadcrumbs from "../../../components/model/PageBreadcrumbs";
import FAQAccordion, { FAQItem } from "../../../components/model/FAQAccordion";
import RelatedLinks, { RelatedLinkItem } from "../../../components/model/RelatedLinks";

interface PlaceholderModelPageProps {
    providerSlug: string;
    modelSlug: string;
}

const placeholderMetrics: MetricSummaryItem[] = [
    { label: "Tokens / Second", value: "--" },
    { label: "Time to First Token", value: "--" },
    { label: "Sample Size", value: "--" },
    { label: "Last Updated", value: "--" },
];

const placeholderFAQ: FAQItem[] = [
    {
        question: "Where is the detailed benchmark data?",
        answer: "Model-specific benchmark data is being prepared. Check back soon for rich analysis and historical trends.",
    },
];

const placeholderLinks: RelatedLinkItem[] = [];

const ModelDetailPlaceholder: NextPage<PlaceholderModelPageProps> = ({ providerSlug, modelSlug }) => {
    const providerName = providerSlug.replace(/-/g, " ");
    const modelName = modelSlug.replace(/-/g, " ");
    const title = `${modelName} – ${providerName} Benchmarks`;

    return (
        <>
            <Head>
                <title>{title}</title>
                <meta name="robots" content="noindex,nofollow" />
            </Head>
            <ModelPageLayout
                title={title}
                subtitle="Dedicated benchmark coverage for this model is being generated."
                intro={
                    <p>
                        We are provisioning tailored benchmark narratives, trend analysis, and implementation guidance for each
                        model in the catalog. This scaffold validates the information architecture before we wire up live data.
                    </p>
                }
                breadcrumbs={
                    <PageBreadcrumbs
                        items={[
                            { label: "Home", href: "/" },
                            { label: "Cloud Benchmarks", href: "/cloud" },
                            { label: providerName },
                            { label: modelName },
                        ]}
                    />
                }
            >
                <Section title="Benchmark Overview">
                    <MetricSummaryGrid items={placeholderMetrics} />
                </Section>
                <Section title="Frequently Asked Questions">
                    <FAQAccordion items={placeholderFAQ} />
                </Section>
                <Section title="Related Links">
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

export const getStaticProps: GetStaticProps<PlaceholderModelPageProps> = async (context) => {
    const providerSlug = context.params?.provider as string;
    const modelSlug = context.params?.model as string;

    return {
        props: {
            providerSlug,
            modelSlug,
        },
    };
};

export default ModelDetailPlaceholder;
