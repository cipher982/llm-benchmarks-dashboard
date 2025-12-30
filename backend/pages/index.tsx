import React from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { styled } from '@mui/material/styles';
import fs from 'fs/promises';
import path from 'path';
import { MainContainer, PageTitle, Button } from '../components/design-system/components';
import { colors, spacing, typography } from '../components/design-system';

// Styled components for landing page
const LandingContainer = styled('div')({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 'calc(100vh - 120px)',
    padding: `${spacing.scale[8]}px ${spacing.scale[4]}px`,
    backgroundColor: colors.background,
    fontFamily: typography.fontFamily,
});

const HeroSection = styled('div')({
    backgroundColor: colors.surface,
    border: `2px outset ${colors.surfaceElevated}`,
    boxShadow: '4px 4px 8px rgba(0, 0, 0, 0.2)',
    padding: `${spacing.scale[8]}px ${spacing.scale[6]}px`,
    maxWidth: '800px',
    width: '100%',
    textAlign: 'center',
    marginBottom: spacing.scale[4],
});

const Headline = styled('h1')({
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.normal,
    color: colors.textPrimary,
    marginBottom: spacing.scale[4],
    fontFamily: typography.fontFamily,
    lineHeight: typography.lineHeights.tight,
});

const Subhead = styled('h2')({
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.normal,
    color: colors.textSecondary,
    marginBottom: spacing.scale[6],
    fontFamily: typography.fontFamily,
    lineHeight: typography.lineHeights.normal,
});

const LastUpdated = styled('p')({
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    marginBottom: spacing.scale[6],
    fontFamily: typography.fontFamily,
});

const CTAContainer = styled('div')({
    display: 'flex',
    justifyContent: 'center',
    marginTop: spacing.scale[4],
});

const StyledLink = styled('a')({
    textDecoration: 'none',
});

interface HomePageProps {
    lastUpdated: string;
}

const HomePage: React.FC<HomePageProps> = ({ lastUpdated }) => {
    return (
        <>
            <Head>
                <title>LLM Benchmarks - Real-time Performance Testing</title>
                <meta
                    name="description"
                    content="Compare speed and latency across 80+ models from 15+ providers. Real-time LLM performance benchmarks updated every 30 minutes."
                />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </Head>
            <MainContainer isMobile={false}>
                <LandingContainer>
                    <HeroSection>
                        <Headline>Real-time LLM Performance Benchmarks</Headline>
                        <Subhead>
                            Compare speed and latency across 80+ models from 15+ providers
                        </Subhead>
                        <LastUpdated>
                            Last updated: {lastUpdated}
                        </LastUpdated>
                        <CTAContainer>
                            <Link href="/cloud" passHref legacyBehavior>
                                <StyledLink>
                                    <Button variant="primary" size="lg">
                                        View All Benchmarks
                                    </Button>
                                </StyledLink>
                            </Link>
                        </CTAContainer>
                    </HeroSection>
                </LandingContainer>
            </MainContainer>
        </>
    );
};

// Server-side rendering to get last updated time
export const getServerSideProps: GetServerSideProps<HomePageProps> = async ({ res }) => {
    // Set cache headers (5 min cache)
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

    try {
        const staticFilePath = path.join(
            process.cwd(),
            'public',
            'api',
            'processed-30days.json'
        );

        // Get file modification time
        const stats = await fs.stat(staticFilePath);
        const lastModified = stats.mtime;

        // Calculate time ago
        const now = new Date();
        const diffMs = now.getTime() - lastModified.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        let lastUpdated: string;
        if (diffMins < 1) {
            lastUpdated = 'just now';
        } else if (diffMins < 60) {
            lastUpdated = `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
        } else {
            const diffHours = Math.floor(diffMins / 60);
            if (diffHours < 24) {
                lastUpdated = `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
            } else {
                const diffDays = Math.floor(diffHours / 24);
                lastUpdated = `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
            }
        }

        return {
            props: {
                lastUpdated,
            },
        };
    } catch (error) {
        console.error('Error getting last updated time:', error);

        // Fallback if file doesn't exist
        return {
            props: {
                lastUpdated: 'recently',
            },
        };
    }
};

export default HomePage;
