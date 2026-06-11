import React from "react";
import Head from "next/head";
import Link from "next/link";
import type { GetStaticProps, NextPage } from "next";
import { Typography, Box, Table, TableBody, TableCell, TableHead, TableRow, Paper, Chip } from "@mui/material";
import ModelPageLayout from "../../components/model/ModelPageLayout";
import Section from "../../components/model/Section";
import FAQAccordion from "../../components/model/FAQAccordion";
import PageBreadcrumbs from "../../components/model/PageBreadcrumbs";
import { createSlug } from "../../utils/seoUtils";

const GUIDE_UPDATED = "2026-06-11";
const CANONICAL_URL = "https://llm-benchmarks.com/guides/deprecated-model-replacements";

interface DeprecatedEntry {
    oldModel: string;
    oldModelSlug: string;
    provider: string;
    providerSlug: string;
    status: string;
    replacementModel: string;
    replacementSlug: string;
    notes: string;
}

interface Props {
    entries: DeprecatedEntry[];
    lastUpdated: string;
}

// Hardcoded known replacements for the most-searched deprecated models
const KNOWN_REPLACEMENTS: DeprecatedEntry[] = [
    {
        oldModel: "gpt-4-0125-preview",
        oldModelSlug: "gpt40125preview",
        provider: "OpenAI",
        providerSlug: "openai",
        status: "deprecated",
        replacementModel: "gpt-4o",
        replacementSlug: "gpt4o",
        notes: "GPT-4 Turbo preview → GPT-4o. Faster, cheaper, multimodal.",
    },
    {
        oldModel: "gpt-3.5-turbo-0125",
        oldModelSlug: "gpt35turbo0125",
        provider: "OpenAI",
        providerSlug: "openai",
        status: "deprecated",
        replacementModel: "gpt-4o-mini",
        replacementSlug: "gpt4omini",
        notes: "GPT-3.5 Turbo → GPT-4o Mini. Similar price tier, better quality.",
    },
    {
        oldModel: "gpt-4-turbo",
        oldModelSlug: "gpt4turbo",
        provider: "OpenAI",
        providerSlug: "openai",
        status: "deprecated",
        replacementModel: "gpt-4o",
        replacementSlug: "gpt4o",
        notes: "GPT-4 Turbo → GPT-4o. GPT-4o is faster and cheaper.",
    },
    {
        oldModel: "text-davinci-003",
        oldModelSlug: "textdavinci003",
        provider: "OpenAI",
        providerSlug: "openai",
        status: "deprecated",
        replacementModel: "gpt-4o-mini",
        replacementSlug: "gpt4omini",
        notes: "Legacy Davinci completion model. Migrate to chat completions API.",
    },
    {
        oldModel: "claude-2.0",
        oldModelSlug: "claude20",
        provider: "Anthropic",
        providerSlug: "anthropic",
        status: "deprecated",
        replacementModel: "claude-3-5-haiku",
        replacementSlug: "claude35haiku20241022",
        notes: "Claude 2 → Claude 3.5 Haiku. Similar price, dramatically better performance.",
    },
    {
        oldModel: "claude-instant-1.2",
        oldModelSlug: "claudeinstant12",
        provider: "Anthropic",
        providerSlug: "anthropic",
        status: "deprecated",
        replacementModel: "claude-3-5-haiku",
        replacementSlug: "claude35haiku20241022",
        notes: "Claude Instant → Claude 3.5 Haiku. Much better quality at comparable cost.",
    },
    {
        oldModel: "llama3-70b-8192 (Groq)",
        oldModelSlug: "llama370b8192",
        provider: "Groq",
        providerSlug: "groq",
        status: "disabled",
        replacementModel: "llama-3.3-70b",
        replacementSlug: "llama3370bversatile",
        notes: "Llama 3 70B → Llama 3.3 70B. Drop-in replacement with better benchmarks.",
    },
];

