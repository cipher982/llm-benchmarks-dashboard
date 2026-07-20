import React from "react";
import Head from "next/head";
import Link from "next/link";
import type { GetStaticProps, NextPage } from "next";
import { Typography, Box, Table, TableBody, TableCell, TableHead, TableRow, Paper } from "@mui/material";
import ModelPageLayout from "../../components/model/ModelPageLayout";
import Section from "../../components/model/Section";
import InsightList from "../../components/model/InsightList";
import FAQAccordion from "../../components/model/FAQAccordion";
import PageBreadcrumbs from "../../components/model/PageBreadcrumbs";
import { createSlug } from "../../utils/seoUtils";

const GUIDE_UPDATED = "2026-06-11";
const CANONICAL_URL = "https://llm-benchmarks.com/guides/llm-provider-comparison";

interface ProviderSummary {
    provider: string;
    providerSlug: string;
    modelCount: number;
    bestTokPerSec: number;
    medianTokPerSec: number;
    bestModel: string;
    bestModelSlug: string;
    strength: string;
}

interface Props {
    providers: ProviderSummary[];
    lastUpdated: string;
}

const LlmProviderComparisonPage: NextPage<Props> = ({ providers, lastUpdated }) => {
    const breadcrumbs = [
        { label: "Home", href: "/" },
        { label: "Cloud Benchmarks", href: "/cloud" },
        { label: "Guides" },
        { label: "Provider Comparison" },
    ];

    const insights = [
        "OpenAI and Anthropic lead on model quality and capability breadth; inference-optimized providers (Groq, DeepInfra, Fireworks) lead on raw speed.",
        "AWS Bedrock and Azure OpenAI suit enterprise teams with existing cloud agreements, compliance requirements, or VPC-native data residency needs.",
        "Google Vertex AI integrates natively with Gemini models and GCP infrastructure — the strongest choice if you're already on Google Cloud.",
        "Together AI and Fireworks offer the widest selection of open-weight models (Llama, Mistral, Qwen, DeepSeek) at competitive prices.",
        "No single provider wins across all dimensions: speed, quality, price, compliance, and model variety all trade off differently.",
    ];

    const faq = [
        {
            question: "Which LLM API provider is best in 2026?",
            answer: "It depends on your use case. OpenAI and Anthropic lead on frontier model quality. Groq and DeepInfra lead on throughput. AWS Bedrock and Azure lead on enterprise compliance. Use the comparison table above to match your priorities.",
        },
        {
            question: "OpenAI vs Anthropic — which is better?",
            answer: "OpenAI offers more models and the widest ecosystem integration. Anthropic's Claude models benchmark strongly on reasoning, instruction-following, and safety. For coding tasks, both are strong; for long-context analysis, Claude 3 Opus and GPT-4 are comparable.",
        },
        {
            question: "Which provider has the most models?",
            answer: "Together AI and Fireworks host the widest range of open-weight models. OpenAI has the largest selection of proprietary frontier models. AWS Bedrock aggregates multiple providers under one API.",
        },
        {
            question: "Which LLM API is cheapest?",
            answer: "Pricing changes frequently. Groq and DeepInfra often offer the lowest per-token cost for open-weight models. For OpenAI-compatible APIs, Together AI and Fireworks are typically cheaper than OpenAI direct. Always check current pricing pages as this data is not tracked in these benchmarks.",
        },
        {
            question: "Can I switch providers without changing my code?",
            answer: "Most providers expose an OpenAI-compatible API endpoint. If you use the OpenAI SDK and point BASE_URL at another provider, most requests will work without code changes — though tool use, vision, and structured output support vary.",
        },
    ];

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "TechArticle",
        "headline": "LLM API Provider Comparison 2026 — OpenAI vs Anthropic vs Groq vs AWS Bedrock",
        "description": "Side-by-side comparison of LLM API providers in 2026: OpenAI, Anthropic, Google, AWS Bedrock, Groq, DeepInfra, Fireworks, Together AI, and more.",
        "dateModified": lastUpdated,
        "datePublished": "2026-06-11",
        "author": { "@type": "Person", "name": "David Rose", "url": "https://drose.io", "sameAs": "https://github.com/cipher982" },
        "publisher": { "@type": "Organization", "name": "LLM Benchmarks", "url": "https://llm-benchmarks.com" },
    };

    return (
        <>
            <Head>
                <title>LLM API Provider Comparison 2026 — OpenAI vs Anthropic vs Groq vs Bedrock</title>
                <meta name="description" content="Side-by-side comparison of LLM API providers 2026: OpenAI, Anthropic, Google Gemini, AWS Bedrock, Groq, DeepInfra, Fireworks. Benchmark data, strengths, and when to use each." />
                <meta name="robots" content="index,follow" />
                <link rel="canonical" href={CANONICAL_URL} />
                <meta property="og:title" content="LLM API Provider Comparison 2026" />
                <meta property="og:description" content="Side-by-side comparison of LLM API providers with real benchmark data." />
                <meta property="og:type" content="article" />
                <meta property="og:url" content={CANONICAL_URL} />
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            </Head>
            <ModelPageLayout
                title="LLM API Provider Comparison 2026"
                subtitle="OpenAI vs Anthropic vs Groq vs AWS Bedrock — benchmark data and use-case guidance"
                intro={
                    <Typography variant="body1" paragraph>
                        Choosing an LLM API provider involves tradeoffs across speed, model quality, pricing, compliance, and ecosystem fit.
                        This guide compares the major providers using real benchmark data from automated API testing.
                        Last updated: <strong>{GUIDE_UPDATED}</strong>.
                    </Typography>
                }
                breadcrumbs={<PageBreadcrumbs items={breadcrumbs} />}
            >
                <Section title="Provider Overview (by Benchmark Speed)">
                    <Typography variant="body2" color="text.secondary" paragraph>
                        Sorted by best measured throughput. Click any provider for full model listings and detailed benchmark history.
                    </Typography>
                    <Paper variant="outlined" sx={{ overflow: "auto" }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ "& th": { fontWeight: 700 } }}>
                                    <TableCell>Provider</TableCell>
                                    <TableCell>Models Benchmarked</TableCell>
                                    <TableCell align="right">Best Tok/s</TableCell>
                                    <TableCell align="right">Median Tok/s</TableCell>
                                    <TableCell>Best Model</TableCell>
                                    <TableCell>Strength</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {providers.map((p) => (
                                    <TableRow key={p.provider} hover>
                                        <TableCell>
                                            <Link href={`/providers/${p.providerSlug}`} style={{ color: "inherit", fontWeight: 600 }}>
                                                {p.provider}
                                            </Link>
                                        </TableCell>
                                        <TableCell>{p.modelCount}</TableCell>
                                        <TableCell align="right"><strong>{p.bestTokPerSec}</strong></TableCell>
                                        <TableCell align="right">{p.medianTokPerSec}</TableCell>
                                        <TableCell>
                                            <Link href={`/models/${p.providerSlug}/${p.bestModelSlug}`} style={{ color: "inherit" }}>
                                                {p.bestModel}
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" color="text.secondary">{p.strength}</Typography>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Paper>
                </Section>

                <Section title="Provider Profiles">
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        {[
                            {
                                name: "OpenAI",
                                slug: "openai",
                                summary: "The market leader for frontier models. GPT-5, GPT-5 Nano, o3, and o1 series lead reasoning, coding, and general capability benchmarks. Best ecosystem support and widest third-party integrations.",
                                best_for: "Frontier model quality, reasoning tasks, coding assistants, and applications where API reliability and ecosystem maturity matter most.",
                                watch_out: "Direct OpenAI API throughput is lower than inference-optimized providers. Premium pricing on frontier models.",
                            },
                            {
                                name: "Anthropic",
                                slug: "anthropic",
                                summary: "Claude 3 and Claude 4 models excel at instruction-following, long-context analysis, and safe output. Strong performer for document processing, multi-turn dialogue, and tasks requiring precise adherence to complex instructions.",
                                best_for: "Long-context analysis, instruction-following, regulated industries where output safety matters, and applications needing reliable structured output.",
                                watch_out: "Smaller model catalog than OpenAI. API throughput is moderate.",
                            },
                            {
                                name: "Groq",
                                slug: "groq",
                                summary: "Purpose-built inference hardware (LPUs) delivers category-leading throughput on open-weight models. Llama 3.3 70B and Qwen 3-32B regularly top speed benchmarks at 150+ tok/s with near-zero TTFT.",
                                best_for: "Real-time applications, voice interfaces, gaming, and any workload where sub-second streaming response start matters more than frontier model quality.",
                                watch_out: "Limited to open-weight models. No GPT-4 or Claude. Rate limits can be tight on free tier.",
                            },
                            {
                                name: "AWS Bedrock",
                                slug: "bedrock",
                                summary: "Aggregates models from Anthropic, Meta, Mistral, Amazon Nova, and others under one AWS-native API. Nova Micro (~118 tok/s) is the fastest Bedrock model. Strong compliance story: SOC2, HIPAA, FedRAMP.",
                                best_for: "Enterprise teams already on AWS. VPC-native deployments. HIPAA/FedRAMP compliance requirements. Data residency control.",
                                watch_out: "API overhead adds latency vs direct provider calls. More complex IAM setup.",
                            },
                            {
                                name: "DeepInfra",
                                slug: "deepinfra",
                                summary: "One of the fastest open-weight inference providers, particularly on smaller models. Qwen 3.5-2B at ~203 tok/s and multiple 100+ tok/s options. OpenAI-compatible API.",
                                best_for: "High-volume, cost-sensitive workloads on open-weight models. Speed-critical applications where proprietary models are not required.",
                                watch_out: "Less brand recognition than major providers. SLA / support coverage less mature than Groq or Fireworks.",
                            },
                        ].map((p) => (
                            <Box key={p.name}>
                                <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                                    <Link href={`/providers/${p.slug}`} style={{ color: "inherit" }}>{p.name}</Link>
                                </Typography>
                                <Typography variant="body2" paragraph>{p.summary}</Typography>
                                <Typography variant="body2"><strong>Best for:</strong> {p.best_for}</Typography>
                                <Typography variant="body2" color="text.secondary"><strong>Watch out for:</strong> {p.watch_out}</Typography>
                            </Box>
                        ))}
                    </Box>
                </Section>

                <Section title="Key Insights">
                    <InsightList items={insights} />
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
        const res = await fetch(`${baseUrl}/api/processed?days=7`);
        const data = await res.json();
        const table: any[] = data.table ?? [];

        const byProvider: Record<string, any[]> = {};
        for (const m of table) {
            if (!m.tokens_per_second_mean || !m.provider) continue;
            const key = m.providerCanonical || m.provider;
            if (!byProvider[key]) byProvider[key] = [];
            byProvider[key].push(m);
        }

        const providerStrengths: Record<string, string> = {
            openai: "Frontier quality, ecosystem",
            anthropic: "Reasoning, long context",
            groq: "Speed, low latency",
            bedrock: "Enterprise compliance",
            deepinfra: "Open-weight speed",
            fireworks: "Open-weight variety",
            together: "Model variety, price",
            google: "GCP integration",
            azure: "Enterprise, Microsoft",
            mistral: "European, GDPR",
        };

        const providers: ProviderSummary[] = Object.entries(byProvider)
            .map(([canonical, models]) => {
                const sorted = [...models].sort((a, b) => b.tokens_per_second_mean - a.tokens_per_second_mean);
                const toks = sorted.map((m) => m.tokens_per_second_mean);
                const median = toks.length > 0
                    ? toks[Math.floor(toks.length / 2)]
                    : 0;
                const best = sorted[0];
                return {
                    provider: best.provider || canonical,
                    providerSlug: createSlug(canonical),
                    modelCount: models.length,
                    bestTokPerSec: Math.round(best.tokens_per_second_mean),
                    medianTokPerSec: Math.round(median),
                    bestModel: best.model_name || best.display_name || "",
                    bestModelSlug: createSlug(best.modelCanonical || best.model_name || ""),
                    strength: providerStrengths[canonical.toLowerCase()] || "General purpose",
                };
            })
            .sort((a, b) => b.bestTokPerSec - a.bestTokPerSec)
            .slice(0, 15);

        return {
            props: { providers, lastUpdated: GUIDE_UPDATED },
            revalidate: 3600,
        };
    } catch {
        return {
            props: { providers: [], lastUpdated: GUIDE_UPDATED },
            revalidate: 300,
        };
    }
};

export default LlmProviderComparisonPage;
