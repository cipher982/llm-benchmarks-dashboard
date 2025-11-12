import React, { useState } from 'react';
import Head from 'next/head';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { MainContainer, PageTitle } from '../components/design-system/components';
import {
    StyledDescriptionSection,
    CenteredContentContainer,
    StyledTableContainer,
} from '../components/StyledComponents';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { colors } from '../components/design-system';
import {
    SectionHeaderContainer,
    SectionTitle,
    SectionDescription,
    ProviderSection,
    ProviderHeader,
    StatusIndicator,
    WarningBadge,
    DeprecationDetails,
    StyledTable,
    CollapsibleSection,
} from '../components/status';
import { useStatusData } from '../hooks/useStatusData';
import { formatWarningLabel, groupModelsByProvider, ModelData } from '../utils/status/statusHelpers';

const StatusPage: React.FC = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [disabledExpanded, setDisabledExpanded] = useState<boolean>(false);

    // Use custom hook for data fetching with 30-second refresh
    const { statusData, loading, error } = useStatusData(30000);

    if (loading) {
        return (
            <>
                <Head>
                    <title>API Status - LLM Benchmarks</title>
                    <meta name="description" content="Real-time status of cloud LLM providers and models" />
                </Head>
                <MainContainer isMobile={isMobile}>
                    <StyledDescriptionSection isMobile={isMobile}>
                        <CenteredContentContainer>
                            <PageTitle>🔄 API Status 🔄</PageTitle>
                            <p>Loading status data...</p>
                        </CenteredContentContainer>
                    </StyledDescriptionSection>
                </MainContainer>
            </>
        );
    }

    if (error) {
        return (
            <>
                <Head>
                    <title>API Status - Error - LLM Benchmarks</title>
                    <meta name="description" content="Error loading API status" />
                </Head>
                <MainContainer isMobile={isMobile}>
                    <StyledDescriptionSection isMobile={isMobile}>
                        <CenteredContentContainer>
                            <PageTitle>❌ API Status - Error ❌</PageTitle>
                            <p style={{ color: colors.error }}>Error: {error}</p>
                        </CenteredContentContainer>
                    </StyledDescriptionSection>
                </MainContainer>
            </>
        );
    }

    if (!statusData) return null;

    // Helper to render warning badges
    const renderWarnings = (warnings: string[]) => {
        return warnings.map((warning, idx) => {
            const label = formatWarningLabel(warning);
            return <WarningBadge key={idx} type={warning}>{label}</WarningBadge>;
        });
    };

    // Helper to render a model table section
    const renderModelTable = (models: ModelData[], showDeprecationDetails = false) => {
        const groupedByProvider = groupModelsByProvider(models);

        return Object.entries(groupedByProvider).map(([provider, providerModels]) => (
            <StyledTableContainer key={provider} isMobile={isMobile}>
                <ProviderSection>
                    <ProviderHeader>{provider.toUpperCase()}</ProviderHeader>
                    <TableContainer>
                        <StyledTable size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell width="30%">Model</TableCell>
                                    <TableCell width="15%">Last Run</TableCell>
                                    <TableCell width="35%">Status History (Last 10 runs)</TableCell>
                                    <TableCell width="20%">Status</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {providerModels.map((model) => (
                                    <React.Fragment key={`${model.provider}-${model.model}`}>
                                        <TableRow>
                                            <TableCell>{model.model}</TableCell>
                                            <TableCell>{model.last_run_relative}</TableCell>
                                            <TableCell>
                                                {model.runs.length > 0 ? (
                                                    model.runs.map((success, index) => (
                                                        <StatusIndicator
                                                            key={index}
                                                            status={success ? 'success' : 'error'}
                                                        >
                                                            {success ? '✅' : '❌'}
                                                        </StatusIndicator>
                                                    ))
                                                ) : (
                                                    <span style={{ color: colors.textSecondary }}>No data</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {model.runs.length > 0 && (
                                                    <StatusIndicator status={model.runs[model.runs.length - 1] ? 'success' : 'error'}>
                                                        {model.runs[model.runs.length - 1] ? '✅' : '❌'}
                                                    </StatusIndicator>
                                                )}
                                                {renderWarnings(model.warnings)}
                                            </TableCell>
                                        </TableRow>
                                        {showDeprecationDetails && model.deprecation_date && (
                                            <TableRow>
                                                <TableCell colSpan={4}>
                                                    <DeprecationDetails>
                                                        📅 Deprecated: {new Date(model.deprecation_date).toLocaleDateString()}
                                                        {model.successor_model && ` → Successor: ${model.successor_model}`}
                                                    </DeprecationDetails>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                ))}
                            </TableBody>
                        </StyledTable>
                    </TableContainer>
                </ProviderSection>
            </StyledTableContainer>
        ));
    };

    return (
        <>
            <Head>
                <title>API Status Dashboard - LLM Benchmarks</title>
                <meta name="description" content="Real-time status of cloud LLM providers and models. Monitor API health, deprecations, and issues." />
            </Head>
            <MainContainer isMobile={isMobile}>
                <StyledDescriptionSection isMobile={isMobile}>
                    <CenteredContentContainer>
                        <PageTitle>📊 API Status Dashboard 📊</PageTitle>
                        <p>
                            Real-time status of all cloud LLM providers and models.
                            ✅ = Success, ❌ = Failure. Updates every 30 seconds.
                        </p>
                        <p>
                            <strong>Summary:</strong> {statusData.summary.active_count} active •{' '}
                            {statusData.summary.deprecated_count} deprecated •{' '}
                            {statusData.summary.disabled_count} disabled •{' '}
                            {statusData.summary.total_issues} issues
                        </p>
                    </CenteredContentContainer>
                </StyledDescriptionSection>

            {/* Active Models Section */}
            {statusData.active.length > 0 && (
                <SectionHeaderContainer>
                    <SectionTitle sectionType="active">
                        🟢 ACTIVE MODELS ({statusData.summary.active_count})
                    </SectionTitle>
                    <SectionDescription>
                        Models currently being benchmarked (enabled, not deprecated)
                    </SectionDescription>
                </SectionHeaderContainer>
            )}
            {renderModelTable(statusData.active)}

            {/* Deprecated Models Section */}
            {statusData.deprecated.length > 0 && (
                <>
                    <SectionHeaderContainer>
                        <SectionTitle sectionType="deprecated">
                            ⏸️ DEPRECATED BY PROVIDER ({statusData.summary.deprecated_count})
                        </SectionTitle>
                        <SectionDescription>
                            Models deprecated by provider but still in our benchmarks
                        </SectionDescription>
                    </SectionHeaderContainer>
                    {renderModelTable(statusData.deprecated, true)}
                </>
            )}

            {/* Disabled Models Section */}
            {statusData.disabled.length > 0 && (
                <>
                    <SectionHeaderContainer>
                        <CollapsibleSection
                            isOpen={disabledExpanded}
                            onClick={() => setDisabledExpanded(!disabledExpanded)}
                        >
                            <SectionTitle sectionType="disabled">
                                📦 DISABLED MODELS ({statusData.summary.disabled_count})
                                {disabledExpanded ? ' ▼' : ' ▶'}
                            </SectionTitle>
                            <SectionDescription>
                                Models we chose not to run (click to {disabledExpanded ? 'collapse' : 'expand'})
                            </SectionDescription>
                        </CollapsibleSection>
                    </SectionHeaderContainer>
                    {disabledExpanded && renderModelTable(statusData.disabled)}
                </>
            )}
            </MainContainer>
        </>
    );
};

export default StatusPage;