const DeprecatedModelReplacementsPage: NextPage<Props> = ({ entries, lastUpdated }) => {
    const breadcrumbs = [
        { label: "Home", href: "/" },
        { label: "Cloud Benchmarks", href: "/cloud" },
        { label: "Guides" },
        { label: "Deprecated Model Replacements" },
    ];

    const faq = [
        {
            question: "What should I use instead of gpt-4-0125-preview?",
            answer: "Migrate to gpt-4o. It is faster, cheaper, and multimodal. If you were using GPT-4 Turbo preview for cost efficiency, gpt-4o-mini is even cheaper and handles most tasks well.",
        },
        {
            question: "What replaces gpt-3.5-turbo?",
            answer: "GPT-4o Mini (gpt-4o-mini) is the recommended replacement. It is comparable in price to GPT-3.5 Turbo and significantly better at instruction-following and reasoning.",
        },
        {
            question: "What replaces Claude 2?",
            answer: "Claude 3.5 Haiku is Anthropic's recommended replacement for Claude 2 and Claude Instant. It offers much better performance at similar pricing.",
        },
        {
            question: "How do I know if my model is deprecated?",
            answer: "Check the model's page on this site — deprecated models show a warning banner. You can also check the provider's official deprecation schedule in their documentation.",
        },
        {
            question: "Will deprecated model APIs still work?",
            answer: "Providers typically give a deprecation window (often 3–6 months) before shutting down endpoints. After the shutdown date, API calls to the deprecated model will fail. Always migrate before the stated end-of-life date.",
        },
    ];

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "TechArticle",
        "headline": "Deprecated LLM API Models — What to Use Instead (2026)",
        "description": "Complete guide to deprecated LLM API models and their recommended replacements. Covers OpenAI GPT-4 Turbo, GPT-3.5, Anthropic Claude 2, Llama 3, and more.",
        "dateModified": lastUpdated,
        "datePublished": "2026-06-11",
        "author": { "@type": "Organization", "name": "LLM Benchmarks" },
        "publisher": { "@type": "Organization", "name": "LLM Benchmarks", "url": "https://llm-benchmarks.com" },
    };

    const allEntries = [...KNOWN_REPLACEMENTS, ...entries.filter(
        (e) => !KNOWN_REPLACEMENTS.find((k) => k.oldModelSlug === e.oldModelSlug)
    )];

    return (
        <>
            <Head>
                <title>Deprecated LLM API Models — What to Use Instead (2026)</title>
                <meta name="description" content="What replaces gpt-4-0125-preview, gpt-3.5-turbo, Claude 2, and other deprecated LLM models? Complete migration guide with benchmark data for recommended replacements." />
                <meta name="robots" content="index,follow" />
                <link rel="canonical" href={CANONICAL_URL} />
                <meta property="og:title" content="Deprecated LLM Models — What to Use Instead 2026" />
                <meta property="og:description" content="Migration guide for deprecated LLM API models: GPT-4 Turbo, GPT-3.5, Claude 2, and more." />
                <meta property="og:type" content="article" />
                <meta property="og:url" content={CANONICAL_URL} />
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            </Head>
            <ModelPageLayout
                title="Deprecated LLM Models — What to Use Instead"
                subtitle="Migration guide with benchmark data for recommended replacements"
                intro={
                    <Typography variant="body1" paragraph>
                        As LLM providers release newer models, older versions are deprecated and eventually shut down.
                        This guide maps the most common deprecated models to their recommended replacements,
                        with links to current benchmark data for each option.
                        Last updated: <strong>{GUIDE_UPDATED}</strong>.
                    </Typography>
                }
                breadcrumbs={<PageBreadcrumbs items={breadcrumbs} />}
            >
                <Section title="Deprecated Model → Replacement Guide">
                    <Paper variant="outlined" sx={{ overflow: "auto" }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ "& th": { fontWeight: 700 } }}>
                                    <TableCell>Deprecated Model</TableCell>
                                    <TableCell>Provider</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Recommended Replacement</TableCell>
                                    <TableCell>Notes</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {allEntries.map((e) => (
                                    <TableRow key={`${e.provider}-${e.oldModel}`} hover>
                                        <TableCell>
                                            <Link href={`/models/${e.providerSlug}/${e.oldModelSlug}`} style={{ color: "inherit" }}>
                                                <code style={{ fontSize: "0.85em" }}>{e.oldModel}</code>
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <Link href={`/providers/${e.providerSlug}`} style={{ color: "inherit" }}>
                                                {e.provider}
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={e.status}
                                                size="small"
                                                color={e.status === "deprecated" ? "error" : "warning"}
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Link href={`/models/${e.providerSlug}/${e.replacementSlug}`} style={{ color: "inherit", fontWeight: 600 }}>
                                                {e.replacementModel}
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" color="text.secondary">{e.notes}</Typography>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Paper>
                </Section>

                <Section title="Migration Tips">
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <Box>
                            <Typography variant="subtitle1" fontWeight={700}>Test before switching</Typography>
                            <Typography variant="body2">
                                Run your evaluation set on the new model before cutting over. Newer models often have different
                                output style, token counting, and function-calling behavior.
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="subtitle1" fontWeight={700}>Update your model string</Typography>
                            <Typography variant="body2">
                                Most migrations only require changing the <code>model</code> parameter in your API call.
                                For OpenAI migrations, also check that you are using the Chat Completions API (not the legacy Completions endpoint).
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="subtitle1" fontWeight={700}>Context window changes</Typography>
                            <Typography variant="body2">
                                Replacement models often have larger context windows. If you were truncating inputs to fit the old model&apos;s
                                limit, you may be able to remove that logic.
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="subtitle1" fontWeight={700}>Compare benchmark data</Typography>
                            <Typography variant="body2">
                                Check the{" "}
                                <Link href="/cloud" style={{ color: "inherit" }}>live benchmarks page</Link> to compare
                                throughput and latency between the old and new model before committing.
                            </Typography>
                        </Box>
                    </Box>
                </Section>

                <Section title="Frequently Asked Questions">
                    <FAQAccordion items={faq} />
                </Section>
            </ModelPageLayout>
        </>
    );
};

export const getStaticProps: GetStaticProps<Props> = async () => {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
        const res = await fetch(`${baseUrl}/api/status`);
        const data = await res.json();

        const deprecated: any[] = data.deprecated ?? [];
        const disabled: any[] = (data.disabled ?? []).filter((m: any) => m.deprecated);

        const entries: DeprecatedEntry[] = [...deprecated, ...disabled]
            .filter((m) => m.successor_model)
            .map((m) => ({
                oldModel: m.model || "",
                oldModelSlug: createSlug(m.model || ""),
                provider: m.provider || "",
                providerSlug: createSlug(m.provider || ""),
                status: m.status || "deprecated",
                replacementModel: m.successor_model,
                replacementSlug: createSlug(m.successor_model),
                notes: m.deprecation_date ? `Deprecated ${m.deprecation_date}` : "",
            }));

        return {
            props: { entries, lastUpdated: GUIDE_UPDATED },
            revalidate: 3600,
        };
    } catch {
        return {
            props: { entries: [], lastUpdated: GUIDE_UPDATED },
            revalidate: 300,
        };
    }
};

export default DeprecatedModelReplacementsPage;
