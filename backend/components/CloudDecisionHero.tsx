import React from 'react';
import Link from 'next/link';
import { styled } from '@mui/material/styles';
import { colors } from './design-system';
import { trackUmamiEvent } from '../utils/analytics';

export type QuickPathId = 'lowest_latency' | 'highest_throughput' | 'most_stable_7d';

export interface QuickPathOption {
    id: QuickPathId;
    title: string;
    subtitle: string;
    metricLabel: string;
    metricValue: string;
    modelName: string;
    providerName: string;
    providerSlug: string;
    modelSlug: string;
}

interface CloudDecisionHeroProps {
    options: QuickPathOption[];
    loading: boolean;
    error: string | null;
    onApplyQuickPath: (id: QuickPathId) => void;
}

const HeroContainer = styled('section')(({ theme }) => ({
    backgroundColor: colors.surface,
    border: `2px solid ${colors.primary}`,
    borderRadius: '4px',
    boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)',
    padding: theme.spacing(3),
    margin: '0 auto 2rem auto',
    maxWidth: '1100px',
    fontFamily: 'Tahoma, "MS Sans Serif", sans-serif',
    [theme.breakpoints.down('md')]: {
        padding: theme.spacing(2),
    },
}));

const HeroTitle = styled('h2')(({ theme }) => ({
    margin: 0,
    marginBottom: theme.spacing(1),
    textAlign: 'center',
    color: colors.textPrimary,
    fontSize: '1.25rem',
}));

const HeroSubtitle = styled('p')(({ theme }) => ({
    margin: 0,
    marginBottom: theme.spacing(2),
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: '0.9rem',
}));

const CardGrid = styled('div')(({ theme }) => ({
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: theme.spacing(2),
    [theme.breakpoints.down('md')]: {
        gridTemplateColumns: '1fr',
    },
}));

const Card = styled('article')(({ theme }) => ({
    backgroundColor: colors.surfaceElevated,
    border: `1px solid ${colors.borderDark}`,
    borderTop: `1px solid ${colors.borderLight}`,
    borderLeft: `1px solid ${colors.borderLight}`,
    padding: theme.spacing(2),
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
    minHeight: '220px',
}));

const CardTitle = styled('h3')(({ theme }) => ({
    margin: 0,
    color: colors.textPrimary,
    fontSize: '1rem',
    lineHeight: 1.3,
    marginBottom: theme.spacing(0.5),
}));

const CardMeta = styled('p')({
    margin: 0,
    color: colors.textSecondary,
    fontSize: '0.82rem',
});

const MetricValue = styled('p')(({ theme }) => ({
    margin: 0,
    color: colors.primary,
    fontSize: '1.05rem',
    fontWeight: 700,
    marginTop: theme.spacing(0.5),
}));

const ModelLink = styled('a')({
    color: colors.link,
    textDecoration: 'underline',
    fontWeight: 600,
    width: 'fit-content',
});

const ProviderLink = styled('a')({
    color: colors.link,
    textDecoration: 'underline',
    fontSize: '0.85rem',
    width: 'fit-content',
});

const ActionButton = styled('button')(({ theme }) => ({
    marginTop: 'auto',
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    border: `2px outset ${colors.surface}`,
    fontFamily: 'Tahoma, "MS Sans Serif", sans-serif',
    fontSize: '0.82rem',
    padding: '6px 10px',
    cursor: 'pointer',
    '&:hover': {
        backgroundColor: colors.hover,
    },
    '&:active': {
        border: `2px inset ${colors.surface}`,
    },
    [theme.breakpoints.down('md')]: {
        fontSize: '0.8rem',
    },
}));

const EmptyState = styled('div')(({ theme }) => ({
    textAlign: 'center',
    color: colors.textSecondary,
    padding: theme.spacing(2),
    fontSize: '0.88rem',
}));

export const CloudDecisionHero: React.FC<CloudDecisionHeroProps> = ({
    options,
    loading,
    error,
    onApplyQuickPath,
}) => {
    return (
        <HeroContainer>
            <HeroTitle>Pick A Path In 10 Seconds</HeroTitle>
            <HeroSubtitle>
                Quick recommendations from the latest 7-day benchmark slice. Use one path, jump into full results, then drill into provider/model pages.
            </HeroSubtitle>

            {loading ? (
                <EmptyState>Loading 7-day recommendations…</EmptyState>
            ) : error ? (
                <EmptyState style={{ color: '#b71c1c' }}>
                    Failed to load quick paths. ({error})
                </EmptyState>
            ) : options.length === 0 ? (
                <EmptyState>No recommendation data available right now.</EmptyState>
            ) : (
                <CardGrid>
                    {options.map((option) => (
                        <Card key={option.id}>
                            <CardTitle>{option.title}</CardTitle>
                            <CardMeta>{option.subtitle}</CardMeta>
                            <MetricValue>
                                {option.metricLabel}: {option.metricValue}
                            </MetricValue>
                            <Link
                                href={`/models/${option.providerSlug}/${option.modelSlug}`}
                                passHref
                                legacyBehavior
                            >
                                <ModelLink
                                    onClick={() =>
                                        trackUmamiEvent('model_click', {
                                            source: 'cloud_decision_hero',
                                            pathId: option.id,
                                            provider: option.providerSlug,
                                            model: option.modelSlug,
                                        })
                                    }
                                >
                                    {option.modelName}
                                </ModelLink>
                            </Link>
                            <Link href={`/providers/${option.providerSlug}`} passHref legacyBehavior>
                                <ProviderLink
                                    onClick={() =>
                                        trackUmamiEvent('provider_click', {
                                            source: 'cloud_decision_hero',
                                            pathId: option.id,
                                            provider: option.providerSlug,
                                        })
                                    }
                                >
                                    {option.providerName} provider page
                                </ProviderLink>
                            </Link>
                            <ActionButton
                                type="button"
                                onClick={() => {
                                    trackUmamiEvent('quick_path_apply', {
                                        source: 'cloud_decision_hero',
                                        pathId: option.id,
                                        provider: option.providerSlug,
                                        model: option.modelSlug,
                                    });
                                    onApplyQuickPath(option.id);
                                }}
                            >
                                Use In Full Table (7D)
                            </ActionButton>
                        </Card>
                    ))}
                </CardGrid>
            )}
        </HeroContainer>
    );
};
