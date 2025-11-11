import React, { useEffect, useState, useCallback } from 'react';
import { styled } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { MainContainer, PageTitle } from '../components/design-system/components';
import {
    StyledDescriptionSection,
    CenteredContentContainer,
    StyledTableContainer,
} from '../components/StyledComponents';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { colors, typography } from '../components/design-system';

interface ModelData {
    provider: string;
    model: string;
    last_run_timestamp: string | null;
    last_run_relative: string;
    runs: boolean[];
    status: 'healthy' | 'warning' | 'deprecated' | 'disabled';
    warnings: string[];
    enabled?: boolean;
    deprecated?: boolean;
    deprecation_date?: string;
    successor_model?: string;
    disabled_reason?: string;
}

interface StatusData {
    active: ModelData[];
    deprecated: ModelData[];
    disabled: ModelData[];
    summary: {
        active_count: number;
        deprecated_count: number;
        disabled_count: number;
        total_issues: number;
    };
}

// Styles
const SectionHeaderContainer = styled('div')(({ theme }) => ({
    marginBottom: theme.spacing(3),
    marginTop: theme.spacing(2),
}));

const SectionTitle = styled('h2')<{ sectionType?: 'active' | 'deprecated' | 'disabled' }>(({ sectionType = 'active' }) => {
    const borderColors = {
        active: '#2d7a2d',
        deprecated: '#d97706',
        disabled: '#6b7280'
    };

    return {
        fontSize: typography.sizes['2xl'],
        fontWeight: typography.weights.semibold,
        color: colors.textPrimary,
        margin: '0',
        padding: '12px 16px',
        backgroundColor: colors.surfaceElevated,
        borderLeft: `4px solid ${borderColors[sectionType]}`,
        fontFamily: typography.fontFamily,
    };
});

const SectionDescription = styled('p')({
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    margin: '8px 16px',
    fontFamily: typography.fontFamily,
});

const ProviderSection = styled('div')(({ theme }) => ({
    width: '100%',
    marginBottom: theme.spacing(2),
}));

const ProviderHeader = styled('h3')({
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginTop: '0',
    marginBottom: '16px',
    padding: '8px 0',
    textAlign: 'center',
    backgroundColor: colors.surfaceElevated,
    borderTop: `1px solid ${colors.borderLight}`,
    borderBottom: `1px solid ${colors.borderDark}`,
    fontFamily: typography.fontFamily,
});

const StatusIndicator = styled('span')<{ status: string }>(({ status }) => {
    const color = status === 'success' ? '#008000' : '#800000';
    return {
        color,
        marginRight: '2px',
        display: 'inline-block',
        width: '16px',
        textAlign: 'center',
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.normal,
    };
});

const WarningBadge = styled('span')<{ type: string }>(({ type }) => {
    const colors = {
        stale: { bg: '#fef3c7', text: '#92400e', border: '#fbbf24' },
        infrequent: { bg: '#fef3c7', text: '#92400e', border: '#fbbf24' },
        failures: { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' },
        deprecated: { bg: '#ffedd5', text: '#9a3412', border: '#f97316' }
    };

    const style = type.startsWith('stale') ? colors.stale :
                  type.startsWith('infrequent') ? colors.infrequent :
                  type.startsWith('failures') ? colors.failures :
                  colors.deprecated;

    return {
        display: 'inline-block',
        padding: '2px 6px',
        marginLeft: '4px',
        fontSize: typography.sizes.xs,
        fontFamily: typography.fontFamily,
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        borderRadius: '2px',
    };
});

const DeprecationDetails = styled('div')({
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    padding: '4px 12px',
    fontFamily: typography.fontFamily,
    fontStyle: 'italic',
});

const StyledTable = styled(Table)({
    backgroundColor: colors.surface,
    '& .MuiTableCell-root': {
        fontFamily: typography.fontFamily,
        fontSize: typography.sizes.base,
        color: colors.textPrimary,
        borderBottom: `1px solid ${colors.borderMedium}`,
        padding: '8px 12px',
    },
    '& .MuiTableHead-root': {
        backgroundColor: colors.surfaceElevated,
    },
    '& .MuiTableRow-root': {
        '&:hover': {
            backgroundColor: colors.hover,
        },
    },
});

const CollapsibleSection = styled('div')<{ isOpen: boolean }>(({ isOpen }) => ({
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'all 0.2s ease',
    opacity: isOpen ? 1 : 0.7,
    '&:hover': {
        opacity: 1,
    },
}));

const StatusPage: React.FC = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [statusData, setStatusData] = useState<StatusData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [disabledExpanded, setDisabledExpanded] = useState<boolean>(false);

    const fetchStatusData = useCallback(async () => {
        try {
            const response = await fetch(`/api/status`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data: StatusData = await response.json();
            console.log('Status API returned:', data);

            setStatusData(data);
            setLoading(false);
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatusData();
        const interval = setInterval(fetchStatusData, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, [fetchStatusData]);

    if (loading) {
        return (
            <MainContainer isMobile={isMobile}>
                <StyledDescriptionSection isMobile={isMobile}>
                    <CenteredContentContainer>
                        <PageTitle>🔄 API Status 🔄</PageTitle>
                        <p>Loading status data...</p>
                    </CenteredContentContainer>
                </StyledDescriptionSection>
            </MainContainer>
        );
    }

    if (error) {
        return (
            <MainContainer isMobile={isMobile}>
                <StyledDescriptionSection isMobile={isMobile}>
                    <CenteredContentContainer>
                        <PageTitle>❌ API Status - Error ❌</PageTitle>
                        <p style={{ color: colors.error }}>Error: {error}</p>
                    </CenteredContentContainer>
                </StyledDescriptionSection>
            </MainContainer>
        );
    }

    if (!statusData) return null;

    // Helper to render warning badges
    const renderWarnings = (warnings: string[]) => {
        return warnings.map((warning, idx) => {
            const label = warning.startsWith('stale') ? `⚠️ Stale (${warning.split('_')[1]})` :
                         warning.startsWith('infrequent') ? `⚠️ Infrequent (${warning.split('_')[1]})` :
                         warning.startsWith('failures') ? `⚠️ ${warning.split('_')[1]} failures` :
                         warning;
            return <WarningBadge key={idx} type={warning}>{label}</WarningBadge>;
        });
    };

    // Helper to group models by provider
    const groupByProvider = (models: ModelData[]) => {
        return models.reduce((acc, model) => {
            if (!acc[model.provider]) {
                acc[model.provider] = [];
            }
            acc[model.provider].push(model);
            return acc;
        }, {} as Record<string, ModelData[]>);
    };

    // Helper to render a model table section
    const renderModelTable = (models: ModelData[], showDeprecationDetails = false) => {
        const groupedByProvider = groupByProvider(models);

        return Object.entries(groupedByProvider).map(([provider, providerModels]) => (
            <StyledTableContainer key={provider} isMobile={isMobile}>
                <ProviderSection>
                    <ProviderHeader>{provider.toUpperCase()}</ProviderHeader>
                    <TableContainer>
                        <StyledTable size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Model</TableCell>
                                    <TableCell>Last Run</TableCell>
                                    <TableCell>Status History (Last 10 runs)</TableCell>
                                    <TableCell>Status</TableCell>
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
    );
};

export default StatusPage;