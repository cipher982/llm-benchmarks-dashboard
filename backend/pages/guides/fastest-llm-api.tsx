import React from "react";
import Head from "next/head";
import Link from "next/link";
import type { GetStaticProps, NextPage } from "next";
import { Typography, Box, Table, TableBody, TableCell, TableHead, TableRow, Paper, Chip } from "@mui/material";
import ModelPageLayout from "../../components/model/ModelPageLayout";
import Section from "../../components/model/Section";
import InsightList from "../../components/model/InsightList";
import FAQAccordion from "../../components/model/FAQAccordion";
import PageBreadcrumbs from "../../components/model/PageBreadcrumbs";
import { createSlug } from "../../utils/seoUtils";

const GUIDE_UPDATED = "2026-06-11";
const CANONICAL_URL = "https://llm-benchmarks.com/guides/fastest-llm-api";

interface FastestModel {
    rank: number;
    provider: string;
    providerSlug: string;
    modelName: string;
    modelSlug: string;
    tokensPerSecond: number;
    ttftMs: number;
    notes: string;
}

interface Props {
    models: FastestModel[];
    lastUpdated: string;
}

const FastestLlmApiPage: NextPage<Props> = ({ models, lastUpdated }) => {
    const breadcrumbs = [
        { label: "Home", href: "/" },
        { label: "Cloud Benchmarks", href: "/cloud" },
        { label: "Guides" },
        { label: "Fastest LLM API" },
    ];

    const insights = [
        `Inference-optimized providers (Groq, DeepInfra, Fireworks) consistently deliver 100–300+ tokens/second — 3–10× faster than direct OpenAI/Anthropic APIs.`,
        `High throughput does not equal low latency: time-to-first-token (TTFT) is what matters for streaming UX. Groq and DeepInfra often have near-zero TTFT.`,
        `AWS Bedrock Nova Micro reaches ~118 tok/s with ~380ms TTFT — the fastest option if you need AWS-native data residency and compliance.`,
        `For most coding assistants and chatbots, 60–80 tok/s is imperceptibly fast in streaming mode. Chase lower TTFT before chasing higher throughput.`,
        `Benchmarks reflect rolling averages from automated runs. Provider speeds change week-to-week; check the live data before committing to a provider.`,
    ];

    const faq = [
        {
            question: "Which LLM API is fastest in 2026?",
            answer: "Groq and DeepInfra lead raw throughput benchmarks, regularly exceeding 150 tokens/second on mid-sized models. For the absolute highest speed on a capable model, Groq's Llama-3.3-70B at ~154 tok/s is a strong choice as of June 2026.",
        },
        {
            question: "What is a good tokens-per-second rate for a production API?",
            answer: "60–80 tok/s is generally imperceptible for streaming output. Above 100 tok/s is excellent. Below 30 tok/s starts to feel slow in interactive chat. For batch processing, throughput matters more than TTFT.",
        },
        {
            question: "Is Groq faster than OpenAI?",
            answer: "Yes — Groq's inference hardware consistently delivers 3–10× higher throughput than OpenAI's API for equivalent model sizes. The tradeoff is model selection: Groq offers fewer frontier models than OpenAI.",
        },
        {
            question: "How often do these benchmarks update?",
            answer: "The underlying data refreshes automatically from live API calls. The table on this page reflects a snapshot from the build date. Visit the live /cloud page for real-time rankings.",
        },
        {
            question: "What is time to first token (TTFT)?",
            answer: "TTFT is the delay between sending your API request and receiving the first token of the response. It determines how quickly a streaming response starts appearing. For interactive UX, TTFT under 500ms is preferred.",
        },
    ];

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "TechArticle",
        "headline": "Fastest LLM API 2026 — Benchmark Rankings",
        "description": "Real benchmark data comparing LLM API throughput and latency across OpenAI, Anthropic, Groq, DeepInfra, Fireworks, AWS Bedrock, and more.",
        "dateModified": lastUpdated,
        "datePublished": "2026-06-11",
        "author": { "@type": "Organization", "name": "LLM Benchmarks" },
        "publisher": { "@type": "Organization", "name": "LLM Benchmarks", "url": "https://llm-benchmarks.com" },
    };

    return (
        <>
            <Head>
                <title>Fastest LLM API 2026 — Speed Benchmark Rankings</title>
                <meta name="description" content="Real benchmark data: which LLM API is fastest in 2026? Compare tokens/second and time-to-first-token across OpenAI, Groq, Anthropic, AWS Bedrock, DeepInfra, and more." />
                <meta name="robots" content="index,follow" />
                <link rel="canonical" href={CANONICAL_URL} />
                <meta property="og:title" content="Fastest LLM API 2026 — Speed Benchmark Rankings" />
                <meta property="og:description" content="Real benchmark data comparing LLM API throughput and latency. Updated automatically from live API measurements." />
                <meta property="og:type" content="article" />
                <meta property="og:url" content={CANONICAL_URL} />
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            </Head>
            <ModelPageLayout
                title="Fastest LLM API 2026"
                subtitle="Real benchmark rankings by tokens/second and time-to-first-token"
                intro={
                    <Typography variant="body1" paragraph>
                        This page ranks LLM APIs by measured throughput and latency using automated benchmarks run
                        against the live production endpoints. Data reflects rolling averages — not vendor claims.
                        Last updated: <strong>{GUIDE_UPDATED}</strong>.{" "}
                        For real-time data, see the <Link href="/cloud" style={{ color: "inherit" }}>live cloud benchmarks</Link>.
                    </Typography>
                }
                breadcrumbs={<PageBreadcrumbs items={breadcrumbs} />}
            >
                <Section title="Speed Rankings (Top 20 Active Models)">
                    <Typography variant="body2" color="text.secondary" paragraph>
                        Sorted by tokens/second (descending). TTFT = time to first token in milliseconds.
                        Click any model or provider to see full benchmark history.
                    </Typography>
                    <Paper variant="outlined" sx={{ overflow: "auto" }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ "& th": { fontWeight: 700 } }}>
                                    <TableCell>#</TableCell>
                                    <TableCell>Provider</TableCell>
                                    <TableCell>Model</TableCell>
                                    <TableCell align="right">Tok/s</TableCell>
                                    <TableCell align="right">TTFT (ms)</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {models.map((m) => (
                                    <TableRow key={`${m.provider}-${m.modelName}`} hover>
                                        <TableCell>{m.rank}</TableCell>
                                        <TableCell>
                                            <Link href={`/providers/${m.providerSlug}`} style={{ color: "inherit" }}>
                                                {m.provider}
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <Link href={`/models/${m.providerSlug}/${m.modelSlug}`} style={{ color: "inherit" }}>
                                                {m.modelName}
                                            </Link>
                                        </TableCell>
                                        <TableCell align="right">
                                            <strong>{m.tokensPerSecond}</strong>
                                        </TableCell>
                                        <TableCell align="right">
                                            {m.ttftMs > 0 ? m.ttftMs : <Chip label="~0" size="small" color="success" variant="outlined" />}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Paper>
                </Section>

                <Section title="Key Insights">
                    <InsightList items={insights} />
                </Section>

                <Section title="How to Choose">
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <Box>
                            <Typography variant="subtitle1" fontWeight={700}>Need the absolute fastest response?</Typography>
                            <Typography variant="body2">
                                Use <Link href="/providers/groq" style={{ color: "inherit", fontWeight: 600 }}>Groq</Link> or{" "}
                                <Link href="/providers/deepinfra" style={{ color: "inherit", fontWeight: 600 }}>DeepInfra</Link>.
                                Both consistently top the throughput charts with near-zero TTFT. Best for real-time voice, gaming, or low-latency chat.
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="subtitle1" fontWeight={700}>Need speed + frontier model quality?</Typography>
                            <Typography variant="body2">
                                <Link href="/providers/fireworks" style={{ color: "inherit", fontWeight: 600 }}>Fireworks</Link> runs
                                many of the same open-weight models as Groq with competitive speeds. For proprietary frontier models,{" "}
                                <Link href="/providers/openai" style={{ color: "inherit", fontWeight: 600 }}>OpenAI</Link> GPT-5 Nano
                                reaches ~91 tok/s with high quality.
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="subtitle1" fontWeight={700}>Need AWS-native compliance?</Typography>
                            <Typography variant="body2">
                                <Link href="/providers/bedrock" style={{ color: "inherit", fontWeight: 600 }}>AWS Bedrock</Link> Nova Micro
                                hits ~118 tok/s — best-in-class for VPC-native, SOC2-compliant workloads within the AWS ecosystem.
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="subtitle1" fontWeight={700}>Batch processing / cost-sensitive?</Typography>
                            <Typography variant="body2">
                                High throughput providers are also cheaper per token. Compare pricing on each{" "}
                                <Link href="/cloud" style={{ color: "inherit" }}>provider page</Link> alongside speed.
                            </Typography>
                        </Box>
                    </Box>
                </Section>

                <Section title="Frequently Asked Questions">
                    <FAQAccordion items={faq} />
                </Section>

                <Section title="Methodology">
                    <Typography variant="body2" color="text.secondary">
                        All benchmarks are collected by automated scripts that send standardized prompts to each provider&apos;s
                        production API and measure wall-clock time from request dispatch to final token. Tokens per second
                        is calculated from the completion length and total generation time. TTFT is measured as the gap between
                        request start and first streaming chunk. Runs are aggregated over a rolling window; the table above
                        shows means from the most recent 7-day window. Providers are not notified before benchmark runs.
                        View the{" "}
                        <Link href="/status" style={{ color: "inherit" }}>API status page</Link> for current provider health.
                    </Typography>
                </Section>
            </ModelPageLayout>
        </>
    );
};

export const getStaticProps: GetStaticProps<Props> = async () => {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
        const res = await fetch(`${baseUrl}/api/processed?days=7`);
        const data = await res.json();
        const table: any[] = data.table ?? [];

        const active = table
            .filter((m) => m.tokens_per_second_mean && m.tokens_per_second_mean > 0)
            .sort((a, b) => b.tokens_per_second_mean - a.tokens_per_second_mean)
            .slice(0, 20);

        const models: FastestModel[] = active.map((m, i) => ({
            rank: i + 1,
            provider: m.provider || "",
            providerSlug: createSlug(m.providerCanonical || m.provider || ""),
            modelName: m.model_name || m.display_name || "",
            modelSlug: createSlug(m.modelCanonical || m.model_name || ""),
            tokensPerSecond: Math.round(m.tokens_per_second_mean),
            ttftMs: m.time_to_first_token_mean ? Math.round(m.time_to_first_token_mean * 1000) : 0,
            notes: "",
        }));

        return {
            props: { models, lastUpdated: GUIDE_UPDATED },
            revalidate: 3600,
        };
    } catch {
        return {
            props: { models: [], lastUpdated: GUIDE_UPDATED },
            revalidate: 300,
        };
    }
};

export default FastestLlmApiPage;
