/**
 * Collector status.
 *
 * Restructured rather than restyled: the old page opened with a title, a
 * legend and a summary sentence, then emitted one bordered table per provider
 * per section — nineteen containers in the active section alone. That is how it
 * reached 26,376px, and no amount of palette work would have fixed it.
 *
 * Now: a meter strip of counts, then one table per section with provider as a
 * column. Deprecated and disabled collapse, because a reader who opened
 * `/status` is asking about what is running.
 */

import React, { useState } from 'react';
import Head from 'next/head';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { MainContainer, MeterStrip } from '../components/design-system/components';
import {
    StyledDescriptionSection,
    StyledTableContainer,
    TableContentContainer,
    SectionHeaderRow,
    SectionHeader,
    RailControls,
    RailNote,
    EmptyState,
} from '../components/StyledComponents';
import { SegmentedControl } from '../components/SegmentedControl';
import StatusTable from '../components/status/StatusTable';
import { useStatusData } from '../hooks/useStatusData';
import { buildStaticPageSeoMetadata } from '../utils/seoUtils';

const statusSeo = buildStaticPageSeoMetadata({
    path: '/status',
    title: 'API Status - LLM Benchmarks',
    description: 'Real-time status of cloud LLM providers and models. Monitor API health, deprecations, and issues.',
    keywords: 'LLM API status, provider uptime, model reliability, benchmark health dashboard',
});

const StatusPage: React.FC = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [deprecatedOpen, setDeprecatedOpen] = useState(false);
    const [disabledOpen, setDisabledOpen] = useState(false);

    // Use custom hook for data fetching with 30-second refresh
    const { statusData, loading, error } = useStatusData(30000);

    const providers = statusData
        ? new Set([...statusData.active, ...statusData.deprecated, ...statusData.disabled].map((m) => m.provider)).size
        : 0;

    // A model whose most recent run failed. Distinct from `total_issues`, which
    // counts warnings — a model can carry a staleness warning and still have
    // just succeeded.
    const failingNow = statusData
        ? statusData.active.filter((m) => m.runs.length > 0 && !m.runs[m.runs.length - 1]).length
        : 0;

    return (
        <>
            <Head>
                <title>{statusSeo.title}</title>
                <meta name="description" content={statusSeo.description} />
                <meta name="keywords" content={statusSeo.keywords} />
                <meta name="robots" content="index,follow" />
                <link rel="canonical" href={statusSeo.canonical} />
                <meta property="og:title" content={statusSeo.openGraph.title} />
                <meta property="og:description" content={statusSeo.openGraph.description} />
                <meta property="og:type" content={statusSeo.openGraph.type} />
                <meta property="og:url" content={statusSeo.openGraph.url} />
                <meta name="twitter:card" content={statusSeo.twitter.card} />
                <meta name="twitter:title" content={statusSeo.twitter.title} />
                <meta name="twitter:description" content={statusSeo.twitter.description} />
                {statusSeo.jsonLd && (
                    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(statusSeo.jsonLd) }} />
                )}
            </Head>
            <MainContainer isMobile={isMobile}>
                <h1 className="sr-only">Benchmark collector status</h1>

                {loading && <EmptyState>Loading status…</EmptyState>}
                {error && <EmptyState $tone="bad">Status unavailable · {error}</EmptyState>}

                {!loading && !error && statusData && (
                    <>
                        <MeterStrip columns={5}>
                            <div>
                                <dt>Active</dt>
                                <dd>{statusData.summary.active_count}</dd>
                            </div>
                            <div>
                                <dt>Providers</dt>
                                <dd>{providers}</dd>
                            </div>
                            <div>
                                <dt>Failing now</dt>
                                <dd>{failingNow}</dd>
                            </div>
                            <div>
                                <dt>Warnings</dt>
                                <dd>{statusData.summary.total_issues}</dd>
                            </div>
                            <div>
                                <dt>Not running</dt>
                                <dd>{statusData.summary.deprecated_count + statusData.summary.disabled_count}</dd>
                            </div>
                        </MeterStrip>

                        <StyledTableContainer isMobile={isMobile}>
                            <SectionHeaderRow>
                                <SectionHeader>Active</SectionHeader>
                                <RailNote>
                                    <b>{statusData.summary.active_count}</b> models being benchmarked
                                </RailNote>
                            </SectionHeaderRow>
                            <TableContentContainer isMobile={isMobile}>
                                {statusData.active.length
                                    ? <StatusTable models={statusData.active} />
                                    : <EmptyState>Nothing is being benchmarked</EmptyState>}
                            </TableContentContainer>
                        </StyledTableContainer>

                        {statusData.deprecated.length > 0 && (
                            <StyledTableContainer isMobile={isMobile}>
                                <SectionHeaderRow>
                                    <SectionHeader>Deprecated by provider</SectionHeader>
                                    <RailNote>
                                        <b>{statusData.summary.deprecated_count}</b> still in the catalogue
                                    </RailNote>
                                    <RailControls>
                                        <SegmentedControl
                                            label="Deprecated models"
                                            options={[{ value: 'hide', label: 'Hide' }, { value: 'show', label: 'Show' }]}
                                            value={deprecatedOpen ? 'show' : 'hide'}
                                            onChange={(v) => setDeprecatedOpen(v === 'show')}
                                        />
                                    </RailControls>
                                </SectionHeaderRow>
                                {deprecatedOpen && (
                                    <TableContentContainer isMobile={isMobile}>
                                        <StatusTable models={statusData.deprecated} showDeprecation />
                                    </TableContentContainer>
                                )}
                            </StyledTableContainer>
                        )}

                        {statusData.disabled.length > 0 && (
                            <StyledTableContainer isMobile={isMobile}>
                                <SectionHeaderRow>
                                    <SectionHeader>Disabled</SectionHeader>
                                    <RailNote>
                                        <b>{statusData.summary.disabled_count}</b> we chose not to run
                                    </RailNote>
                                    <RailControls>
                                        <SegmentedControl
                                            label="Disabled models"
                                            options={[{ value: 'hide', label: 'Hide' }, { value: 'show', label: 'Show' }]}
                                            value={disabledOpen ? 'show' : 'hide'}
                                            onChange={(v) => setDisabledOpen(v === 'show')}
                                        />
                                    </RailControls>
                                </SectionHeaderRow>
                                {disabledOpen && (
                                    <TableContentContainer isMobile={isMobile}>
                                        <StatusTable models={statusData.disabled} />
                                    </TableContentContainer>
                                )}
                            </StyledTableContainer>
                        )}

                        <StyledDescriptionSection isMobile={isMobile}>
                            <p>
                                <b>Method.</b> A green block is a successful benchmark run, a red one a failure, most
                                recent last. This page refreshes every 30 seconds. <b>Failing now</b> counts active
                                models whose most recent run failed; <b>warnings</b> counts models flagged as stale,
                                infrequent or repeatedly failing, which a model can be while its last run still
                                succeeded.
                            </p>
                        </StyledDescriptionSection>
                    </>
                )}
            </MainContainer>
        </>
    );
};

export default StatusPage;
