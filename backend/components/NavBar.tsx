/**
 * Top bar.
 *
 * A 40px strip of cells separated by hairlines: site mark, the routes, then the
 * off-site links docked right. No gradient, no bevels, no icon buttons that
 * look like chrome — the bar is the thinnest thing on the page because none of
 * it is measurement.
 */

import React from 'react';
import { styled } from '@mui/material/styles';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { colors, typography, spacing, sizing } from './design-system';
import { trackUmamiEvent } from '../utils/analytics';

const Bar = styled('header')(({ theme }) => ({
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1100,
    display: 'flex',
    alignItems: 'stretch',
    height: `${sizing.navHeight}px`,
    backgroundColor: colors.surface,
    borderBottom: `1px solid ${colors.rule}`,
    fontFamily: typography.monoFamily,
    [theme.breakpoints.down('md')]: {
        height: `${sizing.navHeight * 2}px`,
        flexWrap: 'wrap',
    },
}));

const Mark = styled('span')({
    display: 'flex',
    alignItems: 'center',
    padding: `0 ${spacing.scale[5]}px 0 ${spacing.scale[4]}px`,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    letterSpacing: '-0.02em',
    color: colors.text,
    whiteSpace: 'nowrap',
});

const Routes = styled('nav')(({ theme }) => ({
    display: 'flex',
    [theme.breakpoints.down('md')]: {
        order: 3,
        width: '100%',
        borderTop: `1px solid ${colors.rule}`,
    },
}));

const Cell = styled('a')<{ $active?: boolean }>(({ $active }) => ({
    display: 'inline-flex',
    alignItems: 'center',
    padding: `0 ${spacing.scale[4]}px`,
    borderLeft: `1px solid ${colors.rule}`,
    fontFamily: typography.monoFamily,
    fontSize: typography.sizes.xs,
    letterSpacing: typography.tracking.tag,
    textTransform: 'uppercase',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    color: $active ? colors.text : colors.textMute,
    backgroundColor: $active ? colors.raised : 'transparent',

    '&:hover': { color: colors.text },
    '&:focus-visible': {
        outline: `1px solid ${colors.accent}`,
        outlineOffset: '-1px',
    },
}));

const Offsite = styled('div')(({ theme }) => ({
    marginLeft: 'auto',
    display: 'flex',
    [theme.breakpoints.down('md')]: {
        order: 2,
    },
}));

const OffsiteCell = styled(Cell)({
    borderRight: `1px solid ${colors.rule}`,
    borderLeft: 'none',
    marginLeft: '-1px',
}).withComponent('a');

interface RouteDef {
    href: string;
    label: string;
}

const ROUTES: RouteDef[] = [
    { href: '/cloud', label: 'Cloud' },
    { href: '/local', label: 'Local' },
    { href: '/status', label: 'Status' },
];

const NavCell: React.FC<RouteDef> = ({ href, label }) => {
    const pathname = usePathname();
    const isActive = pathname === href;

    return (
        <Link href={href} passHref legacyBehavior>
            <Cell $active={isActive} aria-current={isActive ? 'page' : undefined}>
                {label}
            </Cell>
        </Link>
    );
};

const Navbar: React.FC = () => {
    const pathname = usePathname();

    const trackOffsite = (destination: string) => () => {
        trackUmamiEvent('identity_link_click', {
            source: 'llm_benchmarks',
            placement: 'navbar',
            destination,
            path: pathname || '/unknown',
        });
    };

    return (
        <Bar>
            <Mark>llm-benchmarks</Mark>
            <Routes aria-label="Primary">
                {ROUTES.map((route) => (
                    <NavCell key={route.href} {...route} />
                ))}
            </Routes>
            <Offsite>
                <OffsiteCell
                    href="https://github.com/cipher982/llm-benchmarks-dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={trackOffsite('github_source')}
                >
                    github
                </OffsiteCell>
                <OffsiteCell
                    href="https://drose.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={trackOffsite('drose_home')}
                >
                    drose.io
                </OffsiteCell>
            </Offsite>
        </Bar>
    );
};

export default Navbar;
