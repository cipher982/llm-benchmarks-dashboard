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
        color: theme.palette.text.primary,
        fontSize: '1.25rem',
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
        <Link href={href} style={{ textDecoration: 'none', marginRight: '8px' }}>
            <div
                style={{
                    padding: '6px 14px',
                    color: '#000',
                    backgroundColor: isActive ? '#ECE9D8' : '#D4D0C8',
                    borderRadius: '0',
                    border: isActive 
                        ? '2px inset #D4D0C8'
                        : '2px outset #D4D0C8',
                    fontWeight: 400,
                    fontSize: '11px',
                    fontFamily: 'Tahoma, sans-serif',
                    transition: 'all 0.2s ease-in-out',
                    cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f5f5f5';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#fff';
                    e.currentTarget.style.transform = 'translateY(0)';
                }}
            >
                {children}
            </div>
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
                    onClick={() => window.open("https://github.com/cipher982/llm-benchmarks", "_blank")}
                >
                    <GitHubIcon />
                </StyledIconButton>
                <StyledButton
                    variant="outlined"
                    size="small"
                    onClick={() => window.open("https://drose.io", "_blank")}
                >
                    <PersonOutlineIcon />
                    drose.io
                </StyledButton>
                <Link href="/status" style={{ textDecoration: 'none' }}>
                    <StyledButton
                        variant="outlined"
                        size="small"
                    >
                        <CheckCircleOutlineIcon />
                        API Status
                    </StyledButton>
                </Link>
            </ButtonsContainer>
        </NavBarContainer>
    );
};

export default Navbar;