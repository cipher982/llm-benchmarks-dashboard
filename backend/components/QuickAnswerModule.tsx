import React from 'react';
import { styled } from '@mui/material/styles';
import Link from 'next/link';
import { TableRow } from '../types/ProcessedData';
import { colors } from './design-system';

const ModuleContainer = styled('div')(({ theme }) => ({
    backgroundColor: colors.surface,
    padding: theme.spacing(3),
    border: `2px solid ${colors.primary}`,
    borderRadius: '4px',
    marginBottom: theme.spacing(4),
    boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)',
    fontFamily: 'Tahoma, "MS Sans Serif", sans-serif',
    maxWidth: '850px',
    margin: '0 auto 2rem auto',
    [theme.breakpoints.down('md')]: {
        padding: theme.spacing(2),
    },
}));

const ModuleTitle = styled('h3')(({ theme }) => ({
    margin: 0,
    marginBottom: theme.spacing(2),
    fontSize: '1.1rem',
    fontWeight: 700,
    color: colors.textPrimary,
    textAlign: 'center',
    [theme.breakpoints.down('sm')]: {
        fontSize: '1rem',
    },
}));

const ResultsTable = styled('table')(({ theme }) => ({
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.9rem',
    '& thead': {
        backgroundColor: colors.surfaceElevated,
        borderBottom: `2px solid ${colors.borderDark}`,
    },
    '& th': {
        padding: theme.spacing(1, 1.5),
        textAlign: 'left',
        fontWeight: 700,
        color: colors.textPrimary,
        borderRight: `1px solid ${colors.borderMedium}`,
        '&:last-child': {
            borderRight: 'none',
        },
    },
    '& td': {
        padding: theme.spacing(1, 1.5),
        borderBottom: `1px solid ${colors.borderLight}`,
        borderRight: `1px solid ${colors.borderLight}`,
        '&:last-child': {
            borderRight: 'none',
        },
    },
    '& tbody tr': {
        transition: 'background-color 0.2s',
        '&:hover': {
            backgroundColor: colors.surfaceElevated,
        },
    },
    [theme.breakpoints.down('sm')]: {
        fontSize: '0.8rem',
        '& th, & td': {
            padding: theme.spacing(0.75, 1),
        },
    },
}));

const ModelLink = styled('a')({
    color: colors.primary,
    textDecoration: 'none',
    fontWeight: 600,
    '&:hover': {
        textDecoration: 'underline',
    },
});

const RankBadge = styled('span')(({ theme }) => ({
    display: 'inline-block',
    width: '24px',
    height: '24px',
    lineHeight: '24px',
    textAlign: 'center',
    backgroundColor: colors.primary,
    color: '#FFFFFF',
    borderRadius: '50%',
    fontWeight: 700,
    fontSize: '0.85rem',
    [theme.breakpoints.down('sm')]: {
        width: '20px',
        height: '20px',
        lineHeight: '20px',
        fontSize: '0.75rem',
    },
}));

const EmptyMessage = styled('p')(({ theme }) => ({
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: '0.9rem',
    margin: theme.spacing(2, 0),
}));

interface QuickAnswerModuleProps {
    tableData: TableRow[];
}

export const QuickAnswerModule: React.FC<QuickAnswerModuleProps> = ({ tableData }) => {
    // Filter and sort to get top 5 fastest models
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const fastestModels = tableData
        .filter(row => {
            // Only active models (no lifecycle_status or status is 'active')
            const isActive = !row.lifecycle_status || row.lifecycle_status === 'active';
            // Updated within 24h
            const lastBenchmark = row.last_benchmark_date ? new Date(row.last_benchmark_date) : null;
            const isRecent = lastBenchmark && lastBenchmark >= twentyFourHoursAgo;
            return isActive && isRecent;
        })
        .sort((a, b) => b.tokens_per_second_mean - a.tokens_per_second_mean)
        .slice(0, 5);

    return (
        <ModuleContainer>
            <ModuleTitle>Fastest Models Right Now (updated &lt;24h)</ModuleTitle>
            {fastestModels.length === 0 ? (
                <EmptyMessage>
                    No models updated in the last 24 hours
                </EmptyMessage>
            ) : (
                <ResultsTable>
                    <thead>
                        <tr>
                            <th style={{ width: '50px' }}>#</th>
                            <th>Model</th>
                            <th>Provider</th>
                            <th style={{ textAlign: 'right' }}>Speed</th>
                        </tr>
                    </thead>
                    <tbody>
                        {fastestModels.map((row, index) => (
                            <tr key={`${row.providerCanonical}-${row.modelCanonical}`}>
                                <td style={{ textAlign: 'center' }}>
                                    <RankBadge>{index + 1}</RankBadge>
                                </td>
                                <td>
                                    <Link
                                        href={`/models/${row.providerSlug}/${row.modelSlug}`}
                                        passHref
                                        legacyBehavior
                                    >
                                        <ModelLink>{row.model_name}</ModelLink>
                                    </Link>
                                </td>
                                <td>{row.provider}</td>
                                <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                    {Math.round(row.tokens_per_second_mean)} tok/s
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </ResultsTable>
            )}
        </ModuleContainer>
    );
};
