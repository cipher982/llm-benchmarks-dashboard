import React from 'react';
import MuiButton from '@mui/material/Button';
import { styled } from '@mui/material/styles';
import GitHubIcon from '@mui/icons-material/GitHub';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NavBarContainer = styled('div')(({ theme }) => ({
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    // Windows 2000 style gradient
    background: `linear-gradient(to bottom, ${theme.designSystem.colors.primary} 0%, ${theme.designSystem.colors.primaryLight} 100%)`,
    padding: theme.spacing(2, 3),
    boxShadow: theme.shadows[2],
    borderBottom: `1px solid ${theme.designSystem.colors.borderDark}`,
    [theme.breakpoints.down('md')]: {
        flexDirection: 'column',
        alignItems: 'center',
        padding: theme.spacing(2),
    },
}));

const LinksContainer = styled('div')(({ theme }) => ({
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    order: 1,
    gap: theme.spacing(1),
    [theme.breakpoints.down('md')]: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: theme.spacing(2),
        order: 2,
    },
}));

const ButtonsContainer = styled('div')(({ theme }) => ({
    order: 2,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    [theme.breakpoints.down('md')]: {
        marginBottom: theme.spacing(2),
        width: '100%',
        justifyContent: 'space-between',
        order: 1,
    },
}));

const StyledButton = styled(MuiButton)(({ theme }) => ({
    color: theme.designSystem.colors.textPrimary,
    backgroundColor: theme.designSystem.colors.surfaceElevated,
    minWidth: 'auto',
    padding: '4px 16px',
    border: `2px outset ${theme.designSystem.colors.surfaceElevated}`,
    borderRadius: 0,
    gap: theme.spacing(1),
    fontSize: '11px',
    fontFamily: 'Tahoma, sans-serif',
    textTransform: 'none',
    '& .MuiSvgIcon-root': {
        color: theme.designSystem.colors.textPrimary,
        fontSize: '16px',
    },
    '&:hover': {
        backgroundColor: theme.designSystem.colors.hover,
        border: `2px outset ${theme.designSystem.colors.surfaceElevated}`,
    },
    '&:active': {
        border: `2px inset ${theme.designSystem.colors.surfaceElevated}`,
    },
    [theme.breakpoints.down('md')]: {
        padding: '4px 8px',
    },
}));

const StyledIconButton = styled(StyledButton)(({ theme }) => ({
    minWidth: 'auto',
    padding: theme.spacing(1),
    '& .MuiSvgIcon-root': {
        color: theme.designSystem.colors.textPrimary,
        fontSize: '1.25rem',
    },
}));

const ButtonLink = styled('a')({
    textDecoration: 'none',
    display: 'inline-flex',
});

const NavLinkAnchor = styled('a')(({ theme }) => ({
    textDecoration: 'none',
    color: theme.designSystem.colors.textPrimary,
    display: 'inline-flex',
    alignItems: 'center',
}));

const NavLinkChip = styled('span')<{ $active: boolean }>(({ theme, $active }) => ({
    display: 'inline-flex',
    alignItems: 'center',
    padding: `${theme.spacing(1)} ${theme.spacing(3)}`,
    fontFamily: 'Tahoma, sans-serif',
    fontSize: theme.designSystem.typography.sizes.base,
    fontWeight: 400,
    lineHeight: 1.2,
    backgroundColor: $active ? theme.designSystem.colors.surface : theme.designSystem.colors.surfaceElevated,
    borderTop: `2px solid ${$active ? theme.designSystem.colors.borderDark : theme.designSystem.colors.borderLight}`,
    borderLeft: `2px solid ${$active ? theme.designSystem.colors.borderDark : theme.designSystem.colors.borderLight}`,
    borderRight: `2px solid ${$active ? theme.designSystem.colors.borderLight : theme.designSystem.colors.borderDark}`,
    borderBottom: `2px solid ${$active ? theme.designSystem.colors.borderLight : theme.designSystem.colors.borderDark}`,
    cursor: 'pointer',
    transition: 'none',
    color: theme.designSystem.colors.textPrimary,
    boxSizing: 'border-box',
    '&:hover': {
        backgroundColor: theme.designSystem.colors.hover,
    },
    '&:active': {
        borderTop: `2px solid ${theme.designSystem.colors.borderDark}`,
        borderLeft: `2px solid ${theme.designSystem.colors.borderDark}`,
        borderRight: `2px solid ${theme.designSystem.colors.borderLight}`,
        borderBottom: `2px solid ${theme.designSystem.colors.borderLight}`,
    },
    '&:focus-visible': {
        outline: `2px solid ${theme.designSystem.colors.primary}`,
        outlineOffset: 2,
    },
}));

const ResponsiveButtonText = styled('span')(({ theme }) => ({
    display: 'inline',
    [theme.breakpoints.down('sm')]: {
        display: 'none',
    },
}));

interface NavLinkProps {
    href: string;
    children: React.ReactNode;
}

const NavLink: React.FC<NavLinkProps> = ({ href, children }) => {
    const pathname = usePathname();
    const isActive = pathname === href;

    return (
        <Link href={href} passHref legacyBehavior>
            <NavLinkAnchor>
                <NavLinkChip $active={isActive}>{children}</NavLinkChip>
            </NavLinkAnchor>
        </Link>
    );
};

const Navbar: React.FC = () => {
    return (
        <NavBarContainer>
            <LinksContainer>
                <NavLink href="/cloud">Cloud Benchmarks</NavLink>
                <NavLink href="/local">Local Benchmarks</NavLink>
            </LinksContainer>
            <ButtonsContainer>
                <StyledIconButton
                    variant="outlined"
                    size="small"
                    aria-label="Open GitHub repository"
                    onClick={() => window.open("https://github.com/cipher982/llm-benchmarks", "_blank")}
                >
                    <GitHubIcon />
                </StyledIconButton>
                <StyledButton
                    variant="outlined"
                    size="small"
                    aria-label="Visit drose.io"
                    onClick={() => window.open("https://drose.io", "_blank")}
                >
                    <PersonOutlineIcon />
                    <ResponsiveButtonText>drose.io</ResponsiveButtonText>
                </StyledButton>
                <Link href="/status" passHref legacyBehavior>
                    <ButtonLink>
                        <StyledButton
                            variant="outlined"
                            size="small"
                            aria-label="View API status"
                        >
                            <CheckCircleOutlineIcon />
                            <ResponsiveButtonText>API Status</ResponsiveButtonText>
                        </StyledButton>
                    </ButtonLink>
                </Link>
            </ButtonsContainer>
        </NavBarContainer>
    );
};

export default Navbar;